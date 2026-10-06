// ProActive Extension Popup Controller
let currentHostname = "";
let currentTabId = null;

// UI References
const viewSignin = document.getElementById("view-signin");
const viewLocked = document.getElementById("view-locked");
const viewUnlocked = document.getElementById("view-unlocked");
const statusBadge = document.getElementById("vault-status-badge");
const feedbackMsg = document.getElementById("feedback-msg");

// Sign In Elements
const signinForm = document.getElementById("signin-form");
const signinEmail = document.getElementById("signin-email");
const signinPassword = document.getElementById("signin-password");
const signinBtn = document.getElementById("signin-btn");
const signinSpinner = document.getElementById("signin-spinner");
const syncSessionBtn = document.getElementById("sync-session-btn");
const switchAccountBtn = document.getElementById("switch-account-btn");

// Unlock Elements
const unlockForm = document.getElementById("unlock-form");
const masterPasswordInput = document.getElementById("master-password");
const unlockBtn = document.getElementById("unlock-btn");
const unlockSpinner = document.getElementById("unlock-spinner");
const lockBtn = document.getElementById("lock-btn");

// Vault Info
const currentDomainElem = document.getElementById("current-domain");
const matchCountElem = document.getElementById("match-count");
const matchingListElem = document.getElementById("matching-list");

// Generator
const genPasswordElem = document.getElementById("gen-password");
const genBtn = document.getElementById("gen-btn");
const copyGenBtn = document.getElementById("copy-gen-btn");
const fillGenBtn = document.getElementById("fill-gen-btn");

function showMessage(text, isError = false) {
  feedbackMsg.textContent = text;
  feedbackMsg.className = `feedback-msg ${isError ? "error" : ""}`;
  feedbackMsg.classList.remove("hidden");
  setTimeout(() => feedbackMsg.classList.add("hidden"), 5000);
}

function showView(view) {
  viewSignin.classList.add("hidden");
  viewLocked.classList.add("hidden");
  viewUnlocked.classList.add("hidden");

  if (view === "signin") {
    viewSignin.classList.remove("hidden");
    statusBadge.textContent = "Sign In";
    statusBadge.className = "status-badge status-locked";
    signinEmail.focus();
  } else if (view === "locked") {
    viewLocked.classList.remove("hidden");
    statusBadge.textContent = "Locked";
    statusBadge.className = "status-badge status-locked";
    masterPasswordInput.focus();
  } else if (view === "unlocked") {
    viewUnlocked.classList.remove("hidden");
    statusBadge.textContent = "Unlocked";
    statusBadge.className = "status-badge status-unlocked";
    loadMatchingCredentials();
  }
}

async function init() {
  // Query active tab domain
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      const url = new URL(tab.url);
      currentHostname = url.hostname;
      currentTabId = tab.id;
      currentDomainElem.textContent = currentHostname;
    }
  } catch {
    currentHostname = "";
    currentDomainElem.textContent = "Browser Tab";
  }

  // Generate an instant password immediately
  generatePassword();

  // Check stored credentials / session
  const stored = await chrome.storage.local.get(["proactiveSessionToken", "proactiveUserEmail"]);
  if (stored.proactiveUserEmail && !signinEmail.value) {
    signinEmail.value = stored.proactiveUserEmail;
  }

  // Check vault status
  chrome.runtime.sendMessage({ type: "GET_STATUS" }, (res) => {
    if (res?.unlocked) {
      showView("unlocked");
    } else if (res?.authenticated || stored.proactiveSessionToken) {
      showView("locked");
    } else {
      showView("signin");
    }
  });
}

