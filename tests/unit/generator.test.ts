import { describe, it, expect } from "vitest";
import { generatePassword, generatePassphrase, DICEWARE_WORDS } from "../../apps/web/lib/generator";

describe("Cryptographic Password & Passphrase Generator", () => {
  it("generates password with requested length", () => {
    const pwd16 = generatePassword({ length: 16 });
    expect(pwd16.length).toBe(16);

    const pwd32 = generatePassword({ length: 32 });
    expect(pwd32.length).toBe(32);
  });

  it("includes selected character pools", () => {
    const pwd = generatePassword({
      length: 24,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
    });
    expect(/[A-Z]/.test(pwd)).toBe(true);
    expect(/[a-z]/.test(pwd)).toBe(true);
    expect(/[0-9]/.test(pwd)).toBe(true);
    expect(/[^a-zA-Z0-9]/.test(pwd)).toBe(true);
  });

  it("excludes ambiguous characters when requested", () => {
    for (let i = 0; i < 20; i++) {
      const pwd = generatePassword({ length: 30, excludeAmbiguous: true });
      expect(/[0O1lI|`'"]/.test(pwd)).toBe(false);
    }
  });

  it("generates Diceware passphrases with valid words and separators", () => {
    const phrase = generatePassphrase({ words: 4, separator: "-", includeNumber: false, capitalize: false });
    const parts = phrase.split("-");
    expect(parts.length).toBe(4);
    for (const part of parts) {
      expect(DICEWARE_WORDS).toContain(part);
    }
  });

  it("appends numbers and capitalizes when requested", () => {
    const phrase = generatePassphrase({ words: 3, separator: ".", includeNumber: true, capitalize: true });
    const parts = phrase.split(".");
    expect(parts.length).toBe(4); // 3 words + 1 number
    expect(/[A-Z]/.test(parts[0]![0]!)).toBe(true);
    expect(Number(parts[3])).toBeGreaterThanOrEqual(10);
  });
});
