"use client";

import { useEffect, useRef, useState } from "react";

interface ClipboardToastProps {
  copiedText: string;
  label?: string;
  durationSeconds?: number;
  onClear: () => void;
}

export function ClipboardToast({ copiedText, label = "Secret", durationSeconds = 30, onClear }: ClipboardToastProps) {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const onClearRef = useRef(onClear);
  onClearRef.current = onClear;

  useEffect(() => {
    setSecondsLeft(durationSeconds);
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Zeroize clipboard
          if (navigator.clipboard) {
            void navigator.clipboard.writeText("").catch(() => {});
          }
          onClearRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [copiedText, durationSeconds]);

  const clearImmediately = async () => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText("").catch(() => {});
    }
    onClearRef.current();
  };

  const progress = (secondsLeft / durationSeconds) * 100;

  return (
    <div className="clipboard-toast fixed bottom-5 right-5 z-50 flex flex-col overflow-hidden max-w-sm">
      <div className="p-3.5 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-slate-200">
            {label} copied. Auto-clearing in <strong className="text-emerald-400 font-mono">{secondsLeft}s</strong>
          </span>
        </div>
        <button
          type="button"
          onClick={() => void clearImmediately()}
          className="text-[11px] font-semibold bg-[#162235] hover:bg-[#1f314c] px-2.5 py-1 rounded text-slate-300 hover:text-white transition border border-[#23354f]"
        >
          Zeroize Now
        </button>
      </div>
      <div className="clipboard-toast-track h-1 w-full">
        <div
          className="h-full bg-emerald-500 transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
