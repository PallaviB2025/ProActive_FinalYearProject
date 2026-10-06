import { describe, it, expect } from "vitest";
import { computeSecurityScore } from "../../apps/web/lib/security-score";
import type { Finding } from "../../apps/web/lib/audit";

describe("honest security score and findings calculation", () => {
  const items = [
    { id: "one", website: "site", username: "user", password: "secret" },
  ];

  it("handles empty vault honestly with score 0 and placeholder label", () => {
    const result = computeSecurityScore([], null);
    expect(result.score).toBe(0);
    expect(result.scoreLabel).toBe("—");
    expect(result.suggestionCount).toBe(0);
  });

  it("identifies weak passwords locally before HIBP runs", () => {
    // When findings is null, computeSecurityScore runs auditCredentials locally
    const result = computeSecurityScore(items, null);
    expect(result.weakCount).toBeGreaterThanOrEqual(1);
    expect(result.score).toBeLessThan(100);
    expect(result.suggestionCount).toBeGreaterThan(0);
  });

  it("recognizes guessable and breached findings accurately", () => {
    const findings: Finding[] = [
      {
        id: "one",
        severity: "High",
        reasons: ["Guessable password (score: 1)"],
        actions: [],
        breach: { status: "breached", count: 1200 },
      },
    ];
    const result = computeSecurityScore(items, findings);
    expect(result.weakCount).toBe(1);
    expect(result.breachedCount).toBe(1);
    expect(result.scoreLabel).toBe("High Risk");
    expect(result.scoreColor).toBe("#e11d48");
  });

  it("correctly identifies safe strong credentials without breaches", () => {
    const safeItems = [
      { id: "safe1", website: "https://example.com", username: "alice", password: "xK9#mQ2$vL5!zP8@wR3&" },
    ];
    const cleanFindings: Finding[] = [];
    const result = computeSecurityScore(safeItems, cleanFindings);
    expect(result.breachedCount).toBe(0);
    expect(result.weakCount).toBe(0);
    expect(result.strongCount).toBe(1);
    expect(result.scoreLabel).toBe("Good");
    expect(result.score).toBeGreaterThanOrEqual(80);
  });
});
