# Known limitations

- This is a localhost demonstration deployment, not an internet-facing multi-host production configuration. Local HTTP cannot use Secure cookies; production mode requires HTTPS and enables a `__Host-` Secure cookie.
- Security depends on the browser, operating system, and device remaining trustworthy while the vault is unlocked.
- JavaScript strings and Web Crypto objects cannot be deterministically erased from managed memory.
- Clipboard contents are controlled by the operating system and may remain after copying.
- There is no Master Password recovery. Losing it makes the vault unrecoverable.
- HIBP availability and completeness are external dependencies; “not found” does not prove a password is safe.
- PBKDF2 is retained for broad Web Crypto compatibility; its fixed work factor should be reviewed as hardware evolves.
- The bundled Windows scripts target 64-bit Windows and require PowerShell. Initial dependency/browser setup may require internet access.
- npm audit reports one moderate development-tool advisory in Vitest 3 and @vitest/mocker (GHSA-82fw-gwwq-j7x9). The exposed mocker-plugin server path is not used by this project; do not expose test/development servers. A patched release requires a major Vitest migration, deferred from this focused audit. No production dependency advisory was reported by this audit.
- Setup requires complete bundled tools; source alone is insufficient. Clean setup on another physical PC is unverified. Do not share an existing .env or live database directory as a fresh-install bundle.
- CSV imports are limited to UTF-8 comma-separated files, 2 MB and 1,000 rows, and use individual writes. Network failures can commit a subset; reconciliation/retry skips existing exact credentials. Cross-tab concurrent edits/imports have no conflict resolution.
- HIBP may observe your IP and prefix. Similarity detection is deliberately narrow; a low-risk result and heuristic score do not guarantee safety.
- A corrupt encrypted record fails the entire unlock; there is no per-record recovery workflow. Protect backups.
- Session cleanup is opportunistic. Expired rows may remain during idle periods or database outages, but cannot authenticate. Auth expiry is enforced on API requests; it does not erase an already unlocked browser tab on a timer.
- Local database configuration and backups require OS access controls. The local bootstrap database owner has elevated privileges; least-privilege roles, TLS, backup operations, and a frontend CSP require deployment preparation.
- Large imports can hit the existing 300-request/minute API limit; wait and retry the remaining rows. No atomic batch endpoint was added.
- Browser regression targets bundled Chromium. Full assistive-technology accessibility certification, other browser engines, and large-vault performance benchmarks have not been performed. An unused Icons.tsx component library and legacy utility-class overrides remain; neither requires a redesign or affects the verified flows.
