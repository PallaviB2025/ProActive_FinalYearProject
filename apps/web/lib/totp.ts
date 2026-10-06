// RFC 6238 & RFC 4226 compliant TOTP (Time-based One-Time Password) engine
// Pure Web Crypto implementation (zero external dependencies)

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function decodeBase32(input: string): Uint8Array {
  const cleaned = input.toUpperCase().replace(/[\s-]/g, "").replace(/=+$/, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i]!;
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid Base32 character: ${char}`);
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(bytes);
}

export async function generateTotp(
  secretBase32: string,
  timeMs: number = Date.now(),
  stepSeconds = 30,
  digits = 6,
): Promise<{ code: string; remainingSeconds: number }> {
  const keyBytes = decodeBase32(secretBase32);
  const timeStep = Math.floor(timeMs / 1000 / stepSeconds);
  const remainingSeconds = stepSeconds - (Math.floor(timeMs / 1000) % stepSeconds);

  // Convert time step into 8-byte big-endian buffer
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0, BigInt(timeStep), false);

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes as unknown as BufferSource,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, buffer);
  const hmac = new Uint8Array(signature);

  // Dynamic truncation (RFC 4226 Section 5.4)
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const binary =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);

  const modulo = 10 ** digits;
  const token = (binary % modulo).toString().padStart(digits, "0");

  return { code: token, remainingSeconds };
}
