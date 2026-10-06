import type { Pool } from "pg";

export async function cleanupExpiredSessions(pool: Pool): Promise<number> {
  const result = await pool.query(
    "DELETE FROM sessions WHERE expires_at <= now()",
  );
  return result.rowCount ?? 0;
}

export async function cleanupExpiredSessionsSafely(pool: Pool): Promise<void> {
  try {
    await cleanupExpiredSessions(pool);
  } catch {
    console.warn("Expired session cleanup failed");
  }
}
