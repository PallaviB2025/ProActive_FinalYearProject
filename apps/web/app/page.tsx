"use client";

import { VaultProvider, useVault } from "../lib/vault-context";
import { VaultHeader } from "./components/VaultHeader";
import { AuthCard } from "./components/AuthCard";
import { UnlockCard } from "./components/UnlockCard";
import { VaultDashboard } from "./components/VaultDashboard";
import { CredentialEditor } from "./components/CredentialEditor";
import { CredentialList } from "./components/CredentialList";
import { AuditSection } from "./components/AuditSection";
import { AttackGraphModal } from "./components/AttackGraphModal";
import { SettingsModal } from "./components/SettingsModal";
import { PasswordGenerator } from "./components/PasswordGenerator";
import { ClipboardToast } from "./components/ClipboardToast";
import { Sidebar } from "./components/Sidebar";
import { TopNav } from "./components/TopNav";
import { VaultFooter } from "./components/VaultFooter";
import { PasswordHealthSection } from "./components/PasswordHealthSection";
import { MonitoringSection } from "./components/MonitoringSection";
import { ToolsSection } from "./components/ToolsSection";
import { buildAttackGraph } from "../lib/graph";
import { useState, useEffect, useCallback } from "react";

const VALID_TABS = ["dashboard", "vault", "checkup", "health", "monitoring", "tools"];

function parseHash(hash: string): string | null {
  const clean = hash.replace(/^[#/]+/, "");
  return VALID_TABS.includes(clean) ? clean : null;
}

/* ──────────── Section header helper ──────────── */
function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center flex-none">
        {icon}
      </div>
      <div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight leading-tight">{title}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function VaultApp() {
  const {
    user,
    ready,
    unlocked,
    items,
    message,
    setEditing,
    setFilterTab,
    setSortOption,
    copiedSecret,
    setCopiedSecret,
    showAttackGraph,
    setShowAttackGraph,
    showGenerator,
    setShowGenerator,
  } = useVault();

  const [showSettings, setShowSettings] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTabState] = useState("dashboard");

  // Sync initial tab from URL hash on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const initialTab = parseHash(window.location.hash);
      if (initialTab) {
        setActiveTabState(initialTab);
      }
    }
  }, []);

  // Listen for hash changes (browser back/forward button)
  useEffect(() => {
    const handleHashChange = () => {
      const tab = parseHash(window.location.hash);
      if (tab) {
        setActiveTabState(tab);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
    if (typeof window !== "undefined") {
      const currentTab = parseHash(window.location.hash);
      if (currentTab !== tab) {
        window.location.hash = `#/${tab}`;
      }
    }
  }, []);

  if (!ready) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="text-center p-8">
          <div className="inline-flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] mx-auto rounded-full bg-blue-50 border border-blue-200 text-blue-600 mb-3">
            <svg
              width="22"
              height="22"
              className="animate-spin w-[22px] h-[22px] max-w-[22px] max-h-[22px] block"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#2563eb" strokeWidth="3"></circle>
              <path className="opacity-75" fill="#2563eb" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="sec-mono text-xs text-slate-500">Loading ProActive…</p>
        </div>
      </main>
    );
  }

  if (!user || !unlocked) {
    return (
      <main className="app-shell">
        <VaultHeader onOpenSettings={() => setShowSettings(true)} />
        {message && (
          <p role="status" className="status-message">
            {message}
          </p>
        )}
        {!user ? (
          <AuthCard />
        ) : (
          <div className="unlock-shell">
            <UnlockCard />
            <p className="security-note">
              Your unlocked vault is cleared from this browser tab when you lock or reload.
            </p>
          </div>
        )}
        {showSettings && (
          <SettingsModal onClose={() => setShowSettings(false)} />
        )}
      </main>
    );
  }

  /* ───────── Render active section based on sidebar tab ───────── */
  const renderActiveSection = () => {
    switch (activeTab) {
      case "dashboard":
        return <VaultDashboard onNavigate={setActiveTab} />;

      case "vault":
        return (
          <section id="vault">
            <SectionHeader
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              }
              title="My Vault"
              subtitle="Add, edit, and manage your saved credentials"
            />
            <div className="space-y-6">
              <CredentialEditor />
              <CredentialList />
            </div>
          </section>
        );

      case "checkup":
        return (
          <section id="checkup">
            <SectionHeader
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              }
              title="Security Checkup"
              subtitle="Run a full audit on your saved passwords"
            />
            <AuditSection onNavigate={setActiveTab} />
          </section>
        );

      case "health":
        return (
          <section id="health">
            <SectionHeader
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="m4.93 4.93 4.24 4.24" />
                  <path d="m14.83 9.17 4.24-4.24" />
                  <path d="m14.83 14.83 4.24 4.24" />
                  <path d="m9.17 14.83-4.24 4.24" />
                  <circle cx="12" cy="4" r="4" />
                </svg>
              }
              title="Password Health"
              subtitle="Overall security posture of your credentials"
            />
            <PasswordHealthSection
              onNavigate={setActiveTab}
              onFilterWeak={() => {
                setFilterTab("login");
                setSortOption("weak");
                setActiveTab("vault");
              }}
              onFilterReused={() => {
                setFilterTab("login");
                setSortOption("reused");
                setActiveTab("vault");
              }}
            />
          </section>
        );

      case "monitoring":
        return (
          <section id="monitoring">
            <SectionHeader
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="14" x="2" y="3" rx="2" />
                  <line x1="8" x2="16" y1="21" y2="21" />
                  <line x1="12" x2="12" y1="17" y2="21" />
                </svg>
              }
              title="Security Monitoring"
              subtitle="Data breach exposure and dark web checks"
            />
            <MonitoringSection
              onNavigate={setActiveTab}
              onSelectCredentialForEdit={(credential) => {
                setEditing(credential);
                setActiveTab("vault");
              }}
            />
          </section>
        );

      case "tools":
        return (
          <section id="tools">
            <SectionHeader
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              }
              title="Security Tools"
              subtitle="Password generator, CSV import, and attack path graph"
            />
            <ToolsSection onNavigate={setActiveTab} />
          </section>
        );

      default:
        return <VaultDashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f5f9] flex">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setShowSettings(true)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopNav
          onNavigate={setActiveTab}
          onOpenSettings={() => setShowSettings(true)}
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        />

        <main className="flex-1 p-6 lg:p-8 max-w-6xl w-full mx-auto">
          {message && (
            <p role="status" className="status-message mb-4">
              {message}
            </p>
          )}

          {renderActiveSection()}

          <div className="mt-8">
            <VaultFooter />
          </div>
        </main>
      </div>

      {/* Modals & Overlays */}
      {showAttackGraph && (
        <AttackGraphModal
          graph={buildAttackGraph(items)}
          onClose={() => setShowAttackGraph(false)}
          onSelectCredential={(id) => {
            const item = items.find((i) => i.id === id);
            if (item) {
              setEditing(item);
              setActiveTab("vault");
            }
          }}
        />
      )}

      {showGenerator && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative max-w-lg w-full">
            <PasswordGenerator onClose={() => setShowGenerator(false)} />
          </div>
        </div>
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {copiedSecret && (
        <ClipboardToast
          copiedText={copiedSecret.value}
          label={copiedSecret.label}
          durationSeconds={30}
          onClear={() => setCopiedSecret(null)}
        />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <VaultProvider>
      <VaultApp />
    </VaultProvider>
  );
}

