import { describe, expect, it } from "vitest";
import { parseCredentialCsv, readCsvFile, MAX_CSV_BYTES } from "../../apps/web/lib/csvImport";
import { auditCredentials } from "../../apps/web/lib/audit";
import { encryptCredential, initializeVault } from "../../apps/web/lib/crypto";

describe("browser CSV import", () => {
  it("rejects trailing text after a quoted field and ambiguous headers", () => {
    expect(() => parseCredentialCsv('url,username,password\nsite,user,"secret"junk')).toThrow("Malformed CSV");
    expect(() => parseCredentialCsv('url,username,password,password\nsite,user,a,b')).toThrow("Duplicate CSV column");
  });
  it("preserves case-sensitive accounts and username whitespace", () => {
    const result = parseCredentialCsv('url,username,password\nsite/Path,User,secret\nsite/path,user,secret\nsite/path, user ,secret');
    expect(result.duplicates).toBe(0);
    expect(result.rows[2]?.credential?.username).toBe(' user ');
  });
  it("handles CRLF and CR record boundaries without altering quoted CRLF", () => {
    const result = parseCredentialCsv('url,username,password\r\nsite,user,"a\r\nb"\rsite2,user,secret');
    expect(result.valid).toBe(2);
    expect(result.rows[0]?.credential?.password).toBe('a\r\nb');
  });
  it("bounds files and rows and rejects invalid UTF-8 or non-CSV files", async () => {
    await expect(readCsvFile(new File([new Uint8Array([255])], 'a.csv'))).rejects.toThrow();
    await expect(readCsvFile(new File(['a'], 'a.txt'))).rejects.toThrow('Choose a CSV');
    await expect(readCsvFile(new File(['a'.repeat(MAX_CSV_BYTES + 1)], 'a.csv'))).rejects.toThrow('2 MB');
    expect(() => parseCredentialCsv('url,username,password\n' + 'a,b,c\n'.repeat(1001))).toThrow('1,000 rows');
  });
  it("parses common browser columns and aliases", () => {
    const preview = parseCredentialCsv(
      "name,url,username,password\nExample,https://example.com,alice,Secret-123!",
    );
    expect(preview).toMatchObject({ total: 1, valid: 1, invalid: 0, duplicates: 0 });
    expect(preview.rows[0]?.credential).toEqual({
      website: "https://example.com",
      username: "alice",
      password: "Secret-123!",
    });
  });

  it("rejects malformed and empty CSV", () => {
    expect(() => parseCredentialCsv("url,username,password\n\"unfinished"))
      .toThrow("Malformed CSV");
    expect(() => parseCredentialCsv("  \r\n")).toThrow("CSV file is empty");
  });

  it("rejects missing required columns", () => {
    expect(() => parseCredentialCsv("url,username\nexample.com,alice"))
      .toThrow("website, username, and password columns");
  });

  it("handles quoted commas, quotes, UTF-8, and embedded newlines", () => {
    const preview = parseCredentialCsv(
      'name,login,password\n"Tést, Inc.","a""b@example.com","line one\nline two"',
    );
    expect(preview.rows[0]?.credential).toEqual({
      website: "Tést, Inc.",
      username: 'a"b@example.com',
      password: "line one\nline two",
    });
  });

  it("marks missing and excessively long fields invalid", () => {
    const preview = parseCredentialCsv(
      `url,username,password\n,alice,secret\nexample.com,bob,${"x".repeat(1025)}`,
    );
    expect(preview).toMatchObject({ total: 2, valid: 0, invalid: 2 });
  });

  it("marks duplicates within the file and against the vault", () => {
    const existing = [{ website: "existing.example", username: "alice", password: "Same-123!" }];
    const preview = parseCredentialCsv(
      "website,username,password\nexisting.example,alice,Same-123!\nnew.example,bob,Other-456!\nnew.example,bob,Other-456!",
      existing,
    );
    expect(preview.duplicates).toBe(2);
    expect(preview.rows.map((row) => row.duplicate)).toEqual([true, false, true]);
  });

  it("produces credentials compatible with encryption and local audit", async () => {
    const preview = parseCredentialCsv(
      "url,username,password\none.example,a,Sunflower123\ntwo.example,b,Sunflower123",
    );
    const credentials = preview.rows.flatMap((row) => row.credential ? [row.credential] : []);
    const vault = await initializeVault("CSV-test-master-password!");
    const envelope = await encryptCredential(vault.key, crypto.randomUUID(), credentials[0]!);
    expect(JSON.stringify(envelope)).not.toContain("Sunflower123");
    expect(auditCredentials(credentials.map((credential, index) => ({ id: String(index), ...credential }))))
      .toEqual(expect.arrayContaining([expect.objectContaining({ severity: "High" })]));
  });
});
