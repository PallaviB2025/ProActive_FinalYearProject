"use client";

import React, { useState } from "react";
import { useVault } from "../../lib/vault-context";
import { auditCredentials } from "../../lib/audit";
import { TotpBadge } from "./TotpBadge";

function formatCardNumber(num?: string, reveal = false): string {
  if (!num) return "•••• •••• •••• ••••";
  const clean = num.replace(/\s+/g, "");
  if (reveal) {
    return clean.match(/.{1,4}/g)?.join(" ") || clean;
  }
  const last4 = clean.slice(-4);
  return `•••• •••• •••• ${last4 || "••••"}`;
}

export function CredentialList() {
  const {
    items,
    findings,
    search,
    setSearch,
    filterTab,
    setFilterTab,
    sortOption,
    setSortOption,
    revealed,
    setRevealed,
    setEditing,
    setFormType,
    removeCredential,
    copySecret,
    busy,
  } = useVault();

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const toggleRevealed = (id: string) => {
    setRevealed((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const activeFindings = findings ?? (items.length ? auditCredentials(items) : []);

  const filteredItems = items.filter((item) => {
    const type = item.type || "login";
    if (filterTab === "login" && type !== "login") return false;
    if (filterTab === "totp" && !item.totpSecret) return false;
    if (filterTab === "note" && type !== "note") return false;
    if (filterTab === "card" && type !== "card") return false;

    // Apply sort/filter option
    if (sortOption === "weak") {
      const f = activeFindings.find((finding) => finding.id === item.id);
      const isWeak = f?.reasons.some((r) => r.toLowerCase().includes("guessable"));
      if (!isWeak) return false;
    } else if (sortOption === "reused") {
      const f = activeFindings.find((finding) => finding.id === item.id);
      const isReused = f?.reasons.some((r) => r.includes("reuse") || r.includes("Similar pattern"));
      if (!isReused) return false;
    }

    const q = search.trim().toLowerCase();
    if (!q) return true;

    return `${item.website || ""} ${item.username || ""} ${item.cardholder || ""} ${item.note || ""} ${item.cardNumber || ""}`
      .toLowerCase()
      .includes(q);
  });

  return (
    <div id="vault" className="bg-[#f8fafc] border border-slate-200/90 rounded-2xl p-6 shadow-xs">
      {/* Header and Search / Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Your Vault
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex items-center min-w-[240px]">
            <span className="absolute left-3 text-slate-400 pointer-events-none">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" x2="16.65" y1="21" y2="16.65" />
              </svg>
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by site, username, note, card…"
              className="w-full bg-slate-50 border border-slate-200/90 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 w-4 h-4 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-[10px] cursor-pointer"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Dropdown */}
          <div className="relative">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as "all" | "weak" | "reused")}
              className="appearance-none bg-slate-50 border border-slate-200/90 rounded-xl pl-3 pr-8 py-2 text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Items</option>
              <option value="weak">Weak Only</option>
              <option value="reused">Reused Only</option>
            </select>
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
              ▾
            </span>
          </div>
        </div>
      </div>

      {/* Pill Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => setFilterTab("all")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
            filterTab === "all"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
          }`}
        >
          All ({items.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab("login")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
            filterTab === "login"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
          }`}
        >
          Logins ({items.filter((i) => !i.type || i.type === "login").length})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab("totp")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
            filterTab === "totp"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
          }`}
        >
          2FA ({items.filter((i) => !!i.totpSecret).length})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab("note")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
            filterTab === "note"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
          }`}
        >
          Notes ({items.filter((i) => i.type === "note").length})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab("card")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
            filterTab === "card"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
          }`}
        >
          Cards ({items.filter((i) => i.type === "card").length})
        </button>
      </div>

      {/* Content Area */}
      {filteredItems.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mb-3.5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <circle cx="12" cy="12" r="3" />
              <path d="M12 9v1" />
              <path d="M12 14v1" />
              <path d="M9 12h1" />
              <path d="M14 12h1" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-slate-800">Your vault is empty</h3>
          <p className="text-xs text-slate-500 mt-1 mb-5 max-w-sm">
            Add a login, secure note, or payment card to get started.
          </p>
          <button
            type="button"
            onClick={() => {
              const form = document.getElementById("new-credential-form");
              form?.scrollIntoView({ behavior: "smooth" });
              form?.querySelector("input")?.focus();
            }}
            className="py-2.5 px-5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-blue-500/20"
          >
            <span>Add your first item</span>
            <span className="text-sm">→</span>
          </button>
        </div>
      ) : (
        /* Items List */
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const isRevealed = revealed.includes(item.id);
            const finding = activeFindings.find((f) => f.id === item.id);
            const isBreached = finding?.breach?.status === "breached";
            const isWeak = finding?.reasons?.some((r) => r.toLowerCase().includes("guessable"));
            const isReused = finding?.reasons?.some((r) => r.includes("reuse") || r.includes("Similar pattern"));

            const isCard = item.type === "card";
            const isNote = item.type === "note";
            const firstLetter = (item.website?.[0] || "L").toUpperCase();

            return (
              <div
                key={item.id}
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200/80 bg-white hover:border-blue-200 hover:shadow-xs transition-all"
              >
                {/* Left: Icon, Title, Subtitle, Badges */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  {isCard ? (
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center flex-none">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="14" x="2" y="5" rx="2" />
                        <line x1="2" x2="22" y1="10" y2="10" />
                      </svg>
                    </div>
                  ) : isNote ? (
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center flex-none">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" x2="8" y1="13" y2="13" />
                        <line x1="16" x2="8" y1="17" y2="17" />
                        <line x1="10" x2="8" y1="9" y2="9" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm flex items-center justify-center flex-none">
                      {firstLetter}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-bold text-slate-900 leading-tight truncate">
                        {item.website}
                      </h3>
                      {item.type && item.type !== "login" && (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                          isCard ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {item.type}
                        </span>
                      )}
                      {isBreached && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100">
                          Breached
                        </span>
                      )}
                      {isWeak && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
                          Weak
                        </span>
                      )}
                      {isReused && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
                          Reused
                        </span>
                      )}
                    </div>

                    {/* Subtitle with copy button */}
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-mono">
                      <span className="truncate max-w-[220px]">
                        {isCard
                          ? `Holder: ${item.cardholder || "Not specified"}`
                          : isNote
                            ? item.note
                              ? item.note.slice(0, 50) + (item.note.length > 50 ? "…" : "")
                              : "Secure Note"
                            : item.username || "No username"}
                      </span>
                      {item.username && !isCard && !isNote && (
                        <button
                          type="button"
                          onClick={() => copySecret("Username", item.username || "")}
                          title="Copy username"
                          className="text-slate-400 hover:text-blue-600 transition"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Secret values, TOTP, and Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  {item.totpSecret && <TotpBadge secret={item.totpSecret} />}

                  {/* Card specific controls */}
                  {isCard && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.cardNumber && (
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                          <span className="font-mono text-xs text-slate-700">
                            {formatCardNumber(item.cardNumber, isRevealed)}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleRevealed(item.id)}
                            className="text-slate-400 hover:text-slate-600 p-0.5"
                            title={isRevealed ? "Hide card number" : "Reveal card number"}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              {isRevealed ? (
                                <>
                                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                                  <line x1="2" y1="2" x2="22" y2="22" />
                                </>
                              ) : (
                                <>
                                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                  <circle cx="12" cy="12" r="3" />
                                </>
                              )}
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => copySecret("Card Number", item.cardNumber || "")}
                            className="text-slate-400 hover:text-blue-600 p-0.5"
                            title="Copy card number"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                            </svg>
                          </button>
                        </div>
                      )}
                      {item.cardExpiry && (
                        <span className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono text-slate-700 font-medium">
                          Exp: {item.cardExpiry}
                        </span>
                      )}
                      {item.cardCvv && (
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                          <span className="font-mono text-[11px] text-slate-700 font-medium">
                            CVV: {isRevealed ? item.cardCvv : "•••"}
                          </span>
                          <button
                            type="button"
                            onClick={() => copySecret("CVV", item.cardCvv || "")}
                            className="text-slate-400 hover:text-blue-600 p-0.5"
                            title="Copy CVV"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Note specific controls */}
                  {isNote && item.note && (
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                      <span className="font-mono text-xs text-slate-700 max-w-[180px] truncate">
                        {isRevealed ? item.note : "••••••••••••"}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleRevealed(item.id)}
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                        title={isRevealed ? "Hide note" : "Reveal note"}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          {isRevealed ? (
                            <>
                              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                              <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                              <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                              <line x1="2" y1="2" x2="22" y2="22" />
                            </>
                          ) : (
                            <>
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                              <circle cx="12" cy="12" r="3" />
                            </>
                          )}
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => copySecret("Secure Note", item.note || "")}
                        className="text-slate-400 hover:text-blue-600 p-0.5"
                        title="Copy note"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Login password controls */}
                  {!isCard && !isNote && item.password && (
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                      <span className="font-mono text-xs text-slate-700">
                        {isRevealed ? item.password : "••••••••••••"}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleRevealed(item.id)}
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                        title={isRevealed ? "Hide password" : "Reveal password"}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          {isRevealed ? (
                            <>
                              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                              <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                              <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                              <line x1="2" y1="2" x2="22" y2="22" />
                            </>
                          ) : (
                            <>
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                              <circle cx="12" cy="12" r="3" />
                            </>
                          )}
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => copySecret("Password", item.password)}
                        className="p-2 sm:p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
                        title="Copy password"
                        aria-label="Copy password"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Delete Confirmation or Actions */}
                  {confirmDeleteId === item.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          void removeCredential(item.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors min-h-[38px] flex items-center"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors min-h-[38px] flex items-center"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(item);
                          setFormType(item.type || "login");
                          const form = document.getElementById("new-credential-form");
                          form?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="p-2 sm:p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors text-xs font-semibold min-h-[38px] min-w-[38px] flex items-center justify-center"
                        title="Edit"
                        aria-label="Edit credential"
                      >
                        Edit
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="p-2 sm:p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-xs min-h-[38px] min-w-[38px] flex items-center justify-center"
                        title="Delete"
                        aria-label="Delete credential"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
