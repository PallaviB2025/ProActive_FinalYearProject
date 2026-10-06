"use client";

import { useEffect, useState } from "react";
import { generateTotp } from "../../lib/totp";

interface TotpBadgeProps {
  secret: string;
  onCopy?: (code: string) => void;
}

export function TotpBadge({ secret, onCopy }: TotpBadgeProps) {
  const [code, setCode] = useState<string>("------");
  const [remaining, setRemaining] = useState<number>(30);
  const [error, setError] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let active = true;

    async function update() {
      try {
        const result = await generateTotp(secret);
        if (active) {
          setCode(result.code);
          setRemaining(result.remainingSeconds);
          setError(false);
        }
      } catch {
        if (active) setError(true);
      }
    }

    void update();
    const timer = setInterval(() => void update(), 1000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [secret]);

  const copy = async () => {
    if (code === "------" || error) return;
    await navigator.clipboard.writeText(code);
    if (onCopy) onCopy(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <span className="text-[11px] text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/50">
        Invalid 2FA Secret
      </span>
    );
  }

  const formattedCode = `${code.slice(0, 3)} ${code.slice(3)}`;
  const progress = remaining / 30;
  const strokeDashoffset = 44 - 44 * progress;

  return (
    <div className="totp-badge inline-flex items-center gap-2 px-2.5 py-1 text-xs">
      <div className="relative w-4 h-4 flex items-center justify-center" style={{ width: 16, height: 16 }}>
        <svg
          width="16"
          height="16"
          style={{ width: 16, height: 16, display: "block" }}
          className="w-4 h-4 -rotate-90"
          viewBox="0 0 16 16"
        >
          <circle
            cx="8"
            cy="8"
            r="7"
            stroke="#e2e8f0"
            strokeWidth="2"
            fill="none"
          />
          <circle
            cx="8"
            cy="8"
            r="7"
            className={remaining <= 5 ? "stroke-rose-500" : remaining <= 10 ? "stroke-amber-400" : "stroke-emerald-400"}
            strokeWidth="2"
            strokeDasharray="44"
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
      </div>

      <span className="font-mono font-bold tracking-wider text-emerald-400 select-all">
        {formattedCode}
      </span>

      <button
        type="button"
        onClick={() => void copy()}
        title="Copy 2FA Code"
        className="text-[11px] font-semibold text-slate-400 hover:text-emerald-400 transition"
      >
        {copied ? "✓" : "Copy"}
      </button>
    </div>
  );
}
