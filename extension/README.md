# 🛡️ ProActive Chrome & Web Extension (Manifest V3)

A zero-knowledge password manager extension that adds **intelligent autofill**, **automatic password saving**, and **quick password generation** directly in your browser.

---

## 🚀 How to Install in Chrome / Edge / Brave

1. Open **Google Chrome** (or any Chromium browser like Brave, Edge, Opera).
2. Go to the extensions management page:
   ```
   chrome://extensions
   ```
3. Enable **Developer mode** toggle in the top-right corner.
4. Click the **"Load unpacked"** button in the top-left corner.
5. Select this folder:
   ```
   d:\Mera kaam\ProActive_FINAL_BACKUP_18-09-2026\ProActive_FINAL_BACKUP_18-09-2026\ProActive_FINAL_BACKUP_18-09-2026\proactive\apps\extension
   ```
6. The **ProActive** shield icon will appear in your browser toolbar! (Click the puzzle piece icon 🧩 and pin ProActive to your toolbar).

---

## ⚡ How It Works

### 1. Unlock Vault
Click the ProActive icon in the toolbar, enter your Master Password, and click **Unlock Vault**.
The extension derives the AES-256 vault key in memory for this browser session.

### 2. Intelligent 1-Click Autofill
- When you visit any website with a login form (e.g. GitHub, Google, Twitter, or local app), ProActive detects the password field and attaches a subtle **ProActive Shield icon**.
- Click the shield or open the popup to see matching credentials for that domain.
- Click **"Autofill"** — username and password fill instantly without copy-pasting!

### 3. Automatic Save Prompt
- When you log into a new site or register an account, ProActive intercepts the form submission.
- A floating banner asks: *"Save password for [website] to your encrypted vault?"*
- Click **"Save to Vault"** — the credential is encrypted using AES-256-GCM and saved directly into your ProActive vault!

### 4. Zero-Knowledge Security
- Uses pure native `crypto.subtle` (PBKDF2-SHA256 600,000 iterations + AES-256-GCM).
- Master passwords and raw vault keys never touch the web page.
- Domain-isolated matching protects against phishing.
