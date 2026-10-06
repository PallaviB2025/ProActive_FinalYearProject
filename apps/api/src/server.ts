import { config } from "dotenv";
import { resolve, join, dirname } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createApp } from "./app.js";
import { cleanupExpiredSessionsSafely } from "./sessions.js";

const here = dirname(fileURLToPath(import.meta.url));
const envCandidates = [
  resolve(".env"),
  resolve("../.env"),
  resolve("../../.env"),
  join(here, "..", "..", "..", ".env"),
  join(here, "..", "..", "..", "..", ".env"),
];
for (const p of envCandidates) {
  if (existsSync(p)) {
    config({ path: p, quiet: true });
    break;
  }
}
const dbUrl = process.env.DATABASE_URL;
const isNeon = dbUrl?.includes("neon.tech") || dbUrl?.includes("sslmode=");

const pool = new pg.Pool({
  connectionString: dbUrl,
  connectionTimeoutMillis: 10000,
  ssl: isNeon ? { rejectUnauthorized: false } : undefined,
});
pool.on("error", (err) => console.warn("Database connection issue:", err.message));

// Non-blocking cleanup so cold starts never fail
void cleanupExpiredSessionsSafely(pool).catch((err) => console.warn("Cleanup warning:", err.message));

const app = createApp(pool, {
  origin: process.env.APP_ORIGIN ?? "*",
  production: process.env.NODE_ENV === "production" || !!process.env.VERCEL,
});
export default app;
if (!process.env.VERCEL) {
  const server = app.listen(Number(process.env.PORT ?? 4000), "127.0.0.1", () =>
    console.log("ProActive API listening on 127.0.0.1:4000"),
  );
  process.on("SIGTERM", () => {
    server.close(() => {
      void pool.end();
    });
  });
}
