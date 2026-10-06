"use client";

import React from "react";

export function VaultFooter() {
  return (
    <footer className="mt-12 pt-8 pb-10 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
      <div className="flex items-center gap-2.5">
        <div className="w-5 h-5 rounded-md bg-blue-600 text-white font-black text-[11px] flex items-center justify-center">
          P
        </div>
        <span className="font-bold text-slate-700">ProActive</span>
        <span className="text-slate-300">•</span>
        <span>A private workspace for the credentials you rely on.</span>
      </div>

      <div className="flex items-center gap-6 text-slate-500 font-medium">
        <a href="#privacy" className="hover:text-blue-600 transition-colors">Privacy</a>
        <a href="#security" className="hover:text-blue-600 transition-colors">Security</a>
        <a href="#help" className="hover:text-blue-600 transition-colors">Help</a>
        <a href="#contact" className="hover:text-blue-600 transition-colors">Contact</a>
      </div>
    </footer>
  );
}
