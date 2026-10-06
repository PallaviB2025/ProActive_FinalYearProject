"use client";

import React, { useState } from "react";
import { useVault } from "../../lib/vault-context";
import { generatePassword } from "../../lib/generator";
import { PasswordCsvImport } from "./PasswordCsvImport";

interface ToolsSectionProps {
  onNavigate?: (tab: string) => void;
}

export function ToolsSection({ onNavigate }: ToolsSectionProps) {
  const {
    items,
    setShowAttackGraph,
    copySecret,
    importCredentials,
    exportVault,
    busy,
  } = useVault();

  // Generator state
  const [length, setLength] = useState(16);
  const [useUpper, setUseUpper] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const [generated, setGenerated] = useState(() =>
    generatePassword({ length: 16, uppercase: true, numbers: true, symbols: true }),
  );
  const [showCsvImport, setShowCsvImport] = useState(false);

  const handleRegenerate = () => {
    const pwd = generatePassword({
      length,
      uppercase: useUpper,
      numbers: useNumbers,
      symbols: useSymbols,
    });
    setGenerated(pwd);
  };

  return (
    <div className="space-y-6">
      {/* Tool 1: Interactive Password Generator */}
      <div className="bg-[#f8fafc] border border-slate-200/90 rounded-2xl p-6 lg:p-8 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center flex-none">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="7.5" cy="15.5" r="5.5" />
                <path d="m21 2-9.6 9.6" />
                <path d="m15.5 7.5 3 3L22 7l-3-3" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Cryptographic Password Generator</h3>
              <p className="text-xs text-slate-500">Generate high-entropy, breach-resistant passphrases</p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            Cryptographically Secure
          </span>
        </div>

        {/* Output Display */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 mb-6">
          <span className="font-mono text-base text-slate-900 font-bold tracking-wider break-all flex-1 select-all px-2">
            {generated}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRegenerate}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>↻</span>
              <span>New</span>
            </button>
            <button
              type="button"
              onClick={() => copySecret("Generated Password", generated)}
              className="px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm shadow-blue-500/20 cursor-pointer"
            >
              <span>Copy</span>
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700">Length: {length} characters</label>
              <span className="text-xs font-mono text-slate-400">{length} chars</span>
            </div>
            <input
              type="range"
              min="8"
              max="64"
              value={length}
              onChange={(e) => {
                const l = Number(e.target.value);
                setLength(l);
                setGenerated(generatePassword({ length: l, uppercase: useUpper, numbers: useNumbers, symbols: useSymbols }));
              }}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={useUpper}
                onChange={(e) => {
                  setUseUpper(e.target.checked);
                  setGenerated(generatePassword({ length, uppercase: e.target.checked, numbers: useNumbers, symbols: useSymbols }));
                }}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>A-Z Uppercase</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={useNumbers}
                onChange={(e) => {
                  setUseNumbers(e.target.checked);
                  setGenerated(generatePassword({ length, uppercase: useUpper, numbers: e.target.checked, symbols: useSymbols }));
                }}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>0-9 Numbers</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={useSymbols}
                onChange={(e) => {
                  setUseSymbols(e.target.checked);
                  setGenerated(generatePassword({ length, uppercase: useUpper, numbers: useNumbers, symbols: e.target.checked }));
                }}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>!@#$ Symbols</span>
            </label>
          </div>
        </div>
      </div>

      {/* Tool 2: Attack Path Map & Blast Radius */}
      <div className="bg-[#f8fafc] border border-slate-200/90 rounded-2xl p-6 lg:p-8 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center flex-none">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
              <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Attack Path & Blast Radius Map</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualize how password reuse and shared master credentials connect your accounts.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAttackGraph(true)}
          className="px-5 py-2.5 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-xs font-semibold flex items-center gap-2 transition shadow-sm shadow-purple-500/20 cursor-pointer flex-none"
        >
          <span>Launch Attack Graph</span>
          <span>→</span>
        </button>
      </div>

      {/* Tool 3: Import & Export */}
      <div className="bg-[#f8fafc] border border-slate-200/90 rounded-2xl p-6 lg:p-8 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center flex-none">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" x2="12" y1="15" y2="3" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Import & Export Credentials</h3>
              <p className="text-xs text-slate-500">Migrate from Chrome, Bitwarden, 1Password, or backup your vault</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="p-4 rounded-xl border border-slate-200/80 bg-white flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900">Import from Browser or Password Manager</h4>
              <p className="text-[11px] text-slate-500 mt-1">Supports Google Chrome, Bitwarden, 1Password, and LastPass CSV formats.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCsvImport(!showCsvImport)}
              className="mt-4 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-blue-300 text-xs font-semibold text-slate-800 transition cursor-pointer self-start"
            >
              {showCsvImport ? "Hide Import" : "Import Passwords (CSV) →"}
            </button>
          </div>

          <div className="p-4 rounded-xl border border-slate-200/80 bg-white flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900">Export Secure Vault Backup</h4>
              <p className="text-[11px] text-slate-500 mt-1">Download encrypted JSON or plain CSV for offline safe-keeping.</p>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                disabled={busy}
                onClick={() => void exportVault("csv")}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                CSV Export
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void exportVault("encrypted-json")}
                className="px-3.5 py-1.5 rounded-xl border border-blue-600/30 bg-blue-50 hover:bg-blue-600 hover:text-white text-xs font-bold transition cursor-pointer shadow-xs"
                style={{ color: "#1d4ed8" }}
              >
                <span style={{ color: "#1d4ed8" }} className="font-bold">Encrypted JSON</span>
              </button>
            </div>
          </div>
        </div>

        {showCsvImport && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <PasswordCsvImport existing={items} busy={busy} onImport={(creds) => importCredentials(creds)} />
          </div>
        )}
      </div>
    </div>
  );
}
