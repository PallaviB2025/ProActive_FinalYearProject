// ProActive Extension Cryptography
// Pure Web Crypto API implementation (Zero third-party dependencies)
// AES-256-GCM + PBKDF2-SHA256 (600,000 iterations)

export const ITERATIONS = 600000;
const encoder = new TextEncoder();

export const b64 = (buf) => {
  let binary = "";
  const bytes = new Uint8Array(buf.buffer || buf);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

export const bytes = (value) =>
  Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

const aad = (context) => encoder.encode(`ProActive:v1:${context}`);

export async function kek(password, salt) {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey"],
  );
}

export async function encrypt(key, plaintext, context) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const input = encoder.encode(plaintext);
  try {
    const cipher = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: aad(context), tagLength: 128 },
      key,
      input,
    );
    return { iv: b64(iv), ciphertext: b64(new Uint8Array(cipher)) };
  } finally {
    input.fill(0);
  }
}

export async function decrypt(key, envelope, context) {
  const plain = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: bytes(envelope.iv),
      additionalData: aad(context),
      tagLength: 128,
    },
    key,
    bytes(envelope.ciphertext),
  );
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(plain);
  } finally {
    new Uint8Array(plain).fill(0);
  }
}

export async function unlockVault(password, metadata) {
  try {
    const saltBytes = bytes(metadata.salt);
    const wrappingKey = await kek(password, saltBytes);
    const key = await crypto.subtle.unwrapKey(
      "raw",
      bytes(metadata.wrappedKey.ciphertext),
      wrappingKey,
      {
        name: "AES-GCM",
        iv: bytes(metadata.wrappedKey.iv),
        additionalData: aad("wrapped-key"),
        tagLength: 128,
      },
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
    const verifierText = await decrypt(key, metadata.verifier, "verifier");
    if (verifierText !== "ProActive vault verifier v1") {
      throw new Error("Invalid verifier token");
    }
    return key;
  } catch (err) {
    throw new Error("Wrong Master Password or corrupted vault");
  }
}

export async function encryptCredential(key, id, value) {
  return encrypt(key, JSON.stringify(value), `credential:${id}`);
}

export async function decryptCredential(key, id, envelope) {
  const jsonStr = await decrypt(key, envelope, `credential:${id}`);
  return JSON.parse(jsonStr);
}
