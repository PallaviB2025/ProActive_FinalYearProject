import {
  ITERATIONS,
  credentialSchema,
  vaultSchema,
  type Credential,
  type Envelope,
  type VaultMetadata,
} from "@proactive/shared";
const encoder = new TextEncoder();
const b64 = (buf: Uint8Array) => {
  let binary = "";
  const len = buf.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buf[i]!);
  }
  return btoa(binary);
};
const bytes = (value: string) =>
  Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
const aad = (context: string) => encoder.encode(`ProActive:v1:${context}`);
async function kek(password: string, salt: Uint8Array<ArrayBuffer>) {
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
async function encrypt(
  key: CryptoKey,
  plaintext: string,
  context: string,
): Promise<Envelope> {
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
async function decrypt(key: CryptoKey, envelope: Envelope, context: string) {
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
export async function initializeVault(
  password: string,
): Promise<{ key: CryptoKey; metadata: VaultMetadata }> {
  if (password.length < 12)
    throw new Error("Use at least 12 characters for the Master Password");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const wrappingKey = await kek(password, salt);
  const temporaryKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await crypto.subtle.wrapKey(
    "raw",
    temporaryKey,
    wrappingKey,
    { name: "AES-GCM", iv, additionalData: aad("wrapped-key"), tagLength: 128 },
  );
  const wrappedKey = { iv: b64(iv), ciphertext: b64(new Uint8Array(wrapped)) };
  const key = await crypto.subtle.unwrapKey(
    "raw",
    wrapped,
    wrappingKey,
    { name: "AES-GCM", iv, additionalData: aad("wrapped-key"), tagLength: 128 },
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  const verifier = await encrypt(
    key,
    "ProActive vault verifier v1",
    "verifier",
  );
  return {
    key,
    metadata: {
      version: 1,
      kdf: "PBKDF2-SHA256",
      iterations: ITERATIONS,
      salt: b64(salt),
      wrappedKey,
      verifier,
    },
  };
}
export async function unlockVault(
  password: string,
  input: VaultMetadata,
): Promise<CryptoKey> {
  try {
    const metadata = vaultSchema.parse(input);
    const wrappingKey = await kek(password, bytes(metadata.salt));
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
    if (
      (await decrypt(key, metadata.verifier, "verifier")) !==
      "ProActive vault verifier v1"
    )
      throw new Error("Invalid verifier");
    return key;
  } catch {
    throw new Error("Wrong Master Password or damaged vault");
  }
}
export const encryptCredential = (
  key: CryptoKey,
  id: string,
  value: Credential,
) =>
  encrypt(
    key,
    JSON.stringify(credentialSchema.parse(value)),
    `credential:${id}`,
  );
export const decryptCredential = async (
  key: CryptoKey,
  id: string,
  value: Envelope,
): Promise<Credential> =>
  credentialSchema.parse(
    JSON.parse(await decrypt(key, value, `credential:${id}`)),
  );
