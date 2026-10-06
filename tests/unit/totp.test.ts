import { describe, it, expect } from "vitest";
import { decodeBase32, generateTotp } from "../../apps/web/lib/totp";

describe("RFC 6238 TOTP Authenticator Engine", () => {
  it("decodes Base32 strings correctly", () => {
    // "hello" in Base32 is "NBSWY3DP"
    const decoded = decodeBase32("NBSWY3DP");
    const text = new TextDecoder().decode(decoded);
    expect(text).toBe("hello");
  });

  it("handles whitespace and lowercase in Base32", () => {
    const decoded = decodeBase32("nb sw y3 dp");
    const text = new TextDecoder().decode(decoded);
    expect(text).toBe("hello");
  });

  it("rejects invalid Base32 characters", () => {
    expect(() => decodeBase32("189!invalid")).toThrow();
  });

  it("produces RFC 6238 standard test vectors", async () => {
    // RFC 6238 test secret "12345678901234567890" in Base32:
    const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

    // Test vector at T = 59 seconds (59,000 ms) -> Code: "287082"
    const result59 = await generateTotp(secret, 59_000);
    expect(result59.code).toBe("287082");
    expect(result59.remainingSeconds).toBe(1);

    // Test vector at T = 1111111109 seconds -> Code: "081804"
    const resultEpoch = await generateTotp(secret, 1111111109 * 1000);
    expect(resultEpoch.code).toBe("081804");
  });
});
