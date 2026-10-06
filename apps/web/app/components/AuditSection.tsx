"use client";

import React from "react";
import { useVault } from "../../lib/vault-context";

interface AuditSectionProps {
  onNavigate?: (tab: string) => void;
}

export function AuditSection({ onNavigate }: AuditSectionProps) {
  const { items, findings, busy, auditVault, setEditing } = useVault();

  return (
    <div id="health-check-card" className="bg-[#f8fafc] border border-slate-200/90 rounded-2xl p-6 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <h2 className="text-xs font-bold text-slate-800 tracking-tight">
            Password Health Check
          </h2>
        </div>
        <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-100">
          {busy ? "Running…" : findings ? "Completed" : "Not run yet"}
        </span>
      </div>

      {/* Body Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 p-4 rounded-xl border border-slate-200/80 bg-white">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center flex-none">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 leading-tight">
              Run a private health check
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mt-1 max-w-2xl">
              Checks password guessability, exact reuse, and known breach data. Runs locally in your browser –
              no data leaves your device. Passwords are hashed with SHA-1 for breach lookup (HIBP).
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void auditVault()}
          className="py-2.5 px-5 rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-blue-700/20 flex-none self-start sm:self-auto cursor-pointer"
        >
          <span>{busy ? "Checking passwords…" : "Run local audit"}</span>
          <span className="text-sm leading-none">→</span>
        </button>
      </div>

      {/* Audit Findings Details */}
      {findings && (
        <div data-testid="audit-results" className="mt-5 space-y-3">
          {findings.length === 0 ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-800 font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              All saved passwords are strong, unique, and not detected in public breach archives.
            </div>
          ) : (
            findings.map((finding) => {
              const item = items.find((it) => it.id === finding.id);
              const siteName = item?.website;
              const isHigh = finding.severity === "High";
              const isLow = finding.severity === "Low";

              return (
                <article
                  key={finding.id}
                  className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isHigh
                      ? "bg-rose-50/60 border-rose-200 text-rose-950"
                      : isLow
                      ? "bg-blue-50/50 border-blue-200 text-slate-900"
                      : "bg-amber-50/60 border-amber-200 text-amber-950"
                  }`}
                >
                  <div>
                    <strong className="block font-bold">{siteName || "Saved Item"}</strong>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {finding.reasons.join(" • ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      isHigh
                        ? "bg-rose-100 text-rose-700 border border-rose-200"
                        : isLow
                        ? "bg-blue-100 text-blue-700 border border-blue-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    }`}>
                      {finding.severity}
                    </span>
                    {item && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(item);
                          onNavigate?.("vault");
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 text-xs font-semibold text-blue-600 transition shadow-sm cursor-pointer"
                      >
                        Fix in Vault
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
