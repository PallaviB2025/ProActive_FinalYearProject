"use client";

import { useVault } from "../../lib/vault-context";

interface VaultHeaderProps {
  onOpenSettings?: () => void;
}

export function VaultHeader({ onOpenSettings }: VaultHeaderProps = {}) {
  const {
    user,
    unlocked,
    busy,
    biometricsAvailable,
    biometricsEnrolled,
    toggleBiometrics,
    broadcastLock,
    logout,
  } = useVault();

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-200/80">
      <div>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white font-black text-xl flex items-center justify-center shadow-md shadow-blue-500/25 flex-none"
            aria-hidden="true"
          >
            P
          </div>
          <div>
            <span className="block text-[10px] font-bold tracking-wider text-blue-600 uppercase font-mono">
              Personal Security Desk
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">
              ProActive
            </h1>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-1">A private zero-knowledge workspace for the credentials you rely on.</p>
      </div>
      {user && (
        <div className="flex items-center gap-3">
          <span className="max-w-[200px] truncate text-xs font-mono text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            {user.email}
          </span>
          {unlocked && biometricsAvailable && (
            <button
              type="button"
              onClick={() => void toggleBiometrics()}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold hidden md:flex items-center gap-1.5 transition-all cursor-pointer"
              title={biometricsEnrolled ? "Disable Windows Hello / Touch ID" : "Enable Windows Hello / Touch ID"}
            >
              <span>{biometricsEnrolled ? "✓ Biometrics Active" : "Enable Biometrics"}</span>
            </button>
          )}
          <div className="flex gap-2">
            {unlocked && onOpenSettings && (
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                onClick={onOpenSettings}
                title="Settings & Export"
              >
                Settings
              </button>
            )}
            <button
              type="button"
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
              onClick={() => broadcastLock(false)}
            >
              Lock
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-bold transition-all cursor-pointer"
              style={{ color: "#b91c1c" }}
              disabled={busy}
              onClick={() => void logout()}
            >
              <span style={{ color: "#b91c1c" }} className="font-bold">Log out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
