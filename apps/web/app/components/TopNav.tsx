"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useVault } from "../../lib/vault-context";
import { computeSecurityScore } from "../../lib/security-score";

interface TopNavProps {
  onOpenSettings: () => void;
  onToggleMobileMenu?: () => void;
  onNavigate?: (tab: string) => void;
}

export function TopNav({ onOpenSettings, onToggleMobileMenu, onNavigate }: TopNavProps) {
  const { user, search, setSearch, items, findings, lock, logout, setEditing } = useVault();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Filter items live for the search dropdown
  const trimmedQuery = search.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!trimmedQuery) return [];
    return items.filter((item) => {
      const site = item.website || "";
      const user = item.username || "";
      const note = item.note || "";
      const card = item.cardholder || "";
      const cardNum = item.cardNumber || "";
      return `${site} ${user} ${note} ${card} ${cardNum}`.toLowerCase().includes(trimmedQuery);
    });
  }, [items, trimmedQuery]);

  // ⌘K / Ctrl+K keyboard shortcut to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        setShowSearchResults(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-dropdown]") && !target.closest("[data-search-box]")) {
        setShowNotifications(false);
        setShowUserMenu(false);
        setShowSearchResults(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // Build notification items from shared score utility
  const { weakCount, reusedCount, breachedCount } = computeSecurityScore(items, findings);

  const notifications: Array<{ icon: string; text: string; color: string }> = [];
  if (breachedCount > 0) notifications.push({ icon: "🚨", text: `${breachedCount} password${breachedCount > 1 ? "s" : ""} found in data breaches`, color: "text-rose-600" });
  if (weakCount > 0) notifications.push({ icon: "⚠️", text: `${weakCount} weak password${weakCount > 1 ? "s" : ""} need strengthening`, color: "text-amber-600" });
  if (reusedCount > 0) notifications.push({ icon: "🔁", text: `${reusedCount} reused password${reusedCount > 1 ? "s" : ""} detected`, color: "text-amber-600" });
  if (items.length === 0) notifications.push({ icon: "📋", text: "Add your first credential to get started", color: "text-blue-600" });
  if (!findings) notifications.push({ icon: "🔍", text: "Run a security scan to check your passwords", color: "text-slate-600" });
  if (notifications.length === 0) notifications.push({ icon: "✅", text: "All clear! Your vault is in good shape", color: "text-emerald-600" });
  const alertCount = breachedCount + weakCount + reusedCount;

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 gap-3">
      {/* Mobile Hamburger Button */}
      <button
        type="button"
        onClick={onToggleMobileMenu}
        className="lg:hidden p-2 -ml-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
        aria-label="Open navigation menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>

      {/* Search Bar with Live Floating Results */}
      <div className="flex-1 max-w-lg relative" data-search-box>
        <div className="relative flex items-center">
          <span className="absolute left-3.5 text-slate-400 pointer-events-none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" x2="16.65" y1="21" y2="16.65" />
            </svg>
          </span>
          <input
            ref={searchRef}
            type="text"
            value={search}
            onFocus={() => {
              if (search.trim()) setShowSearchResults(true);
            }}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowSearchResults(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setShowSearchResults(false);
                onNavigate?.("vault");
              } else if (e.key === "Escape") {
                setShowSearchResults(false);
              }
            }}
            placeholder="Search vault (Google, GitHub, card, note)..."
            className="w-full bg-slate-50 border border-slate-200/90 rounded-xl pl-9 sm:pl-10 pr-14 sm:pr-20 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          />
          <div className="absolute right-2.5 flex items-center gap-1.5">
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setShowSearchResults(false);
                }}
                className="w-4 h-4 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-[10px] cursor-pointer"
                title="Clear search"
              >
                ✕
              </button>
            )}
            <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-200/60 rounded border border-slate-200 pointer-events-none">
              Ctrl K
            </span>
          </div>
        </div>

        {/* Live Search Results Dropdown */}
        {showSearchResults && trimmedQuery && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden card-lift">
            <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>Matching Credentials ({searchResults.length})</span>
              <span className="text-[10px] text-slate-400">Press Enter for full vault</span>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No credentials match &ldquo;{search}&rdquo;
                </div>
              ) : (
                searchResults.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setEditing(item);
                      onNavigate?.("vault");
                      setShowSearchResults(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50/60 flex items-center justify-between gap-3 group transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-blue-100 text-slate-600 group-hover:text-blue-600 flex items-center justify-center text-xs flex-none">
                        {item.type === "card" ? "💳" : item.type === "note" ? "📝" : item.totpSecret ? "🛡️" : "🔑"}
                      </span>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 group-hover:text-blue-700 truncate">
                          {item.website || (item.type === "card" ? item.cardholder : "Secure Note")}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {item.username || (item.type === "card" ? `Card ending in ${item.cardNumber?.slice(-4) || "••••"}` : "Encrypted note")}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 flex-none transition-opacity">
                      Open →
                    </span>
                  </button>
                ))
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="p-2 border-t border-slate-100 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => {
                    onNavigate?.("vault");
                    setShowSearchResults(false);
                  }}
                  className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold text-center transition-colors cursor-pointer shadow-xs"
                >
                  View all {searchResults.length} results in Vault →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Notifications Bell */}
        <div className="relative" data-dropdown>
          <button
            type="button"
            aria-label="Notifications"
            title="Notifications"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            {alertCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold ring-2 ring-white px-1">
                {alertCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white border border-slate-200 shadow-lg py-2 z-40">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-800">Security Alerts</h3>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {notifications.map((n, i) => (
                  <div key={i} className="px-3.5 py-2.5 flex items-start gap-2.5 hover:bg-slate-50 transition-colors">
                    <span className="text-sm flex-none mt-0.5">{n.icon}</span>
                    <p className={`text-xs ${n.color} font-medium leading-relaxed`}>{n.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Dropdown */}
        <div className="relative" data-dropdown>
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 pl-2.5 pr-2 py-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 transition-all text-xs text-slate-800 font-semibold shadow-2xs cursor-pointer"
          >
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center flex-none">
              {(user?.email?.[0] || "U").toUpperCase()}
            </span>
            <span className="truncate max-w-[150px]">{user?.email || "Account"}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl p-1.5 z-40 animate-in fade-in duration-100">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <p className="text-[10px] uppercase font-mono font-bold text-slate-400">Signed in as</p>
                <p className="text-xs font-bold text-slate-900 truncate mt-0.5">{user?.email}</p>
              </div>
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenSettings();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-700 hover:bg-slate-100/90 hover:text-slate-900 transition-colors flex items-center gap-2.5 cursor-pointer font-medium border-0"
                >
                  <span className="text-sm">⚙️</span>
                  <span>Account & Vault Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    lock();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-700 hover:bg-slate-100/90 hover:text-slate-900 transition-colors flex items-center gap-2.5 cursor-pointer font-medium border-0"
                >
                  <span className="text-sm">🔒</span>
                  <span>Lock Vault</span>
                </button>
              </div>
              <div className="border-t border-slate-100 my-1"></div>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    void logout();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold bg-rose-50/80 hover:bg-rose-100 border border-rose-200/80 transition-colors flex items-center gap-2.5 cursor-pointer"
                  style={{ color: "#b91c1c" }}
                >
                  <span className="text-sm">🚪</span>
                  <span style={{ color: "#b91c1c" }} className="font-bold">Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
