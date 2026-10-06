# 🚀 ProActive Quickstart Guide (For Friend)

Welcome! This is **ProActive** — a privacy-first, zero-knowledge Password Vault and Credential Security platform built with **Next.js (React 19)**, **Express**, and **PostgreSQL**.

---

## 🛠️ Prerequisites
- **Node.js**: v20 or v24+ (tested on Node 24)
- **PostgreSQL**: Local PostgreSQL or a Cloud DB (like Neon / Supabase)
- **npm** (included with Node.js)

---

## ⚡ Quick Start (Standard Developer Way)

### 1. Install Dependencies
In the root directory of the project, run:
```bash
npm install
```

### 2. Environment Setup
Check `.env` in the root folder. If it is not present, copy `.env.example`:
```bash
cp .env.example .env
```
Ensure `DATABASE_URL` points to your running PostgreSQL instance:
```env
DATABASE_URL=postgresql://<username>:<password>@127.0.0.1:5432/proactive
TEST_DATABASE_URL=postgresql://<username>:<password>@127.0.0.1:5432/proactive_test
APP_ORIGIN=http://localhost:3000
PORT=4000
```
*(Tip: If you don't have local Postgres installed, you can use a free cloud Postgres like [Neon.tech](https://neon.tech) and paste its connection URL into `DATABASE_URL`)*

### 3. Run Database Migrations
Create tables and schemas:
```bash
npm run db:migrate
```

### 4. Build the Project
Compile the shared libraries, API, and Next.js frontend:
```bash
npm run build
```

### 5. Start the Services

**Terminal 1: Start Backend API (Port 4000)**
```bash
npm run start:api
```

**Terminal 2: Start Frontend Web (Port 3000)**
```bash
npm run dev -w @proactive/web
# Or production mode:
# npm run start:web
```

Open your browser at **[http://localhost:3000](http://localhost:3000)**!

---

## 🪟 Windows PowerShell 1-Click Option
If you are on Windows, you can also use the included PowerShell automation scripts:
- **`.\SETUP_PROACTIVE.ps1`** - Automated verification and environment setup
- **`.\START_PROACTIVE.ps1`** - Starts background services and performs health check
- **`.\STOP_PROACTIVE.ps1`** - Gracefully shuts down all background processes

---

## 🔑 Demo Walkthrough
1. **Register** a new account (e.g., `test@demo.com` with a 12+ char password).
2. **Set Master Password** to derive client-side PBKDF2-SHA256 encryption keys.
3. **Vault Dashboard Features**:
   - Add new credentials with tags, TOTP secrets, notes.
   - Built-in Password Generator with custom entropy profiles.
   - Attack Graph visualizer (relationship between accounts & reuse risks).
   - Biometric WebAuthn passkey registration.
   - Master Password Rekeying with full client-side vault re-encryption.
   - Encrypted/Plaintext CSV Export & Import.
   - Local Security Audit & HaveIBeenPwned range check.

---

## 🧩 Chrome Extension (Zero-Knowledge Autofill)
1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top-right toggle.
3. Click **Load unpacked** and select the folder:
   `apps/extension`
4. Click or focus on any password field on any website (e.g. Parivaar Pro or login pages) to instantly see the inline **⚡ ProActive Strong Password & Autofill** card!
5. In the extension popup, use **⚡ Sync session from open Web App** to connect your active session seamlessly.

---

## 🧪 Running Tests
- **Unit Tests**: `npm run test`
- **Integration Tests**: `npm run test:integration`
- **Linting & Types**: `npm run lint` && `npm run typecheck`
