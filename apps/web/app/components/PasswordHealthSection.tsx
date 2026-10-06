"use client";

import React from "react";
import { useVault } from "../../lib/vault-context";
import { computeSecurityScore } from "../../lib/security-score";

interface PasswordHealthSectionProps {
  onNavigate?: (tab: string) => void;
  onFilterWeak?: () => void;
  onFilterReused?: () => void;
}

export function PasswordHealthSection({
  onNavigate,
  onFilterWeak,
  onFilterReused,
}: PasswordHealthSectionProps) {
  const { items, findings, busy, auditVault } = useVault();

  const {
    score,
    scoreColor: gaugeColor,
    weakCount,
    reusedCount,
    breachedCount,
    strongCount,
    totpCount,
  } = computeSecurityScore(items, findings);

  // Gauge values
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const displayScore = items.length === 0 ? 0 : score;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  let healthStatus = "Good Security Health";
  let statusColor = "text-emerald-600";
  if (items.length === 0) {
    healthStatus = "Add Credentials to Begin";
    statusColor = "text-slate-500";
  } else if (breachedCount > 0 || score < 50) {
    healthStatus = "Critical Security Risks Detected";
    statusColor = "text-rose-600";
  } else if (weakCount > 0 || reusedCount > 0 || score < 75) {
    healthStatus = "Needs Attention";
    statusColor = "text-amber-600";
  }

  return (
    <div className="space-y-6">
      {/* 1. Health Overview Score Banner */}
      <div className="bg-[#f8fafc] border border-slate-200/90 rounded-2xl p-6 lg:p-8 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          {/* Donut Gauge */}
          <div className="relative w-32 h-32 flex-none flex items-center justify-center">
            <svg width="128" height="128" viewBox="0 0 120 120" className="transform -rotate-90">
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke="#edf2f7"
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke={gaugeColor}
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                style={{ transition: "stroke-dashoffset 0.8s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                {items.length === 0 ? "—" : score}
              </span>
              <span className="text-[11px] font-bold text-slate-400 mt-1 uppercase font-mono">
                / 100
              </span>
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 mb-2">
              Password Health Rating
            </div>
            <h3 className={`text-xl font-black ${statusColor} tracking-tight leading-snug`}>
              {healthStatus}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mt-1 leading-relaxed">
              Based on password entropy, uniqueness, data breach exposure, and multi-factor authentication.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            disabled={busy}
            onClick={() => void auditVault()}
            className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            <span>{busy ? "Running Analysis…" : "Re-scan Health"}</span>
          </button>
        </div>
      </div>

      {/* 2. Detailed Health Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Strong Passwords */}
        <div className="bg-[#f8fafc] border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600">Strong Passwords</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              ✓
            </span>
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">{strongCount}</p>
          <p className="text-xs text-slate-400 mt-1">Unique & high complexity</p>
        </div>

        {/* Metric 2: Weak Passwords */}
        <div className="bg-[#f8fafc] border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600">Weak Passwords</span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              ⚠
            </span>
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">{weakCount}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-slate-400">Easy to guess</span>
            {weakCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  onFilterWeak?.();
                  onNavigate?.("vault");
                }}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
              >
                Fix in Vault →
              </button>
            )}
          </div>
        </div>

        {/* Metric 3: Reused Passwords */}
        <div className="bg-[#f8fafc] border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600">Reused Passwords</span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              ⟲
            </span>
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">{reusedCount}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-slate-400">Shared across sites</span>
            {reusedCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  onFilterReused?.();
                  onNavigate?.("vault");
                }}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
              >
                Fix in Vault →
              </button>
            )}
          </div>
        </div>

        {/* Metric 4: 2FA Active */}
        <div className="bg-[#f8fafc] border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600">2FA Authenticator</span>
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              🔑
            </span>
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">{totpCount}</p>
          <p className="text-xs text-slate-400 mt-1">Accounts with 2-step verification</p>
        </div>
      </div>

      {/* 3. Recommended Health Actions */}
      <div className="bg-[#f8fafc] border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Security Hygiene Recommendations</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 bg-white">
            <div className="flex items-center gap-3">
              <span className="text-lg">🛡️</span>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Replace shared passwords with unique passphrases</h4>
                <p className="text-[11px] text-slate-500">A compromise on one website shouldn&apos;t risk the rest of your digital identity.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate?.("vault")}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              Open Vault
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 bg-white">
            <div className="flex items-center gap-3">
              <span className="text-lg">⚡</span>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Enable 2FA on primary email and banking portals</h4>
                <p className="text-[11px] text-slate-500">Store your TOTP authenticator secrets directly inside ProActive Vault.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate?.("vault")}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              Add TOTP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
