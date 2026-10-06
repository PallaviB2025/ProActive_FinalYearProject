import { describe, it, expect } from "vitest";
import { auditCredentials, similarBase } from "../../apps/web/lib/audit";
const item = (id: string, password: string) => ({
  id,
  password,
  website: "example.org",
  username: "someone",
});
describe("local audit", () => {
  it("flags very weak passwords as High with actions", () => {
    const result = auditCredentials([item("1", "password")])[0]!;
    expect(result.severity).toBe("High");
    expect(result.reasons).toContain("Very guessable password");
    expect(result.actions.length).toBeGreaterThan(0);
  });
  it("detects exact reuse even for strong passwords", () => {
    const result = auditCredentials([
      item("1", "K9$pbZ!7xrMwQ2#f"),
      item("2", "K9$pbZ!7xrMwQ2#f"),
    ]);
    expect(
      result.every(
        (f) =>
          f.severity === "High" && f.reasons.includes("Exact password reuse"),
      ),
    ).toBe(true);
  });
  it("detects narrow capitalization and suffix variations", () => {
    const result = auditCredentials([
      item("1", "Sunflower123"),
      item("2", "sunflower!"),
    ]);
    expect(
      result.every((f) =>
        f.reasons.some((r) => r.startsWith("Similar pattern")),
      ),
    ).toBe(true);
  });
  it("does not label identical passwords as similar variations", () => {
    expect(
      auditCredentials([
        item("1", "sunflower1"),
        item("2", "sunflower1"),
      ])[0]!.reasons.some((r) => r.startsWith("Similar")),
    ).toBe(false);
  });
  it("excludes broad fuzzy patterns and short bases", () => {
    expect(similarBase("abc123")).toBeNull();
    expect(similarBase("sUnflower123")).toBeNull();
    expect(similarBase("sunflower12345")).toBeNull();
    expect(similarBase("sun-flower1")).toBeNull();
  });
  it("reports Low for strong unique passwords without claiming breach safety", () => {
    const result = auditCredentials([item("1", "K9$pbZ!7xrMwQ2#f")])[0]!;
    expect(result.severity).toBe("Low");
    expect(result.actions.join(" ")).toContain(
      "do not establish breach status",
    );
  });
  it("does not include passwords in findings", () => {
    const secret = "Secretflower123";
    expect(JSON.stringify(auditCredentials([item("1", secret)]))).not.toContain(
      secret,
    );
  });
  it("handles an empty vault", () => {
    expect(auditCredentials([])).toEqual([]);
  });
  it("treats secure notes as Low severity and does not flag reuse between multiple notes", () => {
    const notes = [
      { id: "note-1", type: "note" as const, website: "Server Setup", username: "", password: "", note: "Confidential setup" },
      { id: "note-2", type: "note" as const, website: "Backup Keys", username: "", password: "", note: "Root backup" },
    ];
    const results = auditCredentials(notes);
    expect(results).toHaveLength(2);
    for (const res of results) {
      expect(res.severity).toBe("Low");
      expect(res.reasons).toContain("Encrypted secure note");
      expect(res.reasons).not.toContain("Exact password reuse");
      expect(res.reasons).not.toContain("Very guessable password");
    }
  });
  it("treats payment cards as Low severity and does not flag reuse", () => {
    const cards = [
      { id: "card-1", type: "card" as const, website: "Visa", username: "", password: "", cardNumber: "4111222233334444" },
      { id: "card-2", type: "card" as const, website: "Mastercard", username: "", password: "", cardNumber: "5500111122223333" },
    ];
    const results = auditCredentials(cards);
    expect(results).toHaveLength(2);
    for (const res of results) {
      expect(res.severity).toBe("Low");
      expect(res.reasons).toContain("Encrypted payment card");
      expect(res.reasons).not.toContain("Exact password reuse");
    }
  });
  it("flags logins without passwords as Medium severity informatively", () => {
    const login = { id: "login-1", type: "login" as const, website: "SSO Bookmark", username: "alice", password: "" };
    const result = auditCredentials([login])[0]!;
    expect(result.severity).toBe("Medium");
    expect(result.reasons).toContain("No password set for this login");
  });
});
