"use client";

import React, { useRef, useState, type FormEvent } from "react";
import type { Credential } from "@proactive/shared";
import { useVault } from "../../lib/vault-context";
import { generatePassword } from "../../lib/generator";
import { PasswordCsvImport } from "./PasswordCsvImport";

export function CredentialEditor() {
  const {
    editing,
    formType,
    setFormType,
    setEditing,
    busy,
    saveCredential,
    importCredentials,
    items,
    user,
  } = useVault();

  const formRef = useRef<HTMLFormElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState(editing?.password || "");
  const [websiteValue, setWebsiteValue] = useState(editing?.website || "");
  const [usernameValue, setUsernameValue] = useState(editing?.username || user?.email || "");
  const [totpValue, setTotpValue] = useState(editing?.totpSecret || "");
  const [showImport, setShowImport] = useState(false);

  // Sync state if editing item changes
  React.useEffect(() => {
    if (editing) {
      setPasswordValue(editing.password || "");
      setWebsiteValue(editing.website || "");
      setUsernameValue(editing.username || "");
      setTotpValue(editing.totpSecret || "");
    }
  }, [editing]);

  const handleGenerate = () => {
    const generated = generatePassword({
      length: 18,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
    });
    setPasswordValue(generated);
    setShowPassword(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    const value: Credential = {
      type: editing ? (editing.type || formType) : formType,
      website: String(data.get("website") || (formType === "note" ? "Secure Note" : "Card")),
      username: String(data.get("username") || ""),
      password: String(data.get("credential-password") || ""),
      totpSecret: String(data.get("totp-secret") || "").trim() || undefined,
      note: String(data.get("note") || "").trim() || undefined,
      cardholder: String(data.get("cardholder") || "").trim() || undefined,
      cardNumber: String(data.get("card-number") || "").trim() || undefined,
      cardExpiry: String(data.get("card-expiry") || "").trim() || undefined,
      cardCvv: String(data.get("card-cvv") || "").trim() || undefined,
    };

    await saveCredential(value, form);
    if (!editing) {
      setPasswordValue("");
      setWebsiteValue("");
      setTotpValue("");
    }
  };

  return (
    <div id="new-credential-form" className="bg-[#f8fafc] border border-slate-200/90 rounded-2xl p-6 shadow-xs">
      {/* Header with Title and Type Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            {editing ? "Edit Credential" : "Add a New Credential"}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Everything you add is encrypted before it leaves your browser.
          </p>
        </div>

        {/* Type Toggle Tabs */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFormType("login")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              formType === "login"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setFormType("note")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              formType === "note"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Note
          </button>
          <button
            type="button"
            onClick={() => setFormType("card")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              formType === "card"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Card
          </button>
        </div>
      </div>

      {/* Form */}
      <form
        key={`${editing?.id ?? "new"}-${formType}`}
        ref={formRef}
        onSubmit={handleSubmit}
        autoComplete="off"
        className="space-y-4"
      >
        {formType === "login" && (
          <>
            {/* 3-column row for Website, Username, Password */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Field 1: Website */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Website
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400 pointer-events-none">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                  </span>
                  <input
                    name="website"
                    required
                    value={websiteValue}
                    onChange={(e) => setWebsiteValue(e.target.value)}
                    placeholder="e.g. cloud.example.com"
                    className="w-full bg-slate-50 border border-slate-200/90 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              {/* Field 2: Username / Email */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Username / Email
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400 pointer-events-none">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    name="username"
                    required
                    value={usernameValue}
                    onChange={(e) => setUsernameValue(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-slate-50 border border-slate-200/90 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              {/* Field 3: Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 block m-0">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Generate
                  </button>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400 pointer-events-none">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    name="credential-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={passwordValue}
                    onChange={(e) => setPasswordValue(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-50 border border-slate-200/90 rounded-xl pl-9 pr-10 py-2.5 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                    className="absolute right-3 text-slate-400 hover:text-slate-600"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {showPassword ? (
                        <>
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                          <line x1="2" y1="2" x2="22" y2="22" />
                        </>
                      ) : (
                        <>
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* 2FA Authenticator Key (TOTP) Input */}
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <span>2FA Authenticator Key (TOTP)</span>
                <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  Optional
                </span>
                <span title="Base32 TOTP secret key for 6-digit rolling codes" className="text-slate-400 cursor-help">
                  ⓘ
                </span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-slate-400 pointer-events-none">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="7.5" cy="15.5" r="5.5" />
                    <path d="m21 2-9.6 9.6" />
                    <path d="m15.5 7.5 3 3L22 7l-3-3" />
                  </svg>
                </span>
                <input
                  name="totp-secret"
                  value={totpValue}
                  onChange={(e) => setTotpValue(e.target.value)}
                  placeholder="e.g. JBSWY3DPEHPK3PXP (Base32)"
                  className="w-full bg-slate-50 border border-slate-200/90 rounded-xl pl-9 pr-3 py-2.5 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>
          </>
        )}

        {formType === "note" && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                Note Title / Identifier
              </label>
              <input
                name="website"
                defaultValue={editing?.website || "Secure Note"}
                required
                placeholder="e.g. Wi-Fi Password, Server Recovery Key…"
                className="w-full bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-2.5 text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                Encrypted Note Content
              </label>
              <textarea
                name="note"
                defaultValue={editing?.note || ""}
                rows={4}
                required
                placeholder="Write sensitive notes, recovery phrases, or private keys…"
                className="w-full bg-slate-50 border border-slate-200/90 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {formType === "card" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Cardholder Name</label>
              <input
                name="cardholder"
                defaultValue={editing?.cardholder || ""}
                required
                placeholder="Name on card"
                className="w-full bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Card Number</label>
              <input
                name="card-number"
                defaultValue={editing?.cardNumber || ""}
                required
                placeholder="•••• •••• •••• ••••"
                className="w-full bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Expiry</label>
              <input
                name="card-expiry"
                defaultValue={editing?.cardExpiry || ""}
                required
                placeholder="MM/YY"
                className="w-full bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">CVV</label>
              <input
                name="card-cvv"
                defaultValue={editing?.cardCvv || ""}
                required
                type="password"
                maxLength={4}
                placeholder="•••"
                className="w-full bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-2 text-xs font-mono"
              />
            </div>
          </div>
        )}

        {/* Action Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={busy}
              className="py-2.5 px-5 rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-sm shadow-blue-700/20"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>{busy ? "Saving…" : editing ? "Update Credential" : "Save Credential"}</span>
            </button>

            {editing && (
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Zero-knowledge AES-256 encryption</span>
            <span className="text-slate-300 cursor-help" title="Data is encrypted on your device before sending to server">
              (?)
            </span>
          </div>
        </div>
      </form>

      {/* CSV Import Toggle */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-500">Bring in existing passwords</span>
        <button
          type="button"
          onClick={() => setShowImport(!showImport)}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          {showImport ? "Hide Import" : "Import Passwords"}
        </button>
      </div>

      {showImport && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <PasswordCsvImport
            existing={items}
            busy={busy}
            onImport={async (imported) => {
              const ok = await importCredentials(imported);
              if (ok) setShowImport(false);
              return ok;
            }}
          />
        </div>
      )}
    </div>
  );
}
