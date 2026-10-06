import "dotenv/config";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import request from "supertest";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { createApp } from "../../apps/api/src/app";
import { cleanupExpiredSessions } from "../../apps/api/src/sessions";
import { migrate } from "../../scripts/migrate";
import { initializeVault, encryptCredential } from "../../apps/web/lib/crypto";
const origin = "http://localhost:3000";
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("/proactive_test"))
  throw new Error("Dedicated proactive_test database required");
const pool = new pg.Pool({ connectionString: url });
const app = createApp(pool, { origin, authLimit: 100 });
const alice = request.agent(app);
const bob = request.agent(app);
const suffix = randomUUID();
const email = `alice-${suffix}@example.com`;
const bobEmail = `bob-${suffix}@example.com`;
const password = "Account-login-only-!283";
const headers = { Origin: origin, "X-Proactive-CSRF": "1" };
let id: string;
let aliceId: string;
let rawToken: string;
let vault: Awaited<ReturnType<typeof initializeVault>>;
beforeAll(async () => {
  await migrate(url);
  vault = await initializeVault("Master-only-fixture-872!");
});
afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email=ANY($1)", [
    [email, bobEmail],
  ]);
  await pool.end();
});
describe.sequential("PostgreSQL API", () => {
  it("runs migrations idempotently", async () => {
    await migrate(url);
    const result = await pool.query("SELECT name FROM schema_migrations");
    expect(result.rows).toContainEqual({ name: "001_initial.sql" });
  });
  it("requires authentication", async () => {
    await request(app).get("/vault").expect(401);
    await request(app).get("/credentials").expect(401);
  });
  it("rejects cross-origin mutations", async () => {
    await request(app)
      .post("/auth/register")
      .set({ ...headers, Origin: "https://evil.example" })
      .send({ email, password })
      .expect(403);
  });
  it("requires CSRF header and JSON content type", async () => {
    await request(app)
      .post("/auth/register")
      .set("Origin", origin)
      .send({ email, password })
      .expect(403);
    await request(app)
      .post("/auth/register")
      .set(headers)
      .type("form")
      .send({ email, password })
      .expect(403);
  });
  it("registers normalized unique email with Argon2id only", async () => {
    await alice
      .post("/auth/register")
      .set(headers)
      .send({ email: ` ${email.toUpperCase()} `, password })
      .expect(201);
    const user = (
      await pool.query("SELECT * FROM users WHERE email=$1", [email])
    ).rows[0];
    aliceId = user.id;
    expect(user.password_hash).toMatch(/^\$argon2id\$/);
    expect(user.password_hash).not.toContain(password);
    await alice
      .post("/auth/register")
      .set(headers)
      .send({ email, password })
      .expect(409);
  });
  it("rejects bad login credentials without creating a session", async () => {
    await alice
      .post("/auth/login")
      .set(headers)
      .send({ email, password: "wrong-password-123" })
      .expect(401);
    expect(
      (await pool.query("SELECT * FROM sessions WHERE user_id=$1", [aliceId]))
        .rowCount,
    ).toBe(0);
  });
  it("sets an opaque HttpOnly Strict session and stores only its hash", async () => {
    const response = await alice
      .post("/auth/login")
      .set(headers)
      .send({ email, password })
      .expect(200);
    const cookie = String(response.headers["set-cookie"]![0]);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    rawToken = cookie.split(";")[0]!.split("=")[1]!;
    expect(rawToken).toMatch(/^[a-f0-9]{64}$/);
    const session = (
      await pool.query("SELECT * FROM sessions WHERE user_id=$1", [aliceId])
    ).rows[0];
    expect(session.token_hash).not.toBe(rawToken);
    expect(JSON.stringify(response.body)).not.toContain(rawToken);
    await alice.get("/auth/me").expect(200);
  });
  it("sets Secure and __Host cookie in production", async () => {
    const production = createApp(pool, { origin, production: true });
    const response = await request(production)
      .post("/auth/login")
      .set(headers)
      .send({ email, password })
      .expect(200);
    expect(String(response.headers["set-cookie"])).toContain(
      "__Host-proactive_session=",
    );
    expect(String(response.headers["set-cookie"])).toContain("Secure");
  });
  it("initializes encrypted metadata exactly once", async () => {
    await alice.get("/vault").expect(200, { metadata: null });
    await alice.post("/vault").set(headers).send(vault.metadata).expect(201);
    await alice.post("/vault").set(headers).send(vault.metadata).expect(409);
    expect((await alice.get("/vault")).body.metadata).toEqual(vault.metadata);
  });
  it("rejects plaintext fields and invalid crypto parameters", async () => {
    await alice
      .post("/vault")
      .set(headers)
      .send({ ...vault.metadata, iterations: 1 })
      .expect(400);
    await alice
      .post("/vault")
      .set(headers)
      .send({ ...vault.metadata, masterPassword: "never-store" })
      .expect(400);
    await alice
      .post("/credentials")
      .set(headers)
      .send({
        website: "plaintext",
        username: "plaintext",
        password: "plaintext",
      })
      .expect(400);
  });
  it("stores and lists only encrypted credential envelopes", async () => {
    id = randomUUID();
    const payload = await encryptCredential(vault.key, id, {
      website: "private-website",
      username: "private-username",
      password: "private-password",
    });
    await alice
      .post("/credentials")
      .set(headers)
      .send({ id, payload })
      .expect(201);
    expect((await alice.get("/credentials")).body).toEqual([{ id, payload }]);
    const rows = await pool.query("SELECT * FROM credentials WHERE id=$1", [
      id,
    ]);
    const stored = JSON.stringify(rows.rows);
    for (const secret of [
      "private-website",
      "private-username",
      "private-password",
    ])
      expect(stored).not.toContain(secret);
  });
  it("isolates another user across list, read, update, and delete", async () => {
    await bob
      .post("/auth/register")
      .set(headers)
      .send({ email: bobEmail, password })
      .expect(201);
    await bob
      .post("/auth/login")
      .set(headers)
      .send({ email: bobEmail, password })
      .expect(200);
    await bob.get("/credentials").expect(200, []);
    await bob.get("/vault").expect(200, { metadata: null });
    const payload = await encryptCredential(vault.key, id, {
      website: "a",
      username: "b",
      password: "c",
    });
    await bob.put(`/credentials/${id}`).set(headers).send(payload).expect(404);
    await bob.delete(`/credentials/${id}`).set(headers).send({}).expect(404);
  });
  it("updates ciphertext and rejects extra plaintext fields", async () => {
    const payload = await encryptCredential(vault.key, id, {
      website: "updated",
      username: "updated",
      password: "updated",
    });
    await alice
      .put(`/credentials/${id}`)
      .set(headers)
      .send({ ...payload, password: "plaintext" })
      .expect(400);
    await alice
      .put(`/credentials/${id}`)
      .set(headers)
      .send(payload)
      .expect(200);
    expect((await alice.get("/credentials")).body[0].payload).toEqual(payload);
  });
  it("deletes owned credentials", async () => {
    await alice.delete(`/credentials/${id}`).set(headers).send({}).expect(200);
    await alice.get("/credentials").expect(200, []);
  });
  it("restricts CORS to the configured origin", async () => {
    const result = await request(app)
      .get("/health")
      .set("Origin", "https://evil.example");
    expect(result.headers["access-control-allow-origin"]).toBe(origin);
    expect(result.headers["access-control-allow-origin"]).not.toBe("*");
  });
  it("rate limits login attempts", async () => {
    const limited = createApp(pool, { origin, authLimit: 2 });
    for (let i = 0; i < 2; i++)
      await request(limited)
        .post("/auth/login")
        .set(headers)
        .send({ email, password: "bad-password-123" })
        .expect(401);
    await request(limited)
      .post("/auth/login")
      .set(headers)
      .send({ email, password })
      .expect(429);
  });
  it("rejects and removes expired sessions without touching another user's valid session", async () => {
    const bobSessionsBefore = await pool.query(
      "SELECT token_hash,expires_at FROM sessions WHERE user_id=$1 ORDER BY token_hash",
      [(await pool.query("SELECT id FROM users WHERE email=$1", [bobEmail])).rows[0].id],
    );
    await pool.query(
      "UPDATE sessions SET expires_at=now()-interval '1 second' WHERE user_id=$1",
      [aliceId],
    );
    await alice.get("/auth/me").expect(401);
    expect(await cleanupExpiredSessions(pool)).toBeGreaterThan(0);
    expect(
      (await pool.query("SELECT 1 FROM sessions WHERE user_id=$1", [aliceId]))
        .rowCount,
    ).toBe(0);
    const bobSessionsAfter = await pool.query(
      "SELECT token_hash,expires_at FROM sessions WHERE user_id=$1 ORDER BY token_hash",
      [(await pool.query("SELECT id FROM users WHERE email=$1", [bobEmail])).rows[0].id],
    );
    expect(bobSessionsAfter.rows).toEqual(bobSessionsBefore.rows);
    await bob.get("/auth/me").expect(200);
  });
  it("opportunistically removes expired rows after successful login", async () => {
    await pool.query(
      "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()-interval '1 minute')",
      ["f".repeat(64), aliceId],
    );
    await alice
      .post("/auth/login")
      .set(headers)
      .send({ email, password })
      .expect(200);
    expect(
      (await pool.query("SELECT 1 FROM sessions WHERE expires_at<=now()"))
        .rowCount,
    ).toBe(0);
  });
  it("invalidates sessions on logout and clears the cookie", async () => {
    await alice
      .post("/auth/login")
      .set(headers)
      .send({ email, password })
      .expect(200);
    const response = await alice
      .post("/auth/logout")
      .set(headers)
      .send({})
      .expect(200);
    expect(String(response.headers["set-cookie"])).toContain(
      "Expires=Thu, 01 Jan 1970",
    );
    await alice.get("/auth/me").expect(401);
    await request(app)
      .get("/auth/me")
      .set("Cookie", `proactive_session=${rawToken}`)
      .expect(401);
  });
});
