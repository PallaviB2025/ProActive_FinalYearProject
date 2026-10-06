import express, {
  type RequestHandler,
  type ErrorRequestHandler,
} from "express";
import cors from "cors";
import { createRequire } from "node:module";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import argon2 from "argon2";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import type { Pool } from "pg";
import { z } from "zod";
import {
  authSchema,
  registerSchema,
  envelopeSchema,
  vaultSchema,
} from "../../../packages/shared/src/schema.js";
import { cleanupExpiredSessionsSafely } from "./sessions.js";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
// Load Helmet's CommonJS export explicitly for Vercel's TypeScript compiler.
const require = createRequire(import.meta.url);
const helmet = require("helmet") as () => RequestHandler;
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function createApp(
  pool: Pool,
  options: { origin: string; production?: boolean; authLimit?: number },
) {
  const app = express();
  app.disable("x-powered-by");
  const cookieName = options.production
    ? "__Host-proactive_session"
    : "proactive_session";
  const cookieOptions = {
    httpOnly: true,
    secure: !!options.production,
    sameSite: "strict" as const,
    path: "/",
  };
  app.use(helmet());
  app.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  const configuredOrigins = (options.origin || "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  const allowedOrigins = Array.from(
    new Set([
      ...configuredOrigins,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://pro-active-web-chi.vercel.app",
    ]),
  );

  const isAllowedOrigin = (origin: string | undefined): boolean => {
    if (!origin) return false;
    const cleanOrigin = origin.trim().replace(/\/+$/, "");

    // Wildcard allows all
    if (configuredOrigins.includes("*") || options.origin === "*") return true;

    // Check configured origins
    if (configuredOrigins.includes(cleanOrigin)) return true;

    // Allow browser extensions
    if (cleanOrigin.startsWith("chrome-extension://") || cleanOrigin.startsWith("moz-extension://")) {
      return true;
    }

    // Always allow localhost and 127.0.0.1
    if (
      cleanOrigin === "http://localhost:3000" ||
      cleanOrigin === "http://127.0.0.1:3000" ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)
    ) {
      return true;
    }

    // Allow any .vercel.app deployment (e.g. pro-active-web-chi.vercel.app or preview branches)
    try {
      const url = new URL(cleanOrigin);
      if (url.hostname.endsWith(".vercel.app")) {
        return true;
      }
    } catch {
      // invalid URL
    }

    return false;
  };

  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        if (!requestOrigin || isAllowedOrigin(requestOrigin)) {
          callback(null, requestOrigin || true);
        } else {
          callback(null, false);
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: [
        "Content-Type",
        "X-Proactive-CSRF",
        "Authorization",
        "X-Proactive-Session",
      ],
    }),
  );
  app.use((req, res, next) => {
    const requestOrigin = req.get("origin");
    const allowed = !requestOrigin || isAllowedOrigin(requestOrigin);
    const hasBody = Boolean(
      req.get("content-type") ||
        (req.get("content-length") && req.get("content-length") !== "0") ||
        req.get("transfer-encoding"),
    );
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      (!allowed ||
        req.get("X-Proactive-CSRF") !== "1" ||
        (hasBody && !req.is("application/json")))
    ) {
      res.status(403).json({ error: "Request origin rejected" });
      return;
    }
    next();
  });
  app.use(express.json({ limit: "48kb" }));
  app.use(cookieParser());
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  const authLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: options.authLimit ?? 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });
  const auth: RequestHandler = async (req, res, next) => {
    const authHeader = req.get("authorization");
    let bearerToken: string | undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      bearerToken = authHeader.slice(7).trim();
    }
    const token: unknown =
      bearerToken ??
      req.get("x-proactive-session") ??
      req.cookies[cookieName] ??
      req.cookies["proactive_session"] ??
      req.cookies["__Host-proactive_session"];
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const result = await pool.query(
      "SELECT u.id,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()",
      [digest(token)],
    );
    if (!result.rows[0]) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    res.locals.user = result.rows[0];
    next();
  };
  app.get("/", (_req, res) => {
    res.json({
      status: "online",
      service: "ProActive Security API",
      version: "1.0.0",
      health: "/health",
      documentation: "https://github.com/PallaviB2025/ProActive"
    });
  });
  app.get("/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ ok: true });
    } catch {
      res.status(503).json({ ok: false, error: "Service unavailable" });
    }
  });
  app.post("/auth/register", authLimiter, async (req, res) => {
    const input = registerSchema.parse(req.body);
    const hash = await argon2.hash(input.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });
    try {
      await pool.query(
        "INSERT INTO users(id,email,password_hash) VALUES($1,$2,$3)",
        [randomUUID(), input.email, hash],
      );
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        res.status(409).json({ error: "Unable to register this email" });
        return;
      }
      throw error;
    }
    res.status(201).json({ ok: true });
  });

  // Constant-time dummy hash with identical Argon2id work factor (65536 KB memory, 3 iterations, 1 parallelism).
  // Precomputed constant prevents startup race, promise resolution delay, or double-hashing on login attempts.
  const DUMMY_ARGON2_HASH =
    "$argon2id$v=19$m=65536,t=3,p=1$Qv6uavtERdV8oOX97J3uDg$s7664yHpdUb1rIv7oNCd/rNwY3E/T7KGRY+vDAX/3Ig";

  app.post("/auth/login", authLimiter, async (req, res) => {
    const input = authSchema.parse(req.body);
    const result = await pool.query(
      "SELECT id,email,password_hash FROM users WHERE email=$1",
      [input.email],
    );
    const user = result.rows[0];
    // Both existing-user and non-existing-user lookups execute exactly 1 database query
    // and exactly 1 argon2.verify calculation with identical Argon2id parameters.
    const hashToVerify = user?.password_hash ?? DUMMY_ARGON2_HASH;
    const valid = await argon2.verify(hashToVerify, input.password);
    if (!user || !valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const old: unknown =
      req.cookies[cookieName] ??
      req.cookies["proactive_session"] ??
      req.cookies["__Host-proactive_session"];
    if (typeof old === "string")
      await pool.query("DELETE FROM sessions WHERE token_hash=$1", [
        digest(old),
      ]);
    const token = randomBytes(32).toString("hex");
    await pool.query(
      "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '8 hours')",
      [digest(token), user.id],
    );
    await pool.query(
      `DELETE FROM sessions WHERE token_hash IN (
        SELECT token_hash FROM sessions 
        WHERE user_id=$1 
        ORDER BY expires_at DESC 
        OFFSET 5
      )`,
      [user.id],
    );
    await cleanupExpiredSessionsSafely(pool);
    res
      .cookie(cookieName, token, {
        ...cookieOptions,
        maxAge: 8 * 60 * 60 * 1000,
      })
      .json({ id: user.id, email: user.email, token });
  });
  app.get("/auth/me", auth, (req, res) => {
    res.json(res.locals.user);
  });

  // Called server-side by Next.js sync-session route after Google OAuth.
  // Creates-or-finds the Google user and returns an Express session token.
  app.post("/auth/google-sync", authLimiter, async (req, res) => {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();
    // Upsert user — Google users have no password_hash, provide an unmatchable hash
    let result = await pool.query("SELECT id,email FROM users WHERE email=$1", [normalizedEmail]);
    let userId: string;
    if (result.rows[0]) {
      userId = result.rows[0].id;
    } else {
      userId = randomUUID();
      const dummyHash = `oauth:google:${randomBytes(32).toString("hex")}`;
      await pool.query(
        "INSERT INTO users(id,email,password_hash) VALUES($1,$2,$3) ON CONFLICT(email) DO NOTHING",
        [userId, normalizedEmail, dummyHash],
      );
      // Re-fetch in case of conflict
      const refetch = await pool.query("SELECT id FROM users WHERE email=$1", [normalizedEmail]);
      userId = refetch.rows[0].id;
    }
    const token = randomBytes(32).toString("hex");
    await pool.query(
      "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '8 hours')",
      [digest(token), userId],
    );
    await cleanupExpiredSessionsSafely(pool);
    res
      .cookie(cookieName, token, {
        ...cookieOptions,
        maxAge: 8 * 60 * 60 * 1000,
      })
      .json({ id: userId, email: normalizedEmail, token });
  });


  app.post("/auth/logout", async (req, res) => {
    const authHeader = req.get("authorization");
    let bearerToken: string | undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      bearerToken = authHeader.slice(7).trim();
    }
    const token: unknown =
      bearerToken ??
      req.get("x-proactive-session") ??
      req.cookies[cookieName] ??
      req.cookies["proactive_session"] ??
      req.cookies["__Host-proactive_session"];
    if (typeof token === "string")
      await pool.query("DELETE FROM sessions WHERE token_hash=$1", [
        digest(token),
      ]);
    res
      .clearCookie("proactive_session", cookieOptions)
      .clearCookie("__Host-proactive_session", cookieOptions)
      .json({ ok: true });
  });
  app.delete("/auth/account", authLimiter, auth, async (req, res) => {
    const input = z.object({ password: z.string() }).strict().parse(req.body);
    const result = await pool.query(
      "SELECT password_hash FROM users WHERE id=$1",
      [res.locals.user.id],
    );
    const valid = await argon2.verify(
      result.rows[0]?.password_hash ?? "",
      input.password,
    );
    if (!valid) {
      res.status(401).json({ error: "Invalid password" });
      return;
    }
    await pool.query("DELETE FROM users WHERE id=$1", [res.locals.user.id]);
    res
      .clearCookie("proactive_session", cookieOptions)
      .clearCookie("__Host-proactive_session", cookieOptions)
      .json({ ok: true });
  });
  const getWebAuthnConfig = (req: express.Request) => {
    const requestOrigin = req.get("origin") ?? options.origin;
    let rpID = "localhost";
    try {
      rpID = new URL(requestOrigin).hostname;
    } catch {
      // fallback to localhost
    }
    const clean = requestOrigin ? requestOrigin.replace(/\/+$/, "") : undefined;
    const expected = clean && isAllowedOrigin(clean)
      ? Array.from(new Set([clean, ...allowedOrigins]))
      : allowedOrigins;
    return { rpID, expectedOrigin: expected };
  };

  app.post("/auth/webauthn/register/options", auth, async (req, res) => {
    const user = res.locals.user;
    const { rpID } = getWebAuthnConfig(req);
    const existing = await pool.query(
      "SELECT id, transports FROM webauthn_credentials WHERE user_id=$1",
      [user.id],
    );
    const regOptions = await generateRegistrationOptions({
      rpName: "ProActive Vault",
      rpID,
      userID: new Uint8Array(Buffer.from(user.id)),
      userName: user.email,
      attestationType: "none",
      excludeCredentials: existing.rows.map((row) => ({
        id: row.id,
        transports: row.transports ?? undefined,
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });
    await pool.query(
      `INSERT INTO webauthn_challenges(user_id, challenge, purpose, expires_at)
       VALUES($1, $2, 'registration', now() + interval '5 minutes')
       ON CONFLICT (user_id, purpose) DO UPDATE SET challenge=$2, expires_at=now() + interval '5 minutes'`,
      [user.id, regOptions.challenge],
    );
    res.json(regOptions);
  });

  app.post("/auth/webauthn/register/verify", auth, async (req, res) => {
    const user = res.locals.user;
    const { rpID, expectedOrigin } = getWebAuthnConfig(req);
    const challengeRes = await pool.query(
      "SELECT challenge FROM webauthn_challenges WHERE user_id=$1 AND purpose='registration' AND expires_at > now()",
      [user.id],
    );
    const challengeRow = challengeRes.rows[0];
    if (!challengeRow) {
      res.status(400).json({ error: "Registration challenge expired or missing" });
      return;
    }
    const response = req.body?.response as RegistrationResponseJSON | undefined;
    if (!response) {
      res.status(400).json({ error: "Missing registration response" });
      return;
    }
    try {
      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challengeRow.challenge,
        expectedOrigin,
        expectedRPID: rpID,
        requireUserVerification: false,
      });
      if (!verification.verified || !verification.registrationInfo) {
        res.status(400).json({ error: "Registration verification failed" });
        return;
      }
      const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
      await pool.query(
        `INSERT INTO webauthn_credentials(id, user_id, public_key, counter, device_type, backed_up, transports)
         VALUES($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET public_key=$3, counter=$4, device_type=$5, backed_up=$6, transports=$7`,
        [
          credential.id,
          user.id,
          Buffer.from(credential.publicKey),
          credential.counter,
          credentialDeviceType,
          credentialBackedUp,
          credential.transports ?? [],
        ],
      );
      await pool.query(
        "DELETE FROM webauthn_challenges WHERE user_id=$1 AND purpose='registration'",
        [user.id],
      );
      res.json({ ok: true, verified: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message || "Verification failed" });
    }
  });

  app.post("/auth/webauthn/authenticate/options", auth, async (req, res) => {
    const user = res.locals.user;
    const { rpID } = getWebAuthnConfig(req);
    const credentials = await pool.query(
      "SELECT id, transports FROM webauthn_credentials WHERE user_id=$1",
      [user.id],
    );
    if (credentials.rows.length === 0) {
      res.status(400).json({ error: "No biometric credentials enrolled" });
      return;
    }
    const authOptions = await generateAuthenticationOptions({
      rpID,
      allowCredentials: credentials.rows.map((row) => ({
        id: row.id,
        transports: row.transports ?? undefined,
      })),
      userVerification: "preferred",
    });
    await pool.query(
      `INSERT INTO webauthn_challenges(user_id, challenge, purpose, expires_at)
       VALUES($1, $2, 'authentication', now() + interval '5 minutes')
       ON CONFLICT (user_id, purpose) DO UPDATE SET challenge=$2, expires_at=now() + interval '5 minutes'`,
      [user.id, authOptions.challenge],
    );
    res.json(authOptions);
  });

  app.post("/auth/webauthn/authenticate/verify", auth, async (req, res) => {
    const user = res.locals.user;
    const { rpID, expectedOrigin } = getWebAuthnConfig(req);
    const response = req.body?.response as AuthenticationResponseJSON | undefined;
    if (!response) {
      res.status(400).json({ error: "Missing authentication response" });
      return;
    }
    const credRes = await pool.query(
      "SELECT id, public_key, counter, transports FROM webauthn_credentials WHERE id=$1 AND user_id=$2",
      [response.id, user.id],
    );
    const cred = credRes.rows[0];
    if (!cred) {
      res.status(400).json({ error: "Unrecognized credential" });
      return;
    }
    const challengeRes = await pool.query(
      "SELECT challenge FROM webauthn_challenges WHERE user_id=$1 AND purpose='authentication' AND expires_at > now()",
      [user.id],
    );
    const challengeRow = challengeRes.rows[0];
    if (!challengeRow) {
      res.status(400).json({ error: "Authentication challenge expired or missing" });
      return;
    }
    try {
      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challengeRow.challenge,
        expectedOrigin,
        expectedRPID: rpID,
        credential: {
          id: cred.id,
          publicKey: new Uint8Array(cred.public_key),
          counter: Number(cred.counter),
          transports: cred.transports ?? undefined,
        },
        requireUserVerification: false,
      });
      if (!verification.verified) {
        res.status(401).json({ error: "Biometric assertion signature invalid" });
        return;
      }
      await pool.query(
        "UPDATE webauthn_credentials SET counter=$1 WHERE id=$2",
        [verification.authenticationInfo.newCounter, cred.id],
      );
      await pool.query(
        "DELETE FROM webauthn_challenges WHERE user_id=$1 AND purpose='authentication'",
        [user.id],
      );
      const ticket = randomBytes(32).toString("hex");
      res.json({ ok: true, verified: true, ticket });
    } catch (err) {
      res.status(401).json({ error: (err as Error).message || "Authentication verification failed" });
    }
  });

  app.get("/auth/webauthn/status", auth, async (_req, res) => {
    const user = res.locals.user;
    const creds = await pool.query(
      "SELECT count(*) as count FROM webauthn_credentials WHERE user_id=$1",
      [user.id],
    );
    const count = Number(creds.rows[0]?.count ?? 0);
    res.json({ enrolled: count > 0, count });
  });

  app.delete("/auth/webauthn", auth, async (_req, res) => {
    const user = res.locals.user;
    await pool.query("DELETE FROM webauthn_credentials WHERE user_id=$1", [user.id]);
    await pool.query("DELETE FROM webauthn_challenges WHERE user_id=$1", [user.id]);
    res.json({ ok: true });
  });
  app.use("/vault", auth);
  app.get("/vault", async (_req, res) => {
    const result = await pool.query(
      "SELECT metadata FROM vaults WHERE user_id=$1",
      [res.locals.user.id],
    );
    res.json({ metadata: result.rows[0]?.metadata ?? null });
  });
  app.post("/vault", authLimiter, async (req, res) => {
    const metadata = vaultSchema.parse(req.body);
    const result = await pool.query(
      "INSERT INTO vaults(user_id,metadata) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING user_id",
      [res.locals.user.id, metadata],
    );
    if (!result.rowCount) {
      res.status(409).json({ error: "Vault already initialized" });
      return;
    }
    res.status(201).json({ ok: true });
  });
  app.put("/vault/rekey", authLimiter, async (req, res) => {
    const input = z
      .object({
        metadata: vaultSchema,
        credentials: z.array(
          z.object({ id: z.uuid(), payload: envelopeSchema }).strict(),
        ),
      })
      .strict()
      .parse(req.body);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const vaultRes = await client.query(
        "UPDATE vaults SET metadata=$1 WHERE user_id=$2 RETURNING user_id",
        [input.metadata, res.locals.user.id],
      );
      if (!vaultRes.rowCount) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Vault not found" });
        return;
      }
      for (const cred of input.credentials) {
        await client.query(
          "UPDATE credentials SET payload=$1, updated_at=now() WHERE id=$2 AND user_id=$3",
          [cred.payload, cred.id, res.locals.user.id],
        );
      }
      const token =
        req.cookies[cookieName] ??
        req.cookies["proactive_session"] ??
        req.cookies["__Host-proactive_session"];
      if (typeof token === "string") {
        await client.query(
          "DELETE FROM sessions WHERE user_id=$1 AND token_hash != $2",
          [res.locals.user.id, digest(token)],
        );
      }
      await client.query("COMMIT");
      res.json({ ok: true });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });
  app.use("/credentials", auth);
  app.get("/credentials", async (_req, res) => {
    const result = await pool.query(
      "SELECT id,payload FROM credentials WHERE user_id=$1 ORDER BY created_at,id",
      [res.locals.user.id],
    );
    res.json(result.rows);
  });
  app.post("/credentials", async (req, res) => {
    const input = z
      .object({ id: z.uuid(), payload: envelopeSchema })
      .strict()
      .parse(req.body);
    try {
      await pool.query(
        "INSERT INTO credentials(id,user_id,payload) VALUES($1,$2,$3)",
        [input.id, res.locals.user.id, input.payload],
      );
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "23503" || code === "23505") {
        res
          .status(409)
          .json({ error: "Initialize vault or use a new credential ID" });
        return;
      }
      throw error;
    }
    res.status(201).json({ id: input.id });
  });
  app.put("/credentials/:id", async (req, res) => {
    const id = z.uuid().parse(req.params.id);
    const payload = envelopeSchema.parse(req.body);
    const result = await pool.query(
      "UPDATE credentials SET payload=$1,updated_at=now() WHERE id=$2 AND user_id=$3",
      [payload, id, res.locals.user.id],
    );
    res
      .status(result.rowCount ? 200 : 404)
      .json(result.rowCount ? { ok: true } : { error: "Not found" });
  });
  app.delete("/credentials/:id", async (req, res) => {
    const id = z.uuid().parse(req.params.id);
    const result = await pool.query(
      "DELETE FROM credentials WHERE id=$1 AND user_id=$2",
      [id, res.locals.user.id],
    );
    res
      .status(result.rowCount ? 200 : 404)
      .json(result.rowCount ? { ok: true } : { error: "Not found" });
  });
  const errors: ErrorRequestHandler = (error, _req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const status = (error as { status?: number }).status;
    res
      .status(status === 413 ? 413 : status === 400 ? 400 : 500)
      .json({
        error:
          status === 413
            ? "Request too large"
            : status === 400
              ? "Invalid request"
              : "Request failed",
      });
  };
  app.use(errors);
  return app;
}
