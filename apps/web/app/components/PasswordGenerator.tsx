"use client";

import { useState, useEffect } from "react";
import { generatePassword, generatePassphrase } from "../../lib/generator";
import { analyzeEntropy } from "../../lib/entropy";

interface PasswordGeneratorProps {
  onSelectPassword?: (password: string) => void;
  onClose?: () => void;
}

export function PasswordGenerator({ onSelectPassword, onClose }: PasswordGeneratorProps) {
  const [mode, setMode] = useState<"matrix" | "diceware">("matrix");
  const [length, setLength] = useState(20);
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(true);

  const [wordCount, setWordCount] = useState(4);
  const [separator, setSeparator] = useState("-");
  const [capitalize, setCapitalize] = useState(true);
  const [includeNumber, setIncludeNumber] = useState(true);

  const [generated, setGenerated] = useState("");
  const [copied, setCopied] = useState(false);

  const regenerate = () => {
    if (mode === "matrix") {
      setGenerated(generatePassword({ length, uppercase, lowercase, numbers, symbols, excludeAmbiguous }));
    } else {
      setGenerated(generatePassphrase({ words: wordCount, separator, capitalize, includeNumber }));
    }
  };

  useEffect(() => {
    regenerate();
  }, [mode, length, uppercase, lowercase, numbers, symbols, excludeAmbiguous, wordCount, separator, capitalize, includeNumber]);

  const entropy = analyzeEntropy(generated);

  const copy = async () => {
    if (!generated) return;
    await navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ratingColors = {
    Critical: "text-rose-400 bg-rose-950/60 border-rose-800/60",
    Weak: "text-amber-400 bg-amber-950/60 border-amber-800/60",
    Moderate: "text-yellow-400 bg-yellow-950/60 border-yellow-800/60",
    Strong: "text-blue-400 bg-blue-950/60 border-blue-800/60",
    Unbreakable: "text-emerald-400 bg-emerald-950/60 border-emerald-800/60",
  };

  return (
    <section className="generator-panel p-5 space-y-4" aria-label="Password generator">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-slate-100">Password workshop</span>
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${ratingColors[entropy.rating]}`}>
            {entropy.rating} ({entropy.entropyBits} bits)
          </span>
        </div>
        <div className="segmented-control" aria-label="Password style">
          <button
            type="button"
            onClick={() => setMode("matrix")}
            className={`segment-tab ${mode === "matrix" ? "segment-tab--active" : ""}`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => setMode("diceware")}
            className={`segment-tab ${mode === "diceware" ? "segment-tab--active" : ""}`}
          >
            Diceware Passphrase
          </button>
        </div>
      </div>

      {/* Generated Result Box */}
      <div className="generator-result flex items-center gap-2 p-3">
        <span className="font-mono text-sm flex-1 break-all text-slate-100 font-semibold select-all">
          {generated}
        </span>
        <button
          type="button"
          onClick={regenerate}
          title="Regenerate"
          className="p-1.5 rounded-md hover:bg-[#162337] text-slate-300 hover:text-emerald-400 transition"
        >
          Regenerate
        </button>
        <button
          type="button"
          onClick={() => void copy()}
          className="sec-btn-secondary text-xs"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        {onSelectPassword && (
          <button
            type="button"
            onClick={() => onSelectPassword(generated)}
            className="sec-btn-primary text-xs"
          >
            Use
          </button>
        )}
      </div>

      {/* Real-Time Cracking Simulator Meter */}
      <div className="generator-meter grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-[#182436] text-center">
        <div className="p-2 rounded bg-[#080e18] border border-[#172437]">
          <span className="block text-[10px] uppercase text-slate-400 font-semibold">Online Attack</span>
          <span className="text-xs font-bold text-slate-200">{entropy.onlineTime}</span>
        </div>
        <div className="p-2 rounded bg-[#080e18] border border-[#172437]">
          <span className="block text-[10px] uppercase text-slate-400 font-semibold">Fast Workstation</span>
          <span className="text-xs font-bold text-slate-200">{entropy.workstationTime}</span>
        </div>
        <div className="p-2 rounded bg-[#080e18] border border-[#172437]">
          <span className="block text-[10px] uppercase text-slate-400 font-semibold">8x RTX 4090 Cluster</span>
          <span className={`text-xs font-bold ${entropy.rating === "Unbreakable" ? "text-emerald-400" : "text-amber-400"}`}>
            {entropy.gpuClusterTime}
          </span>
        </div>
        <div className="p-2 rounded bg-[#080e18] border border-[#172437]">
          <span className="block text-[10px] uppercase text-slate-400 font-semibold">Supercomputer</span>
          <span className="text-xs font-bold text-slate-200">{entropy.quantumTime}</span>
        </div>
      </div>

      {/* Controls */}
      {mode === "matrix" ? (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Length: <strong className="text-emerald-400 font-mono">{length}</strong> characters</span>
            <input
              type="range"
              min={8}
              max={64}
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
              className="w-44 accent-emerald-500 cursor-pointer"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-300">
            <label className="flex items-center gap-2 cursor-pointer mb-0">
              <input type="checkbox" checked={uppercase} onChange={(e) => setUppercase(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
              Uppercase (A-Z)
            </label>
            <label className="flex items-center gap-2 cursor-pointer mb-0">
              <input type="checkbox" checked={lowercase} onChange={(e) => setLowercase(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
              Lowercase (a-z)
            </label>
            <label className="flex items-center gap-2 cursor-pointer mb-0">
              <input type="checkbox" checked={numbers} onChange={(e) => setNumbers(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
              Numbers (0-9)
            </label>
            <label className="flex items-center gap-2 cursor-pointer mb-0">
              <input type="checkbox" checked={symbols} onChange={(e) => setSymbols(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
              Symbols (!@#$)
            </label>
            <label className="flex items-center gap-2 cursor-pointer mb-0 col-span-2">
              <input type="checkbox" checked={excludeAmbiguous} onChange={(e) => setExcludeAmbiguous(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
              Exclude ambiguous (0, O, 1, l, I)
            </label>
          </div>
        </div>
      ) : (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Words: <strong className="text-emerald-400 font-mono">{wordCount}</strong></span>
            <input
              type="range"
              min={3}
              max={8}
              value={wordCount}
              onChange={(e) => setWordCount(Number(e.target.value))}
              className="w-44 accent-emerald-500 cursor-pointer"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <label className="flex items-center gap-1.5 cursor-pointer mb-0">
              <span>Separator:</span>
              <input
                type="text"
                value={separator}
                maxLength={2}
                onChange={(e) => setSeparator(e.target.value)}
                className="w-12 h-7 px-1 text-center font-mono border border-[#1e2f47] bg-[#090f19] text-white rounded"
              />
            </label>
            <label className="flex items-center gap-2 cursor-pointer mb-0">
              <input type="checkbox" checked={capitalize} onChange={(e) => setCapitalize(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
              Capitalize Words
            </label>
            <label className="flex items-center gap-2 cursor-pointer mb-0">
              <input type="checkbox" checked={includeNumber} onChange={(e) => setIncludeNumber(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
              Append Number
            </label>
          </div>
        </div>
      )}

      {onClose && (
        <div className="text-right pt-1">
          <button type="button" onClick={onClose} className="sec-btn-secondary text-xs">
            Close Generator
          </button>
        </div>
      )}
    </section>
  );
}
