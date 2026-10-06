"use client";

import React, { useState } from "react";
import { useVault } from "../../lib/vault-context";

interface SecurityPromptProps {
  onNavigate?: (tab: string) => void;
}

export function SecurityPrompt({ onNavigate }: SecurityPromptProps) {
  const [dismissed, setDismissed] = useState(false);
  const { items } = useVault();

  if (dismissed || items.length > 5) return null;

  return (
    <div className="bg-[#f0f7ff] border border-[#d6e7ff] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-[#dbeafe] text-[#2563eb] flex items-center justify-center flex-none">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xs font-bold text-slate-900 leading-tight">
            Let&apos;s make your account more secure
          </h2>
          <p className="text-xs text-slate-500 leading-tight mt-0.5">
            Add your first credential to start monitoring password health.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 self-end sm:self-center">
        <button
          type="button"
          onClick={() => {
            if (onNavigate) {
              onNavigate("vault");
            } else {
              const form = document.getElementById("new-credential-form");
              if (form) {
                form.scrollIntoView({ behavior: "smooth" });
                const firstInput = form.querySelector("input");
                firstInput?.focus();
              }
            }
          }}
          className="py-2 px-4 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-blue-500/20"
        >
          <span>Add your first credential</span>
          <span className="text-sm leading-none">→</span>
        </button>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss banner"
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