// Direct Sign In Submission
signinForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = signinEmail.value.trim();
  const password = signinPassword.value;
  if (!email || !password) return;

  signinSpinner.classList.remove("hidden");
  signinBtn.disabled = true;

  try {
    const res = await fetch("http://127.0.0.1:4000/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Proactive-CSRF": "1",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.error || `Login failed with HTTP ${res.status}`);
    }

    if (data?.token) {
      await chrome.storage.local.set({
        proactiveSessionToken: data.token,
        proactiveUserEmail: data.email || email,
      });
    }

    chrome.runtime.sendMessage({
      type: "LOGIN_ACCOUNT",
      email,
      password,
      token: data?.token,
    }).catch(() => {});

    showMessage("✓ Account connected! Now enter Master Password.");
    showView("locked");
  } catch (err) {
    showMessage(err.message || "Invalid account email or password", true);
  } finally {
    signinSpinner.classList.add("hidden");
    signinBtn.disabled = false;
  }
});

// Sync session from open web tab
syncSessionBtn.addEventListener("click", async () => {
  try {
    const urls = [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:4000",
      "http://localhost:4000",
    ];

    let candidateToken = null;
    if (chrome.cookies) {
      for (const u of urls) {
        const c = await chrome.cookies.get({ url: u, name: "proactive_session" }).catch(() => null);
        if (c?.value && /^[a-f0-9]{64}$/.test(c.value)) {
          candidateToken = c.value;
          break;
        }
      }
      if (!candidateToken) {
        const all = await chrome.cookies.getAll({ name: "proactive_session" }).catch(() => []);
        const valid = all.find((c) => /^[a-f0-9]{64}$/.test(c.value));
        if (valid) candidateToken = valid.value;
      }
    }

    if (!candidateToken) {
      const stored = await chrome.storage.local.get(["proactiveSessionToken"]);
      if (stored.proactiveSessionToken) candidateToken = stored.proactiveSessionToken;
    }

    if (candidateToken) {
      const testRes = await fetch("http://127.0.0.1:4000/auth/me", {
        headers: { Authorization: `Bearer ${candidateToken}` },
      }).catch(() => null);

      if (testRes && testRes.ok) {
        const userData = await testRes.json();
        await chrome.storage.local.set({
          proactiveSessionToken: candidateToken,
          proactiveUserEmail: userData.email,
        });
        chrome.runtime.sendMessage({ type: "SYNC_SESSION", token: candidateToken }).catch(() => {});
        showMessage("✓ Connected to web session (" + userData.email + ")!");
        showView("locked");
        return;
      }
    }

    showMessage("No active session found on ProActive Web. Please sign in below.", true);
  } catch (err) {
    showMessage("Sync error: " + (err.message || "Could not connect"), true);
  }
});

switchAccountBtn.addEventListener("click", async () => {
  await chrome.storage.local.remove(["proactiveSessionToken"]);
  chrome.runtime.sendMessage({ type: "LOGOUT_ACCOUNT" }).catch(() => {});
  showView("signin");
});

// Unlock Vault Submission
unlockForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const masterPassword = masterPasswordInput.value;
  if (!masterPassword) return;

  unlockSpinner.classList.remove("hidden");
  unlockBtn.disabled = true;

  const stored = await chrome.storage.local.get(["proactiveSessionToken"]);
  const token = stored.proactiveSessionToken || null;

  chrome.runtime.sendMessage(
    { type: "UNLOCK_VAULT", masterPassword, token },
    (res) => {
      unlockSpinner.classList.add("hidden");
      unlockBtn.disabled = false;

      if (res?.ok) {
        showMessage("✓ Vault unlocked! Credentials ready for autofill.");
        showView("unlocked");
      } else {
        if (res?.error?.includes("Authentication required")) {
          showMessage("Session expired. Please sign in with your email first.", true);
          showView("signin");
        } else {
          showMessage(res?.error || "Wrong Master Password", true);
        }
      }
    }
  );
});

// Lock Vault
lockBtn?.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "LOCK_VAULT" }, () => {
    showView("locked");
  });
});

