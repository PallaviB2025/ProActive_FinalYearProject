"use client";

import React from "react";
import type { Finding, LocalCredential } from "../../lib/audit";
import { useVault } from "../../lib/vault-context";
import { getChangePasswordUrl } from "../../lib/utils";

interface MonitoringSectionProps {
  onNavigate?: (tab: string) => void;
  onSelectCredentialForEdit?: (credential: LocalCredential) => void;
}

export function MonitoringSection({
  onNavigate,
  onSelectCredentialForEdit,
}: MonitoringSectionProps) {
  const { items, findings, busy, auditVault, setShowAttackGraph } = useVault();

  const breachedFindings = (findings ?? []).filter(
    (f) => f.breach?.status === "breached",
  );
  const reusedFindings = (findings ?? []).filter((f) =>
    f.reasons.some((r) => r.includes("reuse") || r.includes("Similar pattern")),
  );

  const hasBreaches = breachedFindings.length > 0;

  return (
    <div className="space-y-6">
      {/* 1. Monitoring Threat Banner */}
      <div className="bg-[#f8fafc] border border-slate-200/90 rounded-2xl p-6 lg:p-8 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center flex-none text-2xl ${
            hasBreaches
              ? "bg-rose-50 border-rose-200 text-rose-600"
              : "bg-emerald-50 border-emerald-200 text-emerald-600"
          }`}>
            {hasBreaches ? "🚨" : "🛡️"}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-bold text-slate-900">
                Data Breach & Dark Web Monitoring
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                hasBreaches
                  ? "bg-rose-100 text-rose-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}>
                {hasBreaches ? `${breachedFindings.length} Breaches Detected` : "No Breaches Detected"}
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
              We monitor public data breaches using k-anonymity SHA-1 lookup (HaveIBeenPwned API).
              Your plain passwords never leave your browser.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setShowAttackGraph(true)}
            className="px-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
          >
            <span>⚡ Attack Path Graph</span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void auditVault()}
            className="px-4 py-2.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold flex items-center gap-2 transition shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <span>{busy ? "Scanning Leaks…" : "Run Leak Check"}</span>
          </button>
        </div>
      </div>

      {/* 2. Compromised Services List */}
      <div className="bg-[#f8fafc] border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900">
            Known Breach Exposures
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {breachedFindings.length} affected
          </span>
        </div>

        {breachedFindings.length === 0 ? (
          <div className="p-5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-center">
            <span className="text-2xl mb-1 block">🎉</span>
            <h4 className="text-xs font-bold text-emerald-900">No passwords found in known data breaches</h4>
            <p className="text-xs text-emerald-700 mt-1 max-w-md mx-auto">
              None of your saved credentials have been detected in known dark-web or public leak archives.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {breachedFindings.map((finding) => {
              const item = items.find((i) => i.id === finding.id);
              if (!item) return null;

              return (
                <div
                  key={finding.id}
                  className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-sm flex-none">
                      !
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">{item.website}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold uppercase">
                          Compromised
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Username: <span className="font-mono text-slate-700 font-medium">{item.username}</span>
                      </p>
                      <p className="text-[11px] text-rose-600 mt-0.5">
                        {finding.reasons.join(" • ")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <a
                      href={getChangePasswordUrl(item.website)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1 transition"
                    >
                      <span>Change at site</span>
                      <span>↗</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectCredentialForEdit?.(item);
                        onNavigate?.("vault");
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition cursor-pointer"
                    >
                      Update in Vault
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Attack Surface Intelligence */}
      <div className="bg-[#f8fafc] border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Attack Propagation Risk</h3>
        <p className="text-xs text-slate-500 leading-relaxed max-w-2xl mb-4">
          When an attacker obtains a compromised password, they immediately test it across major identity providers
          (Google, Microsoft, Apple, GitHub) and high-value banking sites. Use our Attack Path Graph to see how password
          reuse could compromise your entire online footprint.
        </p>
        <button
          type="button"
          onClick={() => setShowAttackGraph(true)}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
        >
          <span>Open Interactive Attack Graph</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
