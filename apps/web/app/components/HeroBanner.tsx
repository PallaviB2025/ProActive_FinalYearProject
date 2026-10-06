"use client";

import React from "react";

interface HeroBannerProps {
  onNavigate?: (tab: string) => void;
  onRunAudit?: () => void;
}

export function HeroBanner({ onNavigate, onRunAudit }: HeroBannerProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-[#f8fafc] border border-slate-200/90 p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between min-h-[156px] shadow-xs">
      {/* Left Content */}
      <div className="max-w-md z-10 py-1">
        <h1 className="text-2xl lg:text-[28px] font-black text-slate-900 tracking-tight leading-snug">
          Your security desk is <span className="text-[#2563eb]">open.</span>
        </h1>
        <p className="mt-1.5 text-xs lg:text-sm text-slate-500 font-normal leading-relaxed">
          Keep your digital life secure. Review what matters, fix the gaps, and stay ahead.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 mt-4">
          <button
            type="button"
            onClick={() => onNavigate?.("vault")}
            className="px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>+ Add Credential</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onRunAudit?.();
              onNavigate?.("checkup");
            }}
            className="px-4 py-2 rounded-xl border border-slate-200 hover:border-blue-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            <span>Run Security Scan</span>
          </button>
        </div>
      </div>

      {/* Background Landscape Art */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <img
          src="/hero-bg.png"
          alt=""
          className="w-full h-full object-cover object-right"
        />
      </div>
    </section>
  );
}
