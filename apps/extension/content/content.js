// ProActive Content Script — Google Password Manager Experience (Zero-Friction)
(() => {
  const HOSTNAME = window.location.hostname.replace(/^www\./, "");
  let activeDropdown = null;
  let activeInput = null;
  let currentSuggestion = "";

  const SHIELD_SVG = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  `;

  // React 18/19 synthetic event compatible setter
  function setNativeValue(element, value) {
    if (!element || value === undefined) return;
    const valueSetter = Object.getOwnPropertyDescriptor(element, "value")?.set;
    const protoSetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value")?.set;
    if (protoSetter && valueSetter !== protoSetter) protoSetter.call(element, value);
    else if (valueSetter) valueSetter.call(element, value);
    else element.value = value;
    ["input", "change", "blur"].forEach((evt) => element.dispatchEvent(new Event(evt, { bubbles: true, composed: true })));
  }

  function generateStrongPassword(length = 18) {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=";
    const values = new Uint32Array(length);
    crypto.getRandomValues(values);
    return Array.from(values, (v) => chars[v % chars.length]).join("");
  }

  function isUsernameField(el) {
    if (!el || el.tagName !== "INPUT" || el.type === "password" || el.type === "hidden" || el.type === "submit" || el.type === "checkbox") return false;
    const desc = `${el.type} ${el.name || ""} ${el.id || ""} ${el.autocomplete || ""} ${el.placeholder || ""}`.toLowerCase();
    return /email|user|login|account|ident/.test(desc);
  }

  function findUsernameInput(pwdInput) {
    const form = pwdInput.form || pwdInput.closest("form");
    if (form) {
      const inputs = Array.from(form.querySelectorAll("input:not([type='hidden']):not([type='password']):not([type='submit'])"));
      const userField = inputs.find(isUsernameField);
      if (userField) return userField;
      const idx = inputs.indexOf(pwdInput);
      return idx > 0 ? inputs[idx - 1] : (inputs[0] || null);
    }
    let prev = pwdInput.previousElementSibling;
    while (prev) {
      if (prev.tagName === "INPUT" && prev.type !== "password") return prev;
      prev = prev.previousElementSibling;
    }
    return document.querySelector("input[type='email'], input[name*='user'], input[name*='email'], input[placeholder*='email']");
  }

  function findPasswordInput(userInput) {
    const form = userInput.form || userInput.closest("form");
    return (form ? form.querySelector("input[type='password']") : null) || document.querySelector("input[type='password']");
  }

  function isVisible(el) {
    if (!el) return false;
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects()?.length);
  }

  function findConfirmPasswordInput(pwdInput) {
    const form = pwdInput.form || pwdInput.closest("form");
    if (!form) return null;
    const pwds = Array.from(form.querySelectorAll("input[type='password']")).filter(isVisible);
    const idx = pwds.indexOf(pwdInput);
    return (idx !== -1 && idx + 1 < pwds.length) ? pwds[idx + 1] : null;
  }

  function removeDropdown() {
    if (activeDropdown) { activeDropdown.remove(); activeDropdown = null; }
    activeInput = null;
  }

  function updatePosition() {
    if (!activeDropdown || !activeInput) return;
    const rect = activeInput.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      removeDropdown();
      return;
    }
    activeDropdown.style.top = `${rect.bottom + 4}px`;
    activeDropdown.style.left = `${Math.max(8, rect.left)}px`;
    activeDropdown.style.width = `${Math.max(rect.width, 310)}px`;
  }

  function normalizeHost(u) {
    if (!u) return "";
    try {
      let raw = u.trim().toLowerCase();
      if (!raw.startsWith("http://") && !raw.startsWith("https://")) raw = "https://" + raw;
      return new URL(raw).hostname.replace(/^www\./, "");
    } catch {
      return u.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].split(":")[0].toLowerCase();
    }
  }

  function domainMatches(savedSite, currentHost) {
    const s = normalizeHost(savedSite);
    const h = normalizeHost(currentHost);
    return !!(s && h && (s === h || h.endsWith("." + s) || s.endsWith("." + h)));
  }

  function isExtensionValid() {
    try {
      return Boolean(typeof chrome !== "undefined" && chrome?.runtime?.id);
    } catch {
      return false;
    }
  }

  async function getSavedSiteCredentials() {
    if (!isExtensionValid()) return { matches: [], vaultLocked: true };
    try {
      // SECURITY: Ask background.js for matching credentials from in-memory decrypted vault
      // Never read from chrome.storage.local — that would be plaintext
      return await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: "GET_MATCHING_CREDENTIALS", hostname: HOSTNAME },
          (res) => {
            if (chrome.runtime.lastError || !res) {
              resolve({ matches: [], vaultLocked: true });
              return;
            }
            resolve({ matches: res.matches || [], vaultLocked: !!res.vaultLocked });
          },
        );
      });
    } catch {
      return { matches: [], vaultLocked: true };
    }
  }

  async function saveSiteCredential(website, username, password) {
    if (!isExtensionValid()) return { ok: false, error: "Extension unavailable" };
    try {
      // SECURITY: Send credentials to background.js for encrypted save
      // Never write plaintext to chrome.storage.local
      return await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: "SAVE_CREDENTIAL", data: { website, username, password } },
          (res) => {
            if (chrome.runtime.lastError || !res) {
              resolve({ ok: false, error: "Extension communication failed" });
              return;
            }
            resolve(res);
          },
        );
      });
    } catch {
      return { ok: false, error: "Failed to save" };
    }
  }

  function isSignupContext(pwdInput) {
    if (!pwdInput) return false;
    const auto = (pwdInput.autocomplete || "").toLowerCase();
    if (auto === "new-password") return true;
    if (auto === "current-password") return false;
    const attr = `${pwdInput.name || ""} ${pwdInput.id || ""} ${pwdInput.placeholder || ""} ${pwdInput.getAttribute("aria-label") || ""}`.toLowerCase();
    if (/new|create|signup|register|set-pass|repeat|confirm/.test(attr)) return true;
    if (/current|old|login|signin/.test(attr)) return false;

    const container = pwdInput.form || pwdInput.closest("form") || pwdInput.closest("main") || pwdInput.parentElement;
    const activeTab = container?.querySelector?.("[aria-selected='true'], [aria-current='page'], [data-state='active'], button.active, [role='tab'].active");
    if (activeTab) {
      const t = (activeTab.innerText || "").toLowerCase();
      if (/sign\s*in|log\s*in/i.test(t)) return false;
      if (/sign\s*up|register|join/i.test(t)) return true;
    }

    const btns = Array.from(container ? container.querySelectorAll("button, input[type='submit']") : []).filter(isVisible);
    for (const b of btns) {
      const bt = (b.innerText || b.value || "").toLowerCase().trim();
      if (/sign\s*in|log\s*in/i.test(bt)) return false;
    }

    const conf = findConfirmPasswordInput(pwdInput);
    if (conf && isVisible(conf)) return true;

    for (const b of btns) {
      const bt = (b.innerText || b.value || "").toLowerCase().trim();
      if (/sign\s*up|register|create\s*(your\s*)?account|join/i.test(bt)) return true;
    }
    return false;
  }

  // 1. Password Field: Smart Autofill / Suggestion Dropdown
  function showSavedLoginsDropdown(targetInput, matches) {
    if (activeDropdown && activeInput === targetInput) return;
    removeDropdown();
    activeInput = targetInput;
    const rect = targetInput.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dropdown = document.createElement("div");
    dropdown.className = "proactive-autofill-dropdown";
    dropdown.style.top = `${rect.bottom + 4}px`;
    dropdown.style.left = `${Math.max(8, rect.left)}px`;
    dropdown.style.width = `${Math.max(rect.width, 310)}px`;
    dropdown.innerHTML = `
      <div class="proactive-dropdown-header">
        <div class="proactive-brand-title">
          <span class="proactive-shield-mini">${SHIELD_SVG}</span>
          <span>Saved Logins for ${escapeHtml(HOSTNAME)}</span>
        </div>
        <button type="button" class="proactive-dropdown-close">&times;</button>
      </div>
      <div id="proactive-user-items" class="proactive-items-list"></div>
    `;
    dropdown.querySelector(".proactive-dropdown-close")?.addEventListener("click", () => removeDropdown());

    const list = dropdown.querySelector("#proactive-user-items");
    matches.forEach((item) => {
      const row = document.createElement("div");
      row.className = "proactive-dropdown-item";
      row.innerHTML = `
        <div class="proactive-item-user">👤 ${escapeHtml(item.username)}</div>
        <div class="proactive-item-site">•••••••••••• • Click to autofill login</div>
      `;
      row.addEventListener("click", () => {
        const uInp = targetInput.type === "password" ? findUsernameInput(targetInput) : targetInput;
        const pInp = targetInput.type === "password" ? targetInput : findPasswordInput(targetInput);
        if (uInp && item.username) setNativeValue(uInp, item.username);
        if (pInp && item.password) {
          setNativeValue(pInp, item.password);
          const conf = findConfirmPasswordInput(pInp);
          if (conf) setNativeValue(conf, item.password);
        }
        removeDropdown();
        showNotice("✓ Login credentials filled!");
      });
      list.appendChild(row);
    });

    document.body.appendChild(dropdown);
    activeDropdown = dropdown;
  }

  // 1. Password Field: Smart Autofill / Suggestion Dropdown
  async function showPasswordDropdown(pwdInput) {
    const { matches } = await getSavedSiteCredentials();
    const isSignup = isSignupContext(pwdInput);

    if (!isSignup) {
      if (matches.length === 0) {
        if (activeDropdown && activeInput === pwdInput) removeDropdown();
        return;
      }
      showSavedLoginsDropdown(pwdInput, matches);
      return;
    }

    if (activeDropdown && activeInput === pwdInput) return;
    removeDropdown();
    activeInput = pwdInput;
    const rect = pwdInput.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    currentSuggestion = generateStrongPassword(18);
    const dropdown = document.createElement("div");
    dropdown.className = "proactive-autofill-dropdown";
    dropdown.style.top = `${rect.bottom + 4}px`;
    dropdown.style.left = `${Math.max(8, rect.left)}px`;
    dropdown.style.width = `${Math.max(rect.width, 310)}px`;
    dropdown.innerHTML = `
      <div class="proactive-dropdown-header">
        <div class="proactive-brand-title">
          <span class="proactive-shield-mini">${SHIELD_SVG}</span>
          <span>ProActive Password Assistant</span>
        </div>
        <button type="button" class="proactive-dropdown-close">&times;</button>
      </div>
      <div class="proactive-suggest-section">
        <div class="proactive-suggest-label">⚡ Suggest Strong Password</div>
        <div class="proactive-suggest-display">
          <span class="proactive-suggest-val" id="proactive-val">${currentSuggestion}</span>
          <button type="button" class="proactive-btn-regen" title="Generate another">↻</button>
        </div>
        <div class="proactive-suggest-meta">18 chars • High Entropy • AES-256 Ready</div>
        <button type="button" class="proactive-btn-use-suggest">⚡ Autofill Strong Password</button>
      </div>
    `;

    dropdown.querySelector(".proactive-dropdown-close")?.addEventListener("click", () => removeDropdown());
    dropdown.querySelector(".proactive-btn-regen")?.addEventListener("click", () => {
      currentSuggestion = generateStrongPassword(18);
      const valElem = dropdown.querySelector("#proactive-val");
      if (valElem) valElem.textContent = currentSuggestion;
    });
    dropdown.querySelector(".proactive-btn-use-suggest")?.addEventListener("click", () => {
      setNativeValue(pwdInput, currentSuggestion);
      const confirmInput = findConfirmPasswordInput(pwdInput);
      if (confirmInput) setNativeValue(confirmInput, currentSuggestion);
      navigator.clipboard.writeText(currentSuggestion).catch(() => {});
      removeDropdown();
      showNotice("✓ Strong password filled & copied to clipboard!");
    });

    document.body.appendChild(dropdown);
    activeDropdown = dropdown;
  }

  // 2. Email / Username Field: Instant Autofill Dropdown (ONLY if site has saved accounts)
  async function showUsernameDropdown(userInput) {
    const { matches } = await getSavedSiteCredentials();
    if (!matches || matches.length === 0) {
      if (activeDropdown && activeInput === userInput) removeDropdown();
      return;
    }
    showSavedLoginsDropdown(userInput, matches);
  }

  function showNotice(text) {
    const existing = document.querySelector(".proactive-toast-notice");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.className = "proactive-toast-notice";
    toast.textContent = text;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  // 3. Google Password Manager Save Prompt
  function showSavePrompt(website, username, password) {
    const existing = document.getElementById("proactive-save-banner");
    if (existing) existing.remove();

    const banner = document.createElement("div");
    banner.id = "proactive-save-banner";
    banner.className = "proactive-save-prompt";
    banner.innerHTML = `
      <div class="proactive-save-header">
        <div class="proactive-save-brand">
          <span class="proactive-shield-icon">${SHIELD_SVG}</span>
          <strong>ProActive Vault</strong>
        </div>
        <button type="button" class="proactive-close-btn">&times;</button>
      </div>
      <p class="proactive-save-desc">
        Save password for <strong class="proactive-highlight">${escapeHtml(website)}</strong>?
      </p>
      <div class="proactive-save-meta">
        <div>Site: <strong>${escapeHtml(website)}</strong></div>
        <div>Account: <strong>${escapeHtml(username || "(None)")}</strong></div>
        <div>Password: <strong>••••••••••••</strong></div>
      </div>
      <div class="proactive-save-actions">
        <button type="button" class="proactive-btn proactive-btn-secondary" id="proactive-save-never">Not now</button>
        <button type="button" class="proactive-btn proactive-btn-primary" id="proactive-save-confirm">💾 Save Password</button>
      </div>
    `;

    banner.querySelector(".proactive-close-btn")?.addEventListener("click", () => banner.remove());
    banner.querySelector("#proactive-save-never")?.addEventListener("click", () => banner.remove());
    banner.querySelector("#proactive-save-confirm")?.addEventListener("click", async () => {
      const result = await saveSiteCredential(website, username, password);
      if (result.ok) {
        banner.innerHTML = `<div class="proactive-save-success">✓ Encrypted & saved for ${escapeHtml(website)}!</div>`;
      } else if (result.vaultLocked) {
        banner.innerHTML = `<div class="proactive-save-success" style="background:#fef3c7;color:#92400e;">🔒 Vault locked — open ProActive extension to unlock, then try again.</div>`;
      } else {
        banner.innerHTML = `<div class="proactive-save-success" style="background:#fef2f2;color:#991b1b;">⚠ ${escapeHtml(result.error || "Save failed")}</div>`;
      }
      setTimeout(() => banner.remove(), 3500);
    });

    document.body.appendChild(banner);
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
  }

  // 4. Global Event Delegation
  document.addEventListener("focusin", (e) => {
    if (!isExtensionValid() || !e.target || e.target.tagName !== "INPUT") return;
    if (e.target.type === "password") showPasswordDropdown(e.target);
    else if (isUsernameField(e.target)) showUsernameDropdown(e.target);
  }, true);

  document.addEventListener("click", (e) => {
    if (!isExtensionValid()) return;
    const el = e.target;
    if (el?.tagName === "INPUT") {
      if (el.type === "password") showPasswordDropdown(el);
      else if (isUsernameField(el)) showUsernameDropdown(el);
      return;
    }
    if (activeDropdown && !activeDropdown.contains(el) && el !== activeInput) removeDropdown();
  }, true);

  document.addEventListener("keydown", (e) => {
    if (!isExtensionValid()) return;
    if (e.key === "Escape" && activeDropdown) removeDropdown();
  }, true);

  // Form submission capture: Ask user to save password (never silent save)
  document.addEventListener("submit", (e) => {
    if (!isExtensionValid() || !(e.target instanceof HTMLElement)) return;
    const pwdInput = e.target.querySelector("input[type='password']");
    if (!pwdInput || !pwdInput.value) return;
    const userInput = findUsernameInput(pwdInput);
    const username = userInput ? userInput.value.trim() : "";
    if (pwdInput.value) setTimeout(() => showSavePrompt(HOSTNAME, username, pwdInput.value), 500);
  }, true);

  window.addEventListener("scroll", updatePosition, { passive: true });
  window.addEventListener("resize", updatePosition, { passive: true });

  // 5. ProActive Web App <-> Extension Bridge
  // SECURITY: No plaintext credential data is sent via postMessage anymore.
  // The web app manages its own encrypted vault via the API independently.
  // Only vault status (locked/unlocked) is communicated.
  window.addEventListener("message", async (event) => {
    if (event.source !== window || !event.data || typeof event.data !== "object") return;
    if (!isExtensionValid()) return;
    const { type } = event.data;

    // Allow the web app to request current extension vault status (no credentials)
    if (type === "PROACTIVE_REQ_EXTENSION_STATUS") {
      chrome.runtime.sendMessage({ type: "GET_STATUS" }, (res) => {
        if (chrome.runtime.lastError) return;
        window.postMessage({
          type: "PROACTIVE_RES_EXTENSION_STATUS",
          unlocked: !!res?.unlocked,
          authenticated: !!res?.authenticated,
        }, "*");
      });
    }
  });
})();
