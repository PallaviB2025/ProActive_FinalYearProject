import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Pool } from "pg";
import argon2 from "argon2";
import { createApp } from "../../apps/api/src/app";
import { exportAsCSV, exportAsEncryptedJSON } from "../../apps/web/lib/export";
import { prepareRekey } from "../../apps/web/lib/rekey";
import { initializeVault } from "../../apps/web/lib/crypto";

describe("Account Deletion, Vault Rekeying & Data Export", () => {
  const origin = "http://localhost:3000";
  const headers = { Origin: origin, "X-Proactive-CSRF": "1" };
  const fakeToken = "c".repeat(64);
  const mockUser = { id: "11111111-1111-1111-1111-111111111111", email: "user@example.com" };

  it("exports credentials accurately to CSV format with proper escaping", () => {
    const items = [
      {
        id: "1",
        website: "example.com",
        username: "user1",
        password: "secret,password",
        note: 'Note with "quotes" and, commas',
        type: "login" as const,
      },
      {
        id: "2",
        website: "bank.com",
        username: "bankuser",
        password: "safe",
        type: "card" as const,
        cardholder: "JOHN DOE",
        cardNumber: "4111 2222 3333 4444",
        cardExpiry: "12/28",
        cardCvv: "123",
      },
    ];

    const csv = exportAsCSV(items);
    expect(csv).toContain("website,username,password,totpSecret,note,type,cardholder,cardNumber,cardExpiry,cardCvv");
    expect(csv).toContain('example.com,user1,"secret,password",,"Note with ""quotes"" and, commas",login,,,,');
    expect(csv).toContain("bank.com,bankuser,safe,,,card,JOHN DOE,4111 2222 3333 4444,12/28,123");
  });

  it("neutralizes spreadsheet formula injection in CSV export", () => {
    const dangerousItems = [
      {
        id: "d1",
        website: "=cmd|' /C calc'!A0",
        username: "+123456",
        password: "-DDE(\"foo\")",
        note: "@admin",
        type: "login" as const,
      },
    ];
    const csv = exportAsCSV(dangerousItems);
    expect(csv).toContain("'=cmd|' /C calc'!A0");
    expect(csv).toContain("'+123456");
    expect(csv).toContain('"\' -DDE(""foo"")"'.replace(" ", ""));
    expect(csv).toContain("'@admin");
  });

  it("exports encrypted vault data as valid JSON", async () => {
    const { metadata } = await initializeVault("masterPassword123!");
    const json = exportAsEncryptedJSON(metadata, [{ id: "c1", payload: metadata.verifier }]);
    const parsed = JSON.parse(json);
    expect(parsed.format).toBe("ProActive-Encrypted-Vault");
    expect(parsed.version).toBe(1);
    expect(parsed.vault.kdf).toBe("PBKDF2-SHA256");
    expect(parsed.credentials).toHaveLength(1);
  });

  it("prepares client-side rekeying by creating new metadata and re-encrypting all items", async () => {
    const items = [
      { id: "1", website: "site.com", username: "u", password: "p", type: "login" as const },
    ];
    const rekeyResult = await prepareRekey("newMasterPass456!", items);
    expect(rekeyResult.newKey).toBeDefined();
    expect(rekeyResult.metadata.kdf).toBe("PBKDF2-SHA256");
    expect(rekeyResult.reEncrypted).toHaveLength(1);
    expect(rekeyResult.reEncrypted[0]!.id).toBe("1");
    expect(rekeyResult.reEncrypted[0]!.payload.ciphertext).toBeDefined();
  });

  it("rejects unauthorized PUT /vault/rekey requests", async () => {
    const pool = { query: vi.fn() } as unknown as Pool;
    const app = createApp(pool, { origin });

    await request(app)
      .put("/vault/rekey")
      .set(headers)
      .send({ metadata: {}, credentials: [] })
      .expect(401);
  });

  it("rejects unauthorized DELETE /auth/account requests", async () => {
    const pool = { query: vi.fn() } as unknown as Pool;
    const app = createApp(pool, { origin });

    await request(app)
      .delete("/auth/account")
      .set(headers)
      .send({ password: "some-password" })
      .expect(401);
  });

  it("deletes user account when correct password is provided", async () => {
    const passwordHash = await argon2.hash("myValidPassword123!", {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });

    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM sessions")) {
        return { rows: [mockUser] };
      }
      if (sql.includes("FROM users WHERE id=")) {
        return { rows: [{ password_hash: passwordHash }] };
      }
      if (sql.includes("DELETE FROM users")) {
        return { rowCount: 1 };
      }
      return { rows: [] };
    });

    const pool = { query } as unknown as Pool;
    const app = createApp(pool, { origin });

    const res = await request(app)
      .delete("/auth/account")
      .set({
        ...headers,
        Cookie: `proactive_session=${fakeToken}`,
      })
      .send({ password: "myValidPassword123!" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(query).toHaveBeenCalledWith(
      "DELETE FROM users WHERE id=$1",
      [mockUser.id],
    );
  });

  it("rejects account deletion when incorrect password is provided", async () => {
    const passwordHash = await argon2.hash("myValidPassword123!", {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });

    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM sessions")) {
        return { rows: [mockUser] };
      }
      if (sql.includes("FROM users WHERE id=")) {
        return { rows: [{ password_hash: passwordHash }] };
      }
      return { rows: [] };
    });

    const pool = { query } as unknown as Pool;
    const app = createApp(pool, { origin });

    const res = await request(app)
      .delete("/auth/account")
      .set({
        ...headers,
        Cookie: `proactive_session=${fakeToken}`,
      })
      .send({ password: "wrongPassword" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid password");
  });
});
