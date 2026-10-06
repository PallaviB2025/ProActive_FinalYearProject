import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Pool } from "pg";
import { createApp } from "../../apps/api/src/app";

describe("WebAuthn endpoints & verification", () => {
  const origin = "http://localhost:3000";
  const headers = { Origin: origin, "X-Proactive-CSRF": "1" };

  it("rejects unauthenticated requests to WebAuthn endpoints", async () => {
    const pool = { query: vi.fn() } as unknown as Pool;
    const app = createApp(pool, { origin });

    await request(app)
      .post("/auth/webauthn/register/options")
      .set(headers)
      .send({})
      .expect(401);

    await request(app)
      .post("/auth/webauthn/register/verify")
      .set(headers)
      .send({ response: {} })
      .expect(401);

    await request(app)
      .post("/auth/webauthn/authenticate/options")
      .set(headers)
      .send({})
      .expect(401);

    await request(app)
      .post("/auth/webauthn/authenticate/verify")
      .set(headers)
      .send({ response: {} })
      .expect(401);

    await request(app)
      .get("/auth/webauthn/status")
      .set(headers)
      .expect(401);

    await request(app)
      .delete("/auth/webauthn")
      .set(headers)
      .expect(401);
  });

  it("rejects forged or missing registration response", async () => {
    const mockUser = { id: "11111111-1111-1111-1111-111111111111", email: "user@example.com" };
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM sessions")) {
        return { rows: [mockUser] };
      }
      if (sql.includes("FROM webauthn_challenges")) {
        return { rows: [{ challenge: "valid-server-challenge-string" }] };
      }
      return { rows: [] };
    });

    const pool = { query } as unknown as Pool;
    const app = createApp(pool, { origin });
    const fakeToken = "a".repeat(64);

    // Send forged registration response
    const res = await request(app)
      .post("/auth/webauthn/register/verify")
      .set({
        ...headers,
        Cookie: `proactive_session=${fakeToken}`,
      })
      .send({
        response: {
          id: "fake-id",
          rawId: "fake-rawId",
          response: {
            clientDataJSON: Buffer.from(
              JSON.stringify({
                type: "webauthn.create",
                challenge: "wrong-challenge",
                origin: "https://attacker.example",
              }),
            ).toString("base64url"),
            attestationObject: "fake-attestation",
          },
          type: "public-key",
          clientExtensionResults: {},
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("rejects authentication verify when challenge is missing or expired", async () => {
    const mockUser = { id: "11111111-1111-1111-1111-111111111111", email: "user@example.com" };
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM sessions")) {
        return { rows: [mockUser] };
      }
      if (sql.includes("FROM webauthn_credentials")) {
        return {
          rows: [
            {
              id: "cred-1",
              public_key: Buffer.from("mock-public-key"),
              counter: 0,
              transports: [],
            },
          ],
        };
      }
      if (sql.includes("FROM webauthn_challenges")) {
        return { rows: [] }; // No active challenge (expired)
      }
      return { rows: [] };
    });

    const pool = { query } as unknown as Pool;
    const app = createApp(pool, { origin });
    const fakeToken = "b".repeat(64);

    const res = await request(app)
      .post("/auth/webauthn/authenticate/verify")
      .set({
        ...headers,
        Cookie: `proactive_session=${fakeToken}`,
      })
      .send({
        response: {
          id: "cred-1",
          rawId: "cred-1",
          response: {
            clientDataJSON: "fake",
            authenticatorData: "fake",
            signature: "fake",
          },
          type: "public-key",
          clientExtensionResults: {},
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expired or missing/i);
  });
});
