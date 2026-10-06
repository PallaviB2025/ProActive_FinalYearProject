"use client";

import React from "react";
import { useVault } from "../../lib/vault-context";

interface ToolsGridProps {
  onNavigate?: (tab: string) => void;
}

export function ToolsGrid({ onNavigate }: ToolsGridProps) {
  const { setShowGenerator, setShowAttackGraph, auditVault, busy } = useVault();

  return (
    <div id="tools" className="space-y-3.5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          Security Tools
        </h2>
        <button
          type="button"
          onClick={() => onNavigate?.("tools")}
          className="text-xs font-semibold text-[#2563eb] hover:text-blue-700 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>View all tools</span>
          <span className="text-xs">→</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tool 1: Password Generator */}
        <button
          type="button"
          onClick={() => setShowGenerator(true)}
          className="bg-[#f8fafc] border border-slate-200/90 hover:bg-white hover:border-blue-400 rounded-2xl p-4 text-left flex items-center justify-between gap-3 group shadow-xs cursor-pointer card-lift"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#2563eb] text-white flex items-center justify-center flex-none shadow-sm shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="7.5" cy="15.5" r="5.5" />
                <path d="m21 2-9.6 9.6" />
                <path d="m15.5 7.5 3 3L22 7l-3-3" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Password Generator
              </h3>
              <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                Create strong, unique passwords instantly.
              </p>
            </div>
          </div>
          <span className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all text-base font-light">
            ›
          </span>
        </button>

        {/* Tool 2: Attack Path Map */}
        <button
          type="button"
          onClick={() => setShowAttackGraph(true)}
          className="bg-[#f8fafc] border border-slate-200/90 hover:bg-white hover:border-purple-400 rounded-2xl p-4 text-left flex items-center justify-between gap-3 group shadow-xs cursor-pointer card-lift"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#8b5cf6] text-white flex items-center justify-center flex-none shadow-sm shadow-purple-500/25 group-hover:scale-105 transition-transform">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
                <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                Attack Path Map
              </h3>
              <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                See how a breach could spread across your accounts.
              </p>
            </div>
          </div>
          <span className="text-slate-300 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all text-base font-light">
            ›
          </span>
        </button>

        {/* Tool 3: Run Local Audit */}
        <button
          type="button"
          onClick={() => {
            void auditVault();
            onNavigate?.("checkup");
          }}
          disabled={busy}
          className="bg-[#f8fafc] border border-slate-200/90 hover:bg-white hover:border-cyan-400 rounded-2xl p-4 text-left flex items-center justify-between gap-3 group shadow-xs cursor-pointer card-lift"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#06b6d4] text-white flex items-center justify-center flex-none shadow-sm shadow-cyan-500/25 group-hover:scale-105 transition-transform">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-cyan-600 transition-colors">
                Run Local Audit
              </h3>
              <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                Check for weak, reused, or risky passwords.
              </p>
            </div>
          </div>
          <span className="text-slate-300 group-hover:text-cyan-600 group-hover:translate-x-0.5 transition-all text-base font-light">
            ›
          </span>
        </button>
      </div>
    </div>
  );
}
