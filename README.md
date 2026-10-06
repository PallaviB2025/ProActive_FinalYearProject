# ProActive

**ProActive is a zero-knowledge, end-to-end encrypted password and identity vault built on a TypeScript monorepo architecture.** It encrypts secrets client-side via Web Crypto (AES-256-GCM with PBKDF2-SHA256 key derivation) before transmitting ciphertexts to an Express and PostgreSQL backend. It pairs Next.js 15, Auth.js v5 Google OAuth, passkey authentication via WebAuthn, and a Chrome Manifest V3 extension.

## Core Features

- Client-side zero-knowledge encryption: All secret payloads undergo client-side AES-256-GCM encryption with keys derived through 600,000 PBKDF2-SHA256 iterations. Plaintext secrets never reach server memory or logs.
- Dual authentication flow: Supports email and Argon2id password authentication alongside Auth.js v5 Google OAuth via a server-side session exchange bridge.
- WebAuthn passkey support: Fast biometrics and hardware security key authentication (Touch ID, Windows Hello, FIDO2) via SimpleWebAuthn.
- Heuristic security auditing: In-browser evaluation computes entropy scores, flags weak or reused credentials, and runs k-anonymity breach checks against the HaveIBeenPwned API.
- Attack graph visualization: Generates dependency models mapping credential re-use exposure and blast radii across recorded domains.
- Integrated TOTP authenticator: Generates time-based one-time passcodes locally according to RFC 6238.
- Centralized styling: Built on Tailwind CSS v4 and a unified CSS token design system with hardware-accelerated transitions and zero third-party UI framework bloat.
- Chrome browser extension: Manifest V3 extension providing credential querying, auto-fill, and cryptographic vault synchronization.

## Architecture

The project operates as an npm workspaces monorepo:

- apps/web: Next.js 15 App Router web application with Auth.js v5 authentication, server actions, and centralized global styling.
- apps/api: Express backend handling database persistence, rate limiting, WebAuthn challenge orchestration, and session tokens.
- apps/extension: Chrome Manifest V3 browser extension.
- packages/shared: Shared TypeScript schemas, validation models, and cryptographic types validated through Zod.

## Local Development Prerequisites

- Node.js: Version 20.x or higher
- npm: Version 10.x or higher
- PostgreSQL: Local instance or managed PostgreSQL provider (e.g., Neon)
- Google Cloud Console: OAuth 2.0 Client ID and Secret (for Google Sign-In)

## Environment Variables

### Web Application (apps/web/.env.local)

- AUTH_SECRET: Random 32-byte hex string used by Auth.js to sign session cookies.
- AUTH_GOOGLE_ID: Google Cloud OAuth 2.0 client ID.
- AUTH_GOOGLE_SECRET: Google Cloud OAuth 2.0 client secret.
- API_ORIGIN: Base URL of the backend API (defaults to http://127.0.0.1:4000).

### Backend API (apps/api/.env)

- PORT: Port for the Express server (defaults to 4000).
- DATABASE_URL: PostgreSQL connection string with SSL configuration.
- SESSION_SECRET: Secret key for token hashing.
- APP_ORIGIN: Allowed frontend origin for CORS and CSRF headers (e.g., http://localhost:3000).

## Step-by-Step Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd <repository-directory>
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment files:
Create `apps/web/.env.local`:
```env
AUTH_SECRET=your_generated_secret_key
AUTH_GOOGLE_ID=your_google_client_id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your_google_client_secret
API_ORIGIN=http://127.0.0.1:4000
```

Create `apps/api/.env`:
```env
PORT=4000
DATABASE_URL=postgres://user:password@host/dbname?sslmode=require
APP_ORIGIN=http://localhost:3000
```

4. Run database migrations:
```bash
npm run migrate -w @proactive/api
```

5. Build all packages:
```bash
npm run build
```

6. Start the local development servers:
To launch both the API backend and Next.js frontend concurrently:
```bash
npm run dev
```

The web application runs on `http://localhost:3000` and the API listens on `http://127.0.0.1:4000`.