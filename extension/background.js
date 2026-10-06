// ProActive Extension Background Service Worker (MV3)
import {
  unlockVault,
  decryptCredential,
  encryptCredential,
} from "./crypto.js";

let vaultKey = null;
let decryptedVault = [];
let vaultMetadata = null;
let apiBaseUrl = "http://127.0.0.1:4000";
let sessionToken = null;

// Initialize settings and session from local storage
chrome.storage.local.get(["proactiveApiUrl", "proactiveSessionToken"], (res) => {
  if (res.proactiveApiUrl) apiBaseUrl = res.proactiveApiUrl;
  if (res.proactiveSessionToken) sessionToken = res.proactiveSessionToken;
});

// SECURITY: Purge any legacy plaintext credential cache from older versions
chrome.storage.local.remove("proactive_site_credentials");

chrome.storage.onChanged.addListener((changes) => {
  if (changes.proactiveApiUrl) apiBaseUrl = changes.proactiveApiUrl.newValue;
  if (changes.proactiveSessionToken) sessionToken = changes.proactiveSessionToken.newValue || null;
});

// Auto-inject content script into open tabs on extension install/update
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
    for (const tab of tabs) {
      if (tab.id) {
        chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content/content.js"] }).catch(() => {});
        chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ["content/content.css"] }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn("Auto-inject notice:", err);
  }
});

// Sync session from cookies across web app (localhost:3000) and API (127.0.0.1:4000)
async function syncSessionCookies() {
  if (!chrome.cookies) return false;
  try {
    const urls = ["http://localhost:3000", "http://127.0.0.1:3000", "http://127.0.0.1:4000", "http://localhost:4000"];
    let candidateToken = null;
    for (const u of urls) {
      const c = await chrome.cookies.get({ url: u, name: "proactive_session" }).catch(() => null);
      if (c?.value && /^[a-f0-9]{64}$/.test(c.value)) {
        candidateToken = c.value;
        break;
      }
    }
    if (!candidateToken) {
      const allCookies = await chrome.cookies.getAll({ name: "proactive_session" }).catch(() => []);
      const valid = allCookies.find((c) => /^[a-f0-9]{64}$/.test(c.value));
      if (valid) candidateToken = valid.value;
    }
    if (candidateToken) {
      const testRes = await fetch(`${apiBaseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${candidateToken}`, "X-Proactive-CSRF": "1" },
      }).catch(() => null);
      if (testRes && testRes.ok) {
        sessionToken = candidateToken;
        await chrome.storage.local.set({ proactiveSessionToken: sessionToken });
        return true;
      }
    }
  } catch (err) {
    console.warn("Session sync notice:", err);
  }
  return false;
}

async function apiRequest(path, method = "GET", body = null) {
  const headers = {};
  if (method !== "GET" && method !== "HEAD") headers["X-Proactive-CSRF"] = "1";
  if (body) headers["Content-Type"] = "application/json";
  if (sessionToken) headers["Authorization"] = `Bearer ${sessionToken}`;

  const res = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && path !== "/auth/login") {
      sessionToken = null;
      await chrome.storage.local.remove("proactiveSessionToken");
    }
    throw new Error(data?.error || `Request failed with HTTP ${res.status}`);
  }
  return data;
}

function normalizeDomain(urlOrHost) {
  if (!urlOrHost) return "";
  try {
    let raw = urlOrHost.trim().toLowerCase();
    if (!raw.startsWith("http://") && !raw.startsWith("https://")) raw = "https://" + raw;
    return new URL(raw).hostname.replace(/^www\./, "");
  } catch {
    return urlOrHost.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
  }
}

function matchesDomain(credWebsite, currentHost) {
  if (!credWebsite || !currentHost) return false;
  const c = normalizeDomain(credWebsite);
  const h = normalizeDomain(currentHost);
  return c === h || h.endsWith("." + c) || c.endsWith("." + h);
}

