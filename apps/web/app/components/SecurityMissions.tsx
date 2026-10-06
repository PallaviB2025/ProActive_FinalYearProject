"use client";

import React, { useMemo } from "react";
import { useVault } from "../../lib/vault-context";
import { computeSecurityScore } from "../../lib/security-score";

interface SecurityMissionsProps {
  onNavigate?: (tab: string) => void;
}

export function SecurityMissions({ onNavigate }: SecurityMissionsProps) {
  const { items, findings, auditVault, busy } = useVault();
  const { weakCount, reusedCount, breachedCount } = computeSecurityScore(items, findings);

  const missions = useMemo(() => {
    const hasItems = items.length > 0;
    const hasAudited = findings !== null;
    const hasBreachCheck = findings?.some((f) => f.breach !== undefined) ?? false;
    const noWeak = hasItems && weakCount === 0;
    const noReuse = hasItems && reusedCount === 0;

    return [
      {
        id: "mission-seed",
        title: "Seed Your Vault",
        description: "Add your first credential, card, or secure note to start encryption.",
        completed: hasItems,
        actionLabel: "Add Item",
        onAction: () => onNavigate?.("vault"),
        category: "Storage",
        badgeColor: hasItems ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-blue-700 bg-blue-50 border-blue-200",
      },
      {
        id: "mission-scan",
        title: "Run Security Audit",
        description: "Execute a local zero-knowledge password strength and pattern scan.",
        completed: hasAudited,
        actionLabel: "Run Audit",
        onAction: () => void auditVault(),
        category: "Audit",
        badgeColor: hasAudited ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-amber-700 bg-amber-50 border-amber-200",
      },
      {
        id: "mission-weak",
        title: "Eliminate Weak Passwords",
        description: "Ensure all stored passwords achieve high zxcvbn entropy score.",
        completed: noWeak,
        actionLabel: "Review Weak",
        onAction: () => onNavigate?.("health"),
        category: "Hygiene",
        badgeColor: noWeak ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-rose-700 bg-rose-50 border-rose-200",
      },
      {
        id: "mission-reuse",
        title: "Prevent Password Reuse",
        description: "Assign distinct, unique passwords to every service you use.",
        completed: noReuse,
        actionLabel: "Fix Reused",
        onAction: () => onNavigate?.("checkup"),
        category: "Hygiene",
        badgeColor: noReuse ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-amber-700 bg-amber-50 border-amber-200",
      },
      {
        id: "mission-breach",
        title: "Check K-Anonymity Breaches",
        description: "Verify credentials against HaveIBeenPwned via 5-character SHA-1 prefixes.",
        completed: hasBreachCheck,
        actionLabel: "Scan Breaches",
        onAction: () => onNavigate?.("monitoring"),
        category: "Monitoring",
        badgeColor: hasBreachCheck ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-indigo-700 bg-indigo-50 border-indigo-200",
      },
    ];
  }, [items, findings, weakCount, reusedCount, auditVault, onNavigate]);

  const completedCount = missions.filter((m) => m.completed).length;
  const progressPercent = Math.round((completedCount / missions.length) * 100);

  return (
    <div className="bg-[#f8fafc] border border-slate-200/90 rounded-2xl p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Security Missions
            </h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {completedCount} of {missions.length} Done
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete proactive hardening missions to maximize your vault&apos;s security score.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-32 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-700 min-w-[32px] text-right">
            {progressPercent}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {missions.map((mission) => (
          <div
            key={mission.id}
            className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
              mission.completed
                ? "bg-slate-50/60 border-slate-200/70"
                : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-xs"
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${mission.badgeColor}`}>
                  {mission.category}
                </span>
                {mission.completed ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Completed
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-slate-400">
                    Incomplete
                  </span>
                )}
              </div>
              <h4 className="text-xs font-bold text-slate-900 leading-snug">
                {mission.title}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                {mission.description}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={mission.onAction}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 min-h-[36px] ${
                  mission.completed
                    ? "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                }`}
              >
                <span>{mission.actionLabel}</span>
                <span className="text-xs">→</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
