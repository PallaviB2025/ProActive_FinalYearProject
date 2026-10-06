"use client";

import { useRef, type FormEvent } from "react";
import { useVault } from "../../lib/vault-context";

export function UnlockCard() {
  const {
    metadata,
    busy,
    biometricsAvailable,
    biometricsEnrolled,
    hasActiveBioSession,
    openVaultWithPassword,
    fastBiometricUnlock,
  } = useVault();

  const secretForm = useRef<HTMLFormElement>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const master = String(data.get("master"));
    const confirmation = String(data.get("confirm") ?? "");
    form.reset();
    await openVaultWithPassword(master, confirmation);
  };

  return (
    <section className="bg-white border border-slate-200/80 rounded-2xl shadow-xl overflow-hidden max-w-xl mx-auto">
      {/* Header */}
      <div className="bg-slate-50/80 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${metadata ? "bg-amber-500 animate-pulse" : "bg-blue-500"}`}></span>
          <span className="sec-mono text-xs font-bold text-slate-700 uppercase tracking-wider">
            {metadata ? "Vault Locked" : "Initialize Master Vault"}
          </span>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
          metadata 
            ? "bg-amber-50 text-amber-700 border-amber-200" 
            : "bg-blue-50 text-blue-700 border-blue-200"
        }`}>
          {metadata ? "Encrypted" : "New Setup"}
        </span>
      </div>

      <div className="p-6 sm:p-8">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {metadata ? "Unlock your vault" : "Create Master Password"}
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {metadata
              ? "Enter your Master Password to derive the Key Encryption Key (KEK) and unwrap your vault in memory."
              : "Choose a strong, memorable Master Password. Because of zero-knowledge architecture, it cannot be recovered if lost."}
          </p>
        </div>

        {/* Security Parameters Details */}
        <details className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 mb-5 group">
          <summary className="text-[11px] font-mono font-bold text-blue-600 uppercase tracking-wider cursor-pointer list-none flex items-center justify-between">
            <span>Cryptographic Specifications</span>
            <span className="text-xs transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs mt-1 border-t border-slate-200/60">
            <div>
              <span className="text-slate-400 block text-[10px] font-mono">CIPHER</span>
              <span className="text-slate-800 font-mono font-semibold">AES-256-GCM</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-mono">DERIVATION</span>
              <span className="text-slate-800 font-mono font-semibold">PBKDF2-SHA256</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-mono">ITERATIONS</span>
              <span className="text-slate-800 font-mono font-semibold">600,000</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-mono">STATUS</span>
              <span className={`font-mono font-semibold ${metadata ? "text-amber-600" : "text-blue-600"}`}>
                {metadata ? "LOCKED" : "INITIAL"}
              </span>
            </div>
          </div>
        </details>

        {metadata && biometricsAvailable && biometricsEnrolled && (
          <div className="mb-5">
            {hasActiveBioSession ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void fastBiometricUnlock()}
                className="w-full py-2.5 px-4 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🛡️</span>
                <span>Fast Unlock with Windows Hello / Touch ID</span>
              </button>
            ) : (
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
                <span className="text-blue-600 text-base leading-none">🛡️</span>
                <span className="leading-relaxed">
                  Biometrics are enrolled. Unlock once with your Master Password to enable fast biometric unlock for this session.
                </span>
              </div>
            )}
            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400">
                {hasActiveBioSession ? "Or Master Password" : "Enter Master Password"}
              </span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>
          </div>
        )}

        <form ref={secretForm} onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
          <div>
            <label className="text-xs text-slate-700 font-semibold mb-1.5 block">
              Master Password
              <input
                name="master"
                type="password"
                autoComplete="off"
                required
                minLength={metadata ? 1 : 12}
                maxLength={1024}
                placeholder={metadata ? "Enter your Master Password" : "At least 12 characters"}
                className="w-full mt-1 bg-slate-50 border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </label>
          </div>

          {!metadata && (
            <div>
              <label className="text-xs text-slate-700 font-semibold mb-1.5 block">
                Confirm Master Password
                <input
                  name="confirm"
                  type="password"
                  autoComplete="off"
                  required
                  minLength={12}
                  maxLength={1024}
                  placeholder="Re-enter Master Password to confirm"
                  className="w-full mt-1 bg-slate-50 border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm shadow-blue-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer mt-2"
          >
            {busy
              ? "Decrypting Vault..."
              : metadata
              ? "Unlock Vault"
              : "Initialize & Encrypt Vault"}
          </button>
        </form>
      </div>
    </section>
  );
}