// Load matching logins for active tab
function loadMatchingCredentials() {
  matchingListElem.innerHTML = `<div class="empty-state">Searching vault…</div>`;

  chrome.runtime.sendMessage(
    { type: "GET_MATCHING_CREDENTIALS", hostname: currentHostname },
    (res) => {
      if (!res?.ok || !res.matches || res.matches.length === 0) {
        matchCountElem.textContent = "0";
        matchingListElem.innerHTML = `<div class="empty-state">No saved logins for this website.</div>`;
        return;
      }

      matchCountElem.textContent = String(res.matches.length);
      matchingListElem.innerHTML = "";

      res.matches.forEach((item) => {
        const card = document.createElement("div");
        card.className = "cred-card";
        card.innerHTML = `
          <div class="cred-info">
            <span class="cred-username" title="${escapeHtml(item.username)}">${escapeHtml(item.username || "Saved Login")}</span>
            <span class="cred-site">${escapeHtml(item.website)}</span>
          </div>
          <div class="cred-actions">
            <button type="button" class="btn-action btn-fill" data-id="${item.id}">Autofill</button>
            <button type="button" class="btn-action" data-copy="pass" data-val="${escapeHtml(item.password)}">Key</button>
            <button type="button" class="btn-action" data-copy="user" data-val="${escapeHtml(item.username)}">User</button>
          </div>
        `;

        card.querySelector(".btn-fill")?.addEventListener("click", () => {
          fillIntoActiveTab(item.username, item.password);
        });

        card.querySelectorAll("[data-copy]").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            const val = e.currentTarget.getAttribute("data-val");
            if (val) {
              navigator.clipboard.writeText(val);
              const original = e.currentTarget.textContent;
              e.currentTarget.textContent = "✓";
              setTimeout(() => (e.currentTarget.textContent = original), 1500);
            }
          });
        });

        matchingListElem.appendChild(card);
      });
    }
  );
}

async function fillIntoActiveTab(username, password) {
  if (!currentTabId) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: currentTabId },
      func: (user, pass) => {
        function setVal(el, val) {
          if (!el || val === undefined) return;
          const setter = Object.getOwnPropertyDescriptor(el, "value")?.set;
          const proto = Object.getPrototypeOf(el);
          const protoSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
          if (protoSetter && setter !== protoSetter) protoSetter.call(el, val);
          else if (setter) setter.call(el, val);
          else el.value = val;
          el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
          el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
        }

        const pwdInputs = Array.from(document.querySelectorAll("input[type='password']"));
        if (pwdInputs.length === 0) return false;

        const pwdInput = pwdInputs[0];
        let userInput = null;

        if (pwdInput.form) {
          const inputs = Array.from(pwdInput.form.querySelectorAll("input:not([type='hidden']):not([type='password'])"));
          userInput = inputs.find((i) => /user|email|login|id/i.test(i.name || i.id || i.type)) || inputs[0];
        }

        if (userInput && user) {
          setVal(userInput, user);
        }

        if (pwdInput && pass) {
          setVal(pwdInput, pass);
          if (pwdInputs.length > 1) {
            setVal(pwdInputs[1], pass);
          }
        }

        return true;
      },
      args: [username, password],
    });

    showMessage("✓ Filled directly into page!");
  } catch {
    showMessage("Could not autofill: page may be restricted.", true);
  }
}

// Password Generator
function generatePassword() {
  chrome.runtime.sendMessage({ type: "GENERATE_PASSWORD", length: 18 }, (res) => {
    if (res?.ok) {
      genPasswordElem.textContent = res.password;
    }
  });
}

genBtn.addEventListener("click", generatePassword);

copyGenBtn.addEventListener("click", () => {
  const pwd = genPasswordElem.textContent;
  if (pwd && pwd !== "Generating…") {
    navigator.clipboard.writeText(pwd);
    copyGenBtn.textContent = "Copied!";
    setTimeout(() => (copyGenBtn.textContent = "Copy"), 1500);
  }
});

fillGenBtn?.addEventListener("click", () => {
  const pwd = genPasswordElem.textContent;
  if (pwd && pwd !== "Generating…") {
    fillIntoActiveTab(null, pwd);
  }
});

function escapeHtml(str) {
  return String(str || "").replace(/[&<>'"]/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[c]));
}

init();
