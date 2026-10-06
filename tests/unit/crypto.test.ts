import { describe, it, expect } from "vitest";
import {
  initializeVault,
  unlockVault,
  encryptCredential,
  decryptCredential,
} from "../../apps/web/lib/crypto";
import {
  vaultSchema,
  envelopeSchema,
  authSchema,
} from "../../packages/shared/src/schema";
const master = "correct horse vault master 739!";
const value = {
  website: "https://private.example",
  username: "private-user",
  password: "private-password",
};
describe("client encryption", () => {
  it("rejects padded encodings with the right character count but wrong byte length", async () => {
    const { metadata } = await initializeVault(master);
    for (const length of [10, 11]) {
      expect(envelopeSchema.safeParse({ ...metadata.verifier, iv: Buffer.alloc(length).toString('base64') }).success).toBe(false);
    }
    for (const length of [17, 18]) {
      expect(vaultSchema.safeParse({ ...metadata, salt: Buffer.alloc(length).toString('base64') }).success).toBe(false);
    }
    expect(vaultSchema.safeParse(metadata).success).toBe(true);
  });
  it("wraps a random 256-bit key and unlocks it without exporting the live key", async () => {
    const { key, metadata } = await initializeVault(master);
    expect(metadata.iterations).toBe(600000);
    expect(atob(metadata.salt)).toHaveLength(16);
    expect(atob(metadata.wrappedKey.ciphertext)).toHaveLength(48);
    expect(key.extractable).toBe(false);
    await expect(crypto.subtle.exportKey("raw", key)).rejects.toThrow();
    const unlocked = await unlockVault(master, metadata);
    const payload = await encryptCredential(key, "id", value);
    expect(await decryptCredential(unlocked, "id", payload)).toEqual(value);
    expect(JSON.stringify(metadata)).not.toContain(master);
  });
  it("rejects a wrong Master Password", async () => {
    const { metadata } = await initializeVault(master);
    await expect(
      unlockVault("wrong master password", metadata),
    ).rejects.toThrow("Wrong Master Password");
  });
  it("uses independent salts, keys, and fresh 12-byte IVs", async () => {
    const a = await initializeVault(master);
    const b = await initializeVault(master);
    expect(a.metadata.salt).not.toBe(b.metadata.salt);
    expect(a.metadata.wrappedKey.ciphertext).not.toBe(
      b.metadata.wrappedKey.ciphertext,
    );
    const one = await encryptCredential(a.key, "id", value);
    const two = await encryptCredential(a.key, "id", value);
    expect(atob(one.iv)).toHaveLength(12);
    expect(one.iv).not.toBe(two.iv);
    expect(one.ciphertext).not.toBe(two.ciphertext);
  });
  it("authenticates ciphertext and credential identity", async () => {
    const { key } = await initializeVault(master);
    const payload = await encryptCredential(key, "id", value);
    await expect(decryptCredential(key, "other", payload)).rejects.toThrow();
    const altered = {
      ...payload,
      ciphertext:
        (payload.ciphertext[0] === "A" ? "B" : "A") +
        payload.ciphertext.slice(1),
    };
    await expect(decryptCredential(key, "id", altered)).rejects.toThrow();
  });
  it("rejects a tampered encrypted verifier", async () => {
    const { metadata } = await initializeVault(master);
    metadata.verifier.ciphertext = "A".repeat(
      metadata.verifier.ciphertext.length,
    );
    await expect(unlockVault(master, metadata)).rejects.toThrow();
  });
  it("encrypts all three credential fields", async () => {
    const { key } = await initializeVault(master);
    const payload = await encryptCredential(key, "id", value);
    for (const secret of Object.values(value))
      expect(JSON.stringify(payload)).not.toContain(secret);
    expect(Object.keys(payload).sort()).toEqual(["ciphertext", "iv"]);
  });
  it("rejects unsupported KDF settings and plaintext metadata fields", async () => {
    const { metadata } = await initializeVault(master);
    expect(vaultSchema.safeParse({ ...metadata, iterations: 1 }).success).toBe(
      false,
    );
    expect(
      vaultSchema.safeParse({ ...metadata, masterPassword: master }).success,
    ).toBe(false);
    expect(
      envelopeSchema.safeParse({ iv: "abc", ciphertext: "secret" }).success,
    ).toBe(false);
  });
  it("normalizes emails and rejects unexpected auth fields", () => {
    expect(
      authSchema.parse({ email: " Alice@Example.com ", password: master })
        .email,
    ).toBe("alice@example.com");
    expect(
      authSchema.safeParse({ email: "a@b.com", password: master, master })
        .success,
    ).toBe(false);
  });
});
