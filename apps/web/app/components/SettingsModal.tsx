"use client";

import { useState, type FormEvent } from "react";
import { useVault } from "../../lib/vault-context";

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const {
    user,
    items,
    busy,
    biometricsAvailable,
    biometricsEnrolled,
    toggleBiometrics,
    changeMasterPassword,
    deleteAccount,
    exportVault,
  } = useVault();

  const [activeTab, setActiveTab] = useState<"export" | "rekey" | "delete">("export");
  const [newMasterPassword, setNewMasterPassword] = useState("");
  const [confirmMasterPassword, setConfirmMasterPassword] = useState("");
  const [rekeyError, setRekeyError] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const handleRekey = async (e: FormEvent) => {
    e.preventDefault();
    setRekeyError("");
    if (newMasterPassword.length < 12) {
      setRekeyError("New Master Password must be at least 12 characters.");
      return;
    }
    if (newMasterPassword !== confirmMasterPassword) {
      setRekeyError("Passwords do not match.");
      return;
    }
    try {
      await changeMasterPassword(newMasterPassword);
      setNewMasterPassword("");
      setConfirmMasterPassword("");
      onClose();
    } catch (err) {
      setRekeyError((err as Error).message || "Failed to re-encrypt vault.");
    }
  };

  const handleDelete = async (e: FormEvent) => {
    e.preventDefault();
    setDeleteError("");
    if (deleteConfirmText !== "DELETE MY ACCOUNT") {
      setDeleteError('Please type "DELETE MY ACCOUNT" exactly to confirm.');
      return;
    }
    try {
      await deleteAccount(deletePassword);
      onClose();
    } catch (err) {
      setDeleteError((err as Error).message || "Failed to delete account.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Vault & Account Settings</h2>
            <p className="text-xs text-slate-500 mt-0.5">Manage exports, master key rotation, and account lifecycle.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-xl transition"
            title="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-100 px-6 pt-3 gap-3 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("export")}
            className={`pb-2.5 px-1 border-b-2 transition-all cursor-pointer ${
              activeTab === "export"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Data Export
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rekey")}
            className={`pb-2.5 px-1 border-b-2 transition-all cursor-pointer ${
              activeTab === "rekey"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Master Password
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("delete")}
            className={`pb-2.5 px-1 border-b-2 transition-all cursor-pointer ${
              activeTab === "delete"
                ? "border-rose-600 text-rose-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Danger Zone
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs text-slate-700">
          {/* Tab 1: Export */}
          {activeTab === "export" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 mb-0.5">Export Vault Backup</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Download an offline copy of your {items.length} saved vault items.
                </p>
              </div>

              {/* Encrypted JSON */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Encrypted JSON Backup (Recommended)
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Zero-knowledge AES-256 backup. Safe to store anywhere because passwords remain strongly encrypted.
                  </span>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void exportVault("encrypted-json")}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-xs flex-none cursor-pointer"
                >
                  Export JSON
                </button>
              </div>

              {/* Plain CSV */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Plaintext CSV Spreadsheet
                  </span>
                  <span className="text-[11px] text-amber-600 block mt-0.5">
                    ⚠️ Contains unencrypted plaintext passwords. Only use for migrating to other tools.
                  </span>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void exportVault("csv")}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs transition flex-none cursor-pointer"
                >
                  Export CSV
                </button>
              </div>

              {/* Biometrics */}
              {biometricsAvailable && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Windows Hello / Touch ID
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      {biometricsEnrolled ? "Biometric quick-unlock is active." : "Enable platform authenticator."}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void toggleBiometrics()}
                    className="px-3.5 py-2 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 text-blue-700 font-semibold text-xs transition cursor-pointer"
                  >
                    {biometricsEnrolled ? "Disable" : "Enable"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Change Master Password (Rekey) */}
          {activeTab === "rekey" && (
            <form onSubmit={handleRekey} className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 mb-0.5">Change Master Password</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Generates a new AES-256 data key, derives a new PBKDF2 wrapping key with 600,000 iterations, and re-encrypts all {items.length} saved credentials in your vault.
                </p>
              </div>

              {rekeyError && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                  {rekeyError}
                </p>
              )}

              <div>
                <label className="text-xs text-slate-700 font-bold mb-1 block">
                  New Master Password
                </label>
                <input
                  type="password"
                  value={newMasterPassword}
                  onChange={(e) => setNewMasterPassword(e.target.value)}
                  required
                  minLength={12}
                  placeholder="At least 12 characters"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold mb-1 block">
                  Confirm New Master Password
                </label>
                <input
                  type="password"
                  value={confirmMasterPassword}
                  onChange={(e) => setConfirmMasterPassword(e.target.value)}
                  required
                  minLength={12}
                  placeholder="Repeat new master password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="bg-blue-50 border border-blue-100 text-blue-800 p-3 rounded-xl text-[11px] leading-relaxed">
                Changing your master password will invalidate all other active browser sessions for security.
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition shadow-sm shadow-blue-500/20 cursor-pointer"
              >
                {busy ? "Re-encrypting Vault…" : "Re-encrypt Vault & Save"}
              </button>
            </form>
          )}

          {/* Tab 3: Danger Zone */}
          {activeTab === "delete" && (
            <form onSubmit={handleDelete} className="space-y-4">
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl space-y-1">
                <h3 className="text-xs font-bold text-rose-700">Permanent Account Deletion</h3>
                <p className="text-xs text-rose-600 leading-relaxed">
                  This action is irreversible. It permanently destroys your account ({user?.email}), your zero-knowledge vault metadata, all saved encrypted credentials, biometric keys, and active sessions.
                </p>
              </div>

              {deleteError && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                  {deleteError}
                </p>
              )}

              <div>
                <label className="text-xs text-slate-700 font-bold mb-1 block">
                  Enter Login Password to verify identity
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  required
                  placeholder="Your account login password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold mb-1 block">
                  Type <span className="font-mono text-rose-600 font-bold">DELETE MY ACCOUNT</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  required
                  placeholder="DELETE MY ACCOUNT"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 font-mono text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <button
                type="submit"
                disabled={busy || deleteConfirmText !== "DELETE MY ACCOUNT"}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold transition shadow-sm shadow-rose-600/20 cursor-pointer"
              >
                {busy ? "Deleting Account…" : "Permanently Delete Everything"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
