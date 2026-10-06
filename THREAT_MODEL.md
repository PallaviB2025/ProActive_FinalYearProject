# Threat model

## Protected assets

Login credentials, Master Password, key-encryption key (KEK), vault key, decrypted credentials, encrypted credential records, and session tokens.

## Trust boundaries

- The browser tab performs vault cryptography and temporarily holds decrypted data.
- The local Express API authenticates sessions and stores opaque encrypted envelopes.
- PostgreSQL stores account hashes, hashed session tokens, vault metadata, and ciphertext.
- HIBP receives only a five-character SHA-1 prefix after an explicit audit.

## Defenses

- Login passwords use Argon2id. Sessions are random, server-side, hashed at rest, HttpOnly, SameSite Strict, and time-limited.
- Mutations require the configured origin, a custom CSRF header, and JSON content type. Credentialed CORS permits one configured origin.
- Zod schemas reject unknown and malformed fields. SQL uses parameters and ownership predicates.
- A random vault key encrypts credentials with AES-256-GCM, fresh 96-bit IVs, 128-bit tags, and credential-specific AAD.
- PBKDF2-SHA256 derives a non-extractable KEK. Only the wrapped vault key, salt, verifier, and ciphertext reach the server.
- React escapes displayed values. The UI does not navigate to user-provided website values.
- Responses and logs avoid secrets; browser persistence is not used for decrypted material.

## Out of scope

A compromised browser/OS, malicious extensions, screen or clipboard capture, memory forensics while unlocked, denial of service, and recovery from a forgotten Master Password.
