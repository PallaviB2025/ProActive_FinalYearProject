import { describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import {
  cleanupExpiredSessions,
  cleanupExpiredSessionsSafely,
} from "../../apps/api/src/sessions";

describe("expired session cleanup", () => {
  it("deletes only rows expired at current database time", async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 2 });
    const pool = { query } as unknown as Pool;
    await expect(cleanupExpiredSessions(pool)).resolves.toBe(2);
    expect(query).toHaveBeenCalledExactlyOnceWith(
      "DELETE FROM sessions WHERE expires_at <= now()",
    );
  });

  it("contains cleanup failures and logs no database error details", async () => {
    const query = vi.fn().mockRejectedValue(new Error("sensitive detail"));
    const pool = { query } as unknown as Pool;
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(cleanupExpiredSessionsSafely(pool)).resolves.toBeUndefined();
    expect(warning).toHaveBeenCalledExactlyOnceWith(
      "Expired session cleanup failed",
    );
    expect(warning).not.toHaveBeenCalledWith(
      expect.stringContaining("sensitive detail"),
    );
    warning.mockRestore();
  });
});
