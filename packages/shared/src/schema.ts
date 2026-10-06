import { z } from "zod";
export const ITERATIONS = 600_000;
const base64 = (bytes: number) =>
  z
    .string()
    .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/)
    .length(4 * Math.ceil(bytes / 3))
    .refine((value) => value.length * 3 / 4 - (value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0) === bytes);
export const envelopeSchema = z
  .object({
    iv: base64(12),
    ciphertext: z
      .string()
      .min(24)
      .max(32768)
      .regex(
        /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
      ),
  })
  .strict();
export const vaultSchema = z
  .object({
    version: z.literal(1),
    kdf: z.literal("PBKDF2-SHA256"),
    iterations: z.literal(ITERATIONS),
    salt: base64(16),
    wrappedKey: envelopeSchema.extend({ ciphertext: base64(48) }),
    verifier: envelopeSchema,
  })
  .strict();
export const credentialSchema = z
  .object({
    type: z.enum(["login", "note", "card"]).optional(),
    website: z.string().min(1).max(2048),
    username: z.string().max(1024),
    password: z.string().max(1024),
    totpSecret: z.string().max(256).optional(),
    note: z.string().max(8192).optional(),
    cardholder: z.string().max(256).optional(),
    cardNumber: z.string().max(64).optional(),
    cardExpiry: z.string().max(16).optional(),
    cardCvv: z.string().max(16).optional(),
  })
  .strict();
export const authSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(12).max(256),
  })
  .strict();
export const registerSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z
      .string()
      .min(12)
      .max(256)
      .refine(
        (pw) => /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /[0-9]/.test(pw),
        "Password must include uppercase, lowercase, and a number",
      )
      .refine(
        (pw) => !/^(.)\1+$/.test(pw) && !/^(.{2,4})\1+$/.test(pw),
        "Password cannot consist of repeated characters or sequences",
      ),
  })
  .strict();
export type Envelope = z.infer<typeof envelopeSchema>;
export type VaultMetadata = z.infer<typeof vaultSchema>;
export type Credential = z.infer<typeof credentialSchema>;
export type StoredCredential = { id: string; payload: Envelope };