// Universal Message Dispatcher
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      const type = (request?.type || request?.action || "").toUpperCase();

      switch (type) {
        case "GET_STATUS": {
          if (!sessionToken) await syncSessionCookies();
          let authenticated = false;
          let user = null;
          try {
            user = await apiRequest("/auth/me");
            authenticated = true;
          } catch {
            const synced = await syncSessionCookies();
            if (synced) {
              try {
                user = await apiRequest("/auth/me");
                authenticated = true;
              } catch {
                authenticated = false;
              }
            }
          }
          sendResponse({
            ok: true,
            apiUrl: apiBaseUrl,
            authenticated: authenticated || !!sessionToken,
            user,
            unlocked: !!vaultKey,
            itemCount: decryptedVault.length,
          });
          break;
        }

        case "SYNC_SESSION": {
          if (request.token) {
            sessionToken = request.token;
            await chrome.storage.local.set({ proactiveSessionToken: sessionToken });
            sendResponse({ ok: true });
            break;
          }
          const synced = await syncSessionCookies();
          if (synced) {
            const user = await apiRequest("/auth/me");
            sendResponse({ ok: true, user });
          } else {
            sendResponse({ ok: false, error: "No active web session found. Please sign in below." });
          }
          break;
        }

        case "LOGIN_ACCOUNT":
        case "LOGIN": {
          const { email, password, token } = request;
          if (token) {
            sessionToken = token;
            await chrome.storage.local.set({ proactiveSessionToken: sessionToken });
            sendResponse({ ok: true });
            break;
          }
          const userRes = await apiRequest("/auth/login", "POST", { email, password });
          if (userRes?.token) {
            sessionToken = userRes.token;
            await chrome.storage.local.set({ proactiveSessionToken: sessionToken, proactiveUserEmail: userRes.email });
          }
          sendResponse({ ok: true, user: userRes });
          break;
        }

        case "LOGOUT_ACCOUNT":
        case "LOGOUT": {
          try { await apiRequest("/auth/logout", "POST"); } catch {}
          sessionToken = null;
          vaultKey = null;
          decryptedVault = [];
          vaultMetadata = null;
          await chrome.storage.local.remove(["proactiveSessionToken", "proactiveVaultUnlocked", "proactive_site_credentials"]);
          sendResponse({ ok: true });
          break;
        }

        case "UNLOCK_VAULT":
        case "UNLOCK": {
          const { masterPassword, token } = request;
          if (token && !sessionToken) {
            sessionToken = token;
            await chrome.storage.local.set({ proactiveSessionToken: sessionToken });
          } else if (!sessionToken) {
            const stored = await chrome.storage.local.get(["proactiveSessionToken"]);
            if (stored.proactiveSessionToken) sessionToken = stored.proactiveSessionToken;
          }

          if (!masterPassword) {
            sendResponse({ ok: false, error: "Master Password required" });
            return;
          }

          const vaultRes = await apiRequest("/vault");
          if (!vaultRes || !vaultRes.metadata) {
            sendResponse({ ok: false, error: "Vault not initialized. Please set up your vault in ProActive Web first." });
            return;
          }

          vaultMetadata = vaultRes.metadata;
          const key = await unlockVault(masterPassword, vaultMetadata);
          vaultKey = key;

          const rawCreds = await apiRequest("/credentials");
          const items = [];
          for (const cred of rawCreds) {
            try {
              const decrypted = await decryptCredential(key, cred.id, cred.payload);
              items.push({ id: cred.id, ...decrypted });
            } catch (decErr) {
              console.warn("Could not decrypt item:", cred.id, decErr);
            }
          }

          decryptedVault = items;

          // SECURITY: Credentials live only in-memory (decryptedVault).
          // No plaintext is ever written to chrome.storage.local.
          // Purge any legacy plaintext cache from older versions.
          await chrome.storage.local.remove("proactive_site_credentials");
          await chrome.storage.local.set({ proactiveVaultUnlocked: true });

          sendResponse({ ok: true, count: items.length });
          break;
        }

        case "LOCK_VAULT":
        case "LOCK": {
          vaultKey = null;
          decryptedVault = [];
          vaultMetadata = null;
          // SECURITY: Wipe any plaintext cache AND mark vault as locked
          await chrome.storage.local.remove("proactive_site_credentials");
          await chrome.storage.local.set({ proactiveVaultUnlocked: false });
          sendResponse({ ok: true });
          break;
        }

        case "GET_MATCHING_CREDENTIALS":
        case "GET_CREDENTIALS": {
          const host = request.hostname || (sender.tab?.url ? new URL(sender.tab.url).hostname : "");
          // SECURITY: Only serve credentials from in-memory decrypted vault
          // Never read from chrome.storage.local — that would be plaintext
          if (!vaultKey || decryptedVault.length === 0) {
            sendResponse({ ok: true, matches: [], vaultLocked: !vaultKey });
            break;
          }
          const matches = decryptedVault.filter((item) => matchesDomain(item.website, host));
          // Deduplicate
          const unique = [];
          const seen = new Set();
          for (const m of matches) {
            const k = `${m.website}:${m.username}`;
            if (!seen.has(k)) {
              seen.add(k);
              unique.push({ website: m.website, username: m.username, password: m.password });
            }
          }
          sendResponse({ ok: true, matches: unique });
          break;
        }

        case "SAVE_CREDENTIAL":
        case "SAVE": {
          const { website, username, password, note } = request.data || request;
          // SECURITY: Require vault to be unlocked — encrypt first or reject
          // NEVER store plaintext credentials in chrome.storage.local
          if (!vaultKey) {
            sendResponse({
              ok: false,
              error: "Vault is locked. Please unlock your vault in the extension popup before saving credentials.",
              vaultLocked: true,
            });
            break;
          }
          try {
            const id = crypto.randomUUID();
            const credData = {
              website: website || "",
              username: username || "",
              password: password || "",
              type: "login",
              ...(note ? { note } : {}),
            };
            const payload = await encryptCredential(vaultKey, id, credData);
            await apiRequest("/credentials", "POST", { id, payload });
            decryptedVault.push({ id, ...credData });
            sendResponse({ ok: true, item: { id, website, username } });
          } catch (err) {
            sendResponse({ ok: false, error: err.message || "Failed to encrypt and save credential" });
          }
          break;
        }

        case "GENERATE_PASSWORD":
        case "GENERATE": {
          const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=";
          const length = request.length || 18;
          const randomValues = new Uint32Array(length);
          crypto.getRandomValues(randomValues);
          let generated = "";
          for (let i = 0; i < length; i++) generated += chars[randomValues[i] % chars.length];
          sendResponse({ ok: true, password: generated });
          break;
        }

        default:
          sendResponse({ ok: false, error: `Action '${type}' not recognized` });
      }
    } catch (error) {
      sendResponse({ ok: false, error: error.message || "Internal error" });
    }
  })();

  return true;
});
