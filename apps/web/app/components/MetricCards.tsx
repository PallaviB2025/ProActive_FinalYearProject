"use client";

import React from "react";
import { useVault } from "../../lib/vault-context";
import { computeSecurityScore } from "../../lib/security-score";

interface MetricCardsProps {
  onNavigate?: (tab: string) => void;
}

export function MetricCards({ onNavigate }: MetricCardsProps) {
  const { items, findings } = useVault();

  const {
    score,
    scoreLabel: healthLabel,
    scoreColor,
    weakCount,
    reusedCount,
    breachedCount,
  } = computeSecurityScore(items, findings);

  let healthColor = "text-emerald-600";
  let healthBg = "bg-emerald-50 text-emerald-600 border-emerald-200/80";
  let barBg = "bg-emerald-500";

  if (items.length === 0) {
    healthColor = "text-slate-400";
    healthBg = "bg-slate-100 text-slate-500 border-slate-200";
    barBg = "bg-slate-300";
  } else if (breachedCount > 0 || score < 50) {
    healthColor = "text-rose-600";
    healthBg = "bg-rose-50 text-rose-600 border-rose-200";
    barBg = "bg-rose-500";
  } else if (weakCount > 0 || score < 75) {
    healthColor = "text-amber-600";
    healthBg = "bg-amber-50 text-amber-600 border-amber-200";
    barBg = "bg-amber-500";
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Password Health */}
      <button
        type="button"
        onClick={() => onNavigate?.("health")}
        className="bg-[#f8fafc] border border-slate-200/90 hover:bg-white hover:border-blue-400 card-lift rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[124px] text-left group cursor-pointer"
      >
        <div className="flex items-center justify-between w-full mb-2">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-none shadow-2xs ${healthBg}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-900 transition-colors">
              Password Health
            </span>
          </div>
          <span className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all text-xs font-bold">
            →
          </span>
        </div>

        <div>
          <span className={`text-[22px] font-black ${healthColor} block leading-tight mb-2 tracking-tight`}>
            {healthLabel}
          </span>
          <div className="flex items-center gap-2.5">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-300 ${barBg}`} style={{ width: `${score}%` }}></div>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 font-mono">
              {score}/100
            </span>
          </div>
        </div>
      </button>

      {/* 2. Saved Credentials */}
      <button
        type="button"
        onClick={() => onNavigate?.("vault")}
        className="bg-[#f8fafc] border border-slate-200/90 hover:bg-white hover:border-blue-400 card-lift rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[124px] text-left group cursor-pointer"
      >
        <div className="flex items-center justify-between w-full mb-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl border border-blue-200/80 bg-blue-50 text-blue-600 flex items-center justify-center flex-none shadow-2xs">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-900 transition-colors">
              Saved Logins
            </span>
          </div>
          <span className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all text-xs font-bold">
            →
          </span>
        </div>

        <div>
          <span className="text-[26px] font-black text-slate-900 leading-none block tracking-tight">
            {items.length}
          </span>
          <span className="text-xs text-slate-500 mt-1 block">
            credentials in vault
          </span>
        </div>
      </button>

      {/* 3. Weak Passwords */}
      <button
        type="button"
        onClick={() => onNavigate?.("checkup")}
        className="bg-[#f8fafc] border border-slate-200/90 hover:bg-white hover:border-amber-400 card-lift rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[124px] text-left group cursor-pointer"
      >
        <div className="flex items-center justify-between w-full mb-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl border border-amber-200/80 bg-amber-50 text-amber-600 flex items-center justify-center flex-none shadow-2xs">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="8" y2="12" />
                <line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-900 transition-colors">
              Weak Keys
            </span>
          </div>
          <span className="text-slate-300 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all text-xs font-bold">
            →
          </span>
        </div>

        <div>
          <span className={`text-[26px] font-black leading-none block tracking-tight ${weakCount > 0 ? "text-amber-600" : "text-slate-900"}`}>
            {weakCount}
          </span>
          <span className="text-xs text-slate-500 mt-1 block">
            {weakCount > 0 ? `${weakCount} need attention` : "zero weak detected"}
          </span>
        </div>
      </button>

      {/* 4. Breached Passwords */}
      <button
        type="button"
        onClick={() => onNavigate?.("monitoring")}
        className="bg-[#f8fafc] border border-slate-200/90 hover:bg-white hover:border-rose-400 card-lift rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[124px] text-left group cursor-pointer"
      >
        <div className="flex items-center justify-between w-full mb-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl border border-rose-200/80 bg-rose-50 text-rose-600 flex items-center justify-center flex-none shadow-2xs">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M3 5v14a9 3 0 0 0 18 0V5" />
                <path d="M3 12a9 3 0 0 0 18 0" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-900 transition-colors">
              Breach Leaks
            </span>
          </div>
          <span className="text-slate-300 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all text-xs font-bold">
            →
          </span>
        </div>

        <div>
          <span className={`text-[26px] font-black leading-none block tracking-tight ${breachedCount > 0 ? "text-rose-600" : "text-slate-900"}`}>
            {breachedCount}
          </span>
          <span className="text-xs text-slate-500 mt-1 block">
            {findings ? (breachedCount > 0 ? `${breachedCount} compromised in leaks` : "zero found in breaches") : "scan pending"}
          </span>
        </div>
      </button>
    </div>
  );
}
