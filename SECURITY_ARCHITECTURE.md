# Security architecture

ProActive separates account authentication from vault encryption. The login password authenticates to the local API and is stored only as an Argon2id hash. The Master Password stays in the browser and derives a KEK using PBKDF2-SHA256 with a random salt and 600,000 iterations.

Vault initialization generates a random 256-bit vault key. The KEK wraps that key with AES-GCM; the live unwrapped key is non-extractable and exists only in the current tab. PostgreSQL receives vault metadata and encrypted credential envelopes, never the Master Password, KEK, raw vault key, or plaintext credentials.

Each credential encryption uses a fresh random 96-bit IV, a 128-bit authentication tag, and AAD bound to the credential ID. The verifier and wrapped key use separate AAD contexts. Wrong passwords, modified ciphertext, modified tags, and ciphertext moved between credential IDs fail authentication.

The API restricts bodies to 48 KB, validates strict schemas, uses parameterized SQL, applies per-user ownership filters, rate-limits authentication and general traffic, and returns generic errors. Sessions use opaque 256-bit tokens in HttpOnly SameSite cookies; only SHA-256 token digests are stored.

HIBP checks use the k-anonymity range API. Only five uppercase hash-prefix characters are sent, with padding requested, credentials omitted, referrers disabled, redirects rejected, and responses cached only in memory for the unlocked tab.

CSV files are decoded and previewed in browser memory. Selected credentials use the same AES-GCM routine and existing encrypted CRUD endpoint. Imports are not transactional; failed writes are reconciled through encrypted reads before retry. Raw files and preview passwords are not sent to the API or browser persistence.

Session expiry is checked on each authenticated API request. Cleanup at startup and after login deletes only expiry <= database time, with generic failure handling. Local HTTP and bootstrap database privileges are demonstration choices, not a public deployment security configuration.
