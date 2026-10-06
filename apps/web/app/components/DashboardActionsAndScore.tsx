"use client";

import React, { useState, useEffect, useRef } from "react";
import { useVault } from "../../lib/vault-context";
import { computeSecurityScore } from "../../lib/security-score";

interface DashboardActionsAndScoreProps {
  onNavigate?: (tab: string) => void;
}

const AUTO_CHECK_KEY = "proactive_auto_check";
const AUTO_CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export function DashboardActionsAndScore({ onNavigate }: DashboardActionsAndScoreProps) {
  const { items, findings, busy, auditVault } = useVault();

  // Persist auto-check preference in localStorage
  const [autoCheck, setAutoCheck] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(AUTO_CHECK_KEY) === "true";
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    localStorage.setItem(AUTO_CHECK_KEY, String(autoCheck));

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // If enabled, schedule periodic audits
    if (autoCheck && items.length > 0) {
      intervalRef.current = setInterval(() => {
        void auditVault();
      }, AUTO_CHECK_INTERVAL_MS);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoCheck, items.length, auditVault]);

  const {
    score,
    scoreLabel,
    scoreColor,
    weakCount,
    reusedCount,
    breachedCount,
    suggestionCount,
  } = computeSecurityScore(items, findings);

  // Circular gauge calculations (radius = 42, circumference ≈ 263.89)
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const displayScore = items.length === 0 ? 0 : score;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Recommended Actions (2 Columns) */}
      <div className="lg:col-span-2 bg-[#f8fafc] border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between card-lift">
        <div>
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Recommended Actions
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-200">
                {suggestionCount === 0
                  ? "All Clear"
                  : `${suggestionCount} Suggestion${suggestionCount === 1 ? "" : "s"}`}
              </span>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 font-medium">
              <span>Auto-check every 30 min</span>
              <button
                type="button"
                role="switch"
                aria-checked={autoCheck}
                onClick={() => setAutoCheck(!autoCheck)}
                className={`relative inline-flex h-5 w-9 flex-none items-center rounded-full transition-colors ${
                  autoCheck ? "bg-blue-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                    autoCheck ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            </label>
          </div>

          {/* Action List */}
          <div className="space-y-3.5">
            {/* Action 1: Check for breaches */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200/80 bg-white hover:border-blue-200 card-lift transition-all">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center flex-none">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Check for breaches</h3>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">Run a quick audit to see if your accounts have been exposed.</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 self-end sm:self-center">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  <span className="text-xs leading-none">+</span>
                  <span>{findings ? (breachedCount > 0 ? `${breachedCount} Breached` : "No breaches") : "Not checked yet"}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void auditVault();
                    onNavigate?.("checkup");
                  }}
                  disabled={busy}
                  className="px-3.5 py-1.5 rounded-xl border border-blue-600/30 bg-blue-50 hover:bg-blue-600 hover:text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                  style={{ color: "#1d4ed8" }}
                >
                  <span style={{ color: "#1d4ed8" }} className="font-bold">{busy ? "Checking…" : "Run check"}</span>
                  <span style={{ color: "#1d4ed8" }} className="text-xs font-bold">→</span>
                </button>
              </div>
            </div>

            {/* Action 2: Use unique passwords */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200/80 bg-white hover:border-blue-200 card-lift transition-all">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-500 flex items-center justify-center flex-none">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Use unique passwords</h3>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">Each account should have a different, strong password.</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 self-end sm:self-center">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                  reusedCount > 0
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${reusedCount > 0 ? "bg-amber-500" : "bg-emerald-500"}`}></span>
                  <span>{reusedCount > 0 ? `${reusedCount} Reused` : "Passwords are unique"}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate?.("vault")}
                  className="px-3.5 py-1.5 rounded-xl border border-blue-600/30 bg-blue-50 hover:bg-blue-600 hover:text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                  style={{ color: "#1d4ed8" }}
                >
                  <span style={{ color: "#1d4ed8" }} className="font-bold">View in Vault</span>
                  <span style={{ color: "#1d4ed8" }} className="text-xs font-bold">→</span>
                </button>
              </div>
            </div>

            {/* Action 3: Replace weak passwords */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200/80 bg-white hover:border-blue-200 card-lift transition-all">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-500 flex items-center justify-center flex-none">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Replace weak passwords</h3>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">Update passwords that don&apos;t meet security standards.</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 self-end sm:self-center">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                  weakCount > 0
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${weakCount > 0 ? "bg-amber-500" : "bg-emerald-500"}`}></span>
                  <span>{weakCount > 0 ? `${weakCount} Weak` : "Passwords are strong"}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate?.("checkup")}
                  className="px-3.5 py-1.5 rounded-xl border border-blue-600/30 bg-blue-50 hover:bg-blue-600 hover:text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                  style={{ color: "#1d4ed8" }}
                >
                  <span style={{ color: "#1d4ed8" }} className="font-bold">View details</span>
                  <span style={{ color: "#1d4ed8" }} className="text-xs font-bold">→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Security Score (1 Column) */}
      <div className="bg-[#f8fafc] border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col items-center justify-between text-center card-lift">
        <div className="w-full">
          <h2 className="text-base font-bold text-slate-900 text-left mb-3 tracking-tight">
            Security Score
          </h2>

          {/* Circular Donut Gauge */}
          <div className="relative w-36 h-36 mx-auto flex items-center justify-center my-2">
            <svg width="144" height="144" viewBox="0 0 100 100" className="transform -rotate-90">
              {/* Background Circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="#e2e8f0"
                strokeWidth="10"
                fill="none"
              />
              {/* Progress Circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke={scoreColor}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                style={{ transition: "stroke-dashoffset 0.8s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[34px] font-black text-slate-900 tracking-tight leading-none">
                {items.length === 0 ? "—" : score}
              </span>
              <span className="text-xs font-bold mt-1.5" style={{ color: scoreColor }}>
                {scoreLabel}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500 max-w-[210px] mx-auto mt-2 leading-relaxed">
            {items.length === 0
              ? "Add credentials to see your security score."
              : "You're on the right track! Follow the recommendations to reach 100."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate?.("health")}
          className="w-full py-2.5 px-4 rounded-xl border border-blue-600/30 bg-blue-50 hover:bg-blue-600 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all mt-4 shadow-xs cursor-pointer"
          style={{ color: "#1d4ed8" }}
        >
          <span style={{ color: "#1d4ed8" }} className="font-bold">View full report</span>
          <span style={{ color: "#1d4ed8" }} className="text-xs font-bold">→</span>
        </button>
      </div>
    </div>
  );
}
