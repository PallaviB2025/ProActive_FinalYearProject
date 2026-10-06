"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  Credential,
  StoredCredential,
  VaultMetadata,
} from "@proactive/shared";
import { api, ApiError } from "./api";
import {
  initializeVault,
  unlockVault,
  encryptCredential,
  decryptCredential,
} from "./crypto";
import {
  auditCredentials,
  auditWithBreaches,
  type Finding,
  type LocalCredential,
} from "./audit";
import { PwnedPasswordsClient } from "./hibp";
import { credentialIdentity } from "./csvImport";
import {
  isBiometricsAvailable,
  isBiometricsEnrolled,
  fetchBiometricsEnrolled,
  registerBiometricUnlock,
  verifyBiometricUnlock,
  clearBiometrics,
  clearBioSession,
} from "./biometrics";
import { prepareRekey } from "./rekey";
import { exportAsCSV, exportAsEncryptedJSON, downloadFile } from "./export";

export type User = { id: string; email: string };

export interface VaultContextType {
  user: User | null;
  ready: boolean;
  unlocked: boolean;
  metadata: VaultMetadata | null;
  items: LocalCredential[];
  findings: Finding[] | null;
  busy: boolean;
  message: string;
  revealed: string[];
  editing: LocalCredential | null;
  search: string;
  filterTab: "all" | "login" | "totp" | "note" | "card";
  sortOption: "all" | "weak" | "reused";
  formType: "login" | "note" | "card";
  copiedSecret: { label: string; value: string } | null;
  biometricsAvailable: boolean;
  biometricsEnrolled: boolean;
  hasActiveBioSession: boolean;
  showGenerator: boolean;
  showAttackGraph: boolean;
  setUser: (u: User | null) => void;
  setMessage: (m: string) => void;
  setSearch: (s: string) => void;
  setFilterTab: (t: "all" | "login" | "totp" | "note" | "card") => void;
  setSortOption: (s: "all" | "weak" | "reused") => void;
  setFormType: (t: "login" | "note" | "card") => void;
  setEditing: (c: LocalCredential | null) => void;
  setShowGenerator: (b: boolean) => void;
  setShowAttackGraph: (b: boolean) => void;
  setRevealed: React.Dispatch<React.SetStateAction<string[]>>;
  toggleRevealed: (id: string) => void;
  setCopiedSecret: (s: { label: string; value: string } | null) => void;
  run: (action: () => Promise<void>) => Promise<void>;
  authenticate: (email: string, password: string, isRegister: boolean) => Promise<void>;
  openVaultWithPassword: (master: string, confirmation?: string) => Promise<void>;
  fastBiometricUnlock: () => Promise<void>;
  toggleBiometrics: () => Promise<void>;
  lock: (hard?: boolean) => void;
  broadcastLock: (hard?: boolean) => void;
  logout: () => Promise<void>;
  saveCredential: (value: Credential, form?: HTMLFormElement) => Promise<void>;
  removeCredential: (id: string) => Promise<void>;
  auditVault: () => Promise<void>;
  importCredentials: (values: Credential[]) => Promise<boolean>;
  copySecret: (label: string, value: string) => void;
  changeMasterPassword: (newPassword: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  exportVault: (format: "csv" | "encrypted-json") => Promise<void>;
}

const VaultContext = createContext<VaultContextType | null>(null);

export function VaultProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [metadata, setMetadata] = useState<VaultMetadata | null>(null);
  const key = useRef<CryptoKey | null>(null);
  const softLockKeyRef = useRef<CryptoKey | null>(null);
  const generation = useRef(0);
  const breachClient = useRef<PwnedPasswordsClient | null>(null);
  const auditVersion = useRef(0);
  const [unlocked, setUnlocked] = useState(false);
  const [items, setItems] = useState<LocalCredential[]>([]);
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [search, setSearch] = useState("");
  const [revealed, setRevealed] = useState<string[]>([]);
  const [editing, setEditing] = useState<LocalCredential | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [showGenerator, setShowGenerator] = useState(false);
  const [showAttackGraph, setShowAttackGraph] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState<{ label: string; value: string } | null>(null);
  const [filterTab, setFilterTab] = useState<"all" | "login" | "totp" | "note" | "card">("all");
  const [sortOption, setSortOption] = useState<"all" | "weak" | "reused">("all");
  const [formType, setFormType] = useState<"login" | "note" | "card">("login");
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsEnrolled, setBiometricsEnrolled] = useState(false);
  const [hasActiveBioSession, setHasActiveBioSession] = useState(false);
  const lastActivity = useRef<number>(Date.now());

  function lock(hard = false) {
    breachClient.current?.dispose();
    breachClient.current = null;
    generation.current++;
    key.current = null;
    if (hard || !biometricsEnrolled) {
      softLockKeyRef.current = null;
      setHasActiveBioSession(false);
      clearBioSession();
    }
    setUnlocked(false);
    setItems([]);
    setFindings(null);
    setRevealed([]);
    setEditing(null);
    setSearch("");
    setSortOption("all");
    setMessage("");
    setShowGenerator(false);
    setShowAttackGraph(false);
  }

  function broadcastLock(hard = false) {
    lock(hard);
    const channel = new BroadcastChannel("proactive-lock");
    channel.postMessage(hard ? "hard-lock" : "lock");
    channel.close();
  }

  function copySecret(label: string, value: string) {
    if (!value) return;
    void navigator.clipboard.writeText(value);
    setCopiedSecret({ label, value });
    setMessage(`${label} copied. Clipboard will auto-clear in 30s.`);
  }

  function toggleRevealed(id: string) {
    setRevealed((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  }

  useEffect(() => {
    try {
      sessionStorage.removeItem("proactive_bio_mp_session");
    } catch {
      // ignore
    }
    void isBiometricsAvailable().then(setBiometricsAvailable);
    void fetchBiometricsEnrolled().then(setBiometricsEnrolled);
  }, []);

  // Inactivity auto-lock (15 minutes)
  useEffect(() => {
    if (!unlocked) return;
    const recordActivity = () => {
      lastActivity.current = Date.now();
    };
    const events = ["mousemove", "keydown", "touchstart", "scroll", "visibilitychange"];
    events.forEach((ev) => window.addEventListener(ev, recordActivity, { passive: true }));
    const timer = setInterval(() => {
      if (Date.now() - lastActivity.current > 15 * 60 * 1000) {
        broadcastLock(false);
      }
    }, 15000);
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, recordActivity));
      clearInterval(timer);
    };
  }, [unlocked]);

  // Session check and lock synchronization
  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const current = await api<User>("/auth/me");
        if (!active) return;
        setUser(current);
        const vault = await api<{ metadata: VaultMetadata | null }>("/vault");
        if (!active) return;
        setMetadata(vault.metadata);
      } catch {
        // Not authenticated or network error
      } finally {
        setReady(true);
      }
    };
    void init();

    // Fallback: guaranteed ready after 1.5s so user is never stuck on a spinner
    const fallbackTimer = setTimeout(() => {
      setReady(true);
    }, 1500);

    const clear = (hard = false) => lock(hard);
    const handlePageHide = () => clear(true);
    const channel = new BroadcastChannel("proactive-lock");
    channel.onmessage = (ev) => clear(ev.data === "hard-lock");
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      active = false;
      clearTimeout(fallbackTimer);
      window.removeEventListener("pagehide", handlePageHide);
      channel.close();
    };
  }, []);

  // SECURITY NOTE: The old extension bridge that pulled plaintext credentials
  // via postMessage (PROACTIVE_RES_EXTENSION_CREDENTIALS) has been removed.
  // The extension now handles its own encryption pipeline via background.js.
  // The web app and extension share the same backend API — no plaintext sync needed.

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        lock();
        setUser(null);
      }
      setMessage(error instanceof Error ? error.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  }

  async function authenticate(email: string, password: string, isRegister: boolean) {
    const input = { email, password };
    await run(async () => {
      if (isRegister) {
        await api("/auth/register", "POST", input);
        const current = await api<User>("/auth/login", "POST", input);
        const vault = await api<{ metadata: VaultMetadata | null }>("/vault");
        setMetadata(vault.metadata);
        setUser(current);
        setMessage("Account created successfully!");
        return;
      }
      const current = await api<User>("/auth/login", "POST", input);
      const vault = await api<{ metadata: VaultMetadata | null }>("/vault");
      setMetadata(vault.metadata);
      setUser(current);
    });
  }

  async function openVaultWithPassword(master: string, confirmation?: string) {
    const epoch = generation.current;
    await run(async () => {
      let unlockedKey: CryptoKey;
      if (metadata) {
        unlockedKey = await unlockVault(master, metadata);
      } else {
        if (master !== confirmation)
          throw new Error("Master Passwords do not match");
        const initialized = await initializeVault(master);
        if (epoch !== generation.current) return;
        await api("/vault", "POST", initialized.metadata);
        setMetadata(initialized.metadata);
        unlockedKey = initialized.key;
      }
      const stored = await api<StoredCredential[]>("/credentials");
      const decoded = await Promise.all(
        stored.map(async (row) => ({
          id: row.id,
          ...(await decryptCredential(unlockedKey, row.id, row.payload)),
        })),
      );
      if (epoch !== generation.current) return;
      key.current = unlockedKey;
      if (typeof window !== "undefined" && (biometricsEnrolled || isBiometricsEnrolled())) {
        softLockKeyRef.current = unlockedKey;
        setHasActiveBioSession(true);
      }
      lastActivity.current = Date.now();
      setItems(decoded);
      setUnlocked(true);
    });
  }

  async function fastBiometricUnlock() {
    if (!biometricsEnrolled) return;
    await run(async () => {
      if (!softLockKeyRef.current) {
        throw new Error("Biometric session not active. Please unlock with your Master Password.");
      }
      const result = await verifyBiometricUnlock();
      if (!result.verified) throw new Error("Biometric verification was cancelled or failed");
      const unlockedKey = softLockKeyRef.current;
      const stored = await api<StoredCredential[]>("/credentials");
      const decoded = await Promise.all(
        stored.map(async (row) => ({
          id: row.id,
          ...(await decryptCredential(unlockedKey, row.id, row.payload)),
        })),
      );
      key.current = unlockedKey;
      lastActivity.current = Date.now();
      setItems(decoded);
      setUnlocked(true);
      setHasActiveBioSession(true);
      setMessage("Vault unlocked with biometric verification");
    });
  }

  async function toggleBiometrics() {
    if (!user) return;
    if (biometricsEnrolled) {
      await clearBiometrics();
      softLockKeyRef.current = null;
      setHasActiveBioSession(false);
      setBiometricsEnrolled(false);
      setMessage("Biometric unlock disabled.");
    } else {
      const success = await registerBiometricUnlock();
      if (success) {
        setBiometricsEnrolled(true);
        if (key.current) {
          softLockKeyRef.current = key.current;
          setHasActiveBioSession(true);
        }
        setMessage("Biometric unlock (Windows Hello / Touch ID) enabled!");
      } else {
        setMessage("Could not enable biometric unlock.");
      }
    }
  }

  async function saveCredential(value: Credential, form?: HTMLFormElement) {
    const currentKey = key.current;
    const epoch = generation.current;
    const id = editing?.id ?? crypto.randomUUID();
    const wasEditing = !!editing;
    if (!currentKey) return;
    await run(async () => {
      const payload = await encryptCredential(currentKey, id, value);
      if (epoch !== generation.current) return;
      await api(
        wasEditing ? `/credentials/${id}` : "/credentials",
        wasEditing ? "PUT" : "POST",
        wasEditing ? payload : { id, payload },
      );
      if (epoch !== generation.current) return;
      auditVersion.current++;
      setItems((previous) =>
        wasEditing
          ? previous.map((row) => (row.id === id ? { id, ...value } : row))
          : [...previous, { id, ...value }],
      );
      setFindings(null);
      setEditing(null);
      form?.reset();
      setMessage(`${value.type === "note" ? "Secure note" : value.type === "card" ? "Payment card" : "Credential"} saved`);
    });
  }

  async function removeCredential(id: string) {
    const epoch = generation.current;
    await run(async () => {
      await api(`/credentials/${id}`, "DELETE");
      if (epoch !== generation.current) return;
      auditVersion.current++;
      setItems((previous) => previous.filter((item) => item.id !== id));
      setFindings(null);
      setRevealed((previous) => previous.filter((value) => value !== id));
      if (editing?.id === id) setEditing(null);
    });
  }

  async function auditVault() {
    const epoch = generation.current;
    const version = ++auditVersion.current;
    const client = (breachClient.current ??= new PwnedPasswordsClient());
    setFindings(auditCredentials(items));
    await run(async () => {
      const result = await auditWithBreaches(items, client);
      if (epoch !== generation.current || version !== auditVersion.current)
        return;
      setFindings(result);
      setMessage("Audit complete");
    });
  }

  async function importCredentials(values: Credential[]): Promise<boolean> {
    const currentKey = key.current;
    const epoch = generation.current;
    if (!currentKey || values.length === 0) return false;
    let imported = false;
    await run(async () => {
      const known = new Set(items.map(credentialIdentity));
      const encrypted = await Promise.all(
        values.filter((value) => {
          const identity = credentialIdentity(value);
          if (known.has(identity)) return false;
          known.add(identity);
          return true;
        }).map(async (value) => {
          const id = crypto.randomUUID();
          return {
            item: { id, ...value },
            payload: await encryptCredential(currentKey, id, value),
          };
        }),
      );
      if (epoch !== generation.current) return;
      for (const row of encrypted) {
        if (epoch !== generation.current) return;
        try {
          await api("/credentials", "POST", { id: row.item.id, payload: row.payload });
        } catch (error) {
          if (epoch === generation.current) {
            try {
              const stored = await api<StoredCredential[]>("/credentials");
              const decoded = await Promise.all(stored.map(async (record) => ({
                id: record.id,
                ...(await decryptCredential(currentKey, record.id, record.payload)),
              })));
              if (epoch === generation.current) {
                setItems(decoded);
                setFindings(null);
                auditVersion.current++;
              }
            } catch {
              if (epoch === generation.current) lock();
            }
          }
          throw error;
        }
        if (epoch !== generation.current) return;
        auditVersion.current++;
        setItems((previous) => [...previous, row.item]);
        setFindings(null);
      }
      setMessage(`${encrypted.length} credential${encrypted.length === 1 ? "" : "s"} imported`);
      imported = true;
    });
    return imported;
  }

  async function logout() {
    softLockKeyRef.current = null;
    setHasActiveBioSession(false);
    broadcastLock(true);
    await run(async () => {
      await api("/auth/logout", "POST", {});
      setUser(null);
      setMetadata(null);
      setMessage("Logged out");
    });
  }

  async function changeMasterPassword(newPassword: string) {
    const currentKey = key.current;
    if (!currentKey) {
      throw new Error("Vault must be unlocked to change master password");
    }
    await run(async () => {
      const { newKey, metadata: newMeta, reEncrypted } = await prepareRekey(
        newPassword,
        items,
      );
      await api("/vault/rekey", "PUT", {
        metadata: newMeta,
        credentials: reEncrypted,
      });
      setMetadata(newMeta);
      key.current = newKey;
      if (softLockKeyRef.current) {
        softLockKeyRef.current = newKey;
      }
      setMessage("Master Password changed and vault re-encrypted successfully.");
    });
  }

  async function deleteAccount(password: string) {
    await run(async () => {
      await api("/auth/account", "DELETE", { password });
      lock(true);
      setUser(null);
      setMetadata(null);
      setMessage("Your account and all encrypted vault records have been permanently deleted.");
    });
  }

  async function exportVault(format: "csv" | "encrypted-json") {
    await run(async () => {
      const dateStr = new Date().toISOString().slice(0, 10);
      if (format === "csv") {
        const csv = exportAsCSV(items);
        downloadFile(csv, `proactive_vault_${dateStr}.csv`, "text/csv;charset=utf-8;");
        setMessage("Vault exported to CSV.");
      } else {
        if (!metadata) throw new Error("Vault metadata missing");
        const stored = await api<StoredCredential[]>("/credentials");
        const json = exportAsEncryptedJSON(metadata, stored);
        downloadFile(json, `proactive_backup_${dateStr}.json`, "application/json;charset=utf-8;");
        setMessage("Encrypted vault backup exported to JSON.");
      }
    });
  }

  const value: VaultContextType = {
    user,
    ready,
    unlocked,
    metadata,
    items,
    findings,
    busy,
    message,
    revealed,
    editing,
    search,
    filterTab,
    sortOption,
    formType,
    copiedSecret,
    biometricsAvailable,
    biometricsEnrolled,
    hasActiveBioSession,
    showGenerator,
    showAttackGraph,
    setUser,
    setMessage,
    setSearch,
    setFilterTab,
    setSortOption,
    setFormType,
    setEditing,
    setShowGenerator,
    setShowAttackGraph,
    setRevealed,
    toggleRevealed,
    setCopiedSecret,
    run,
    authenticate,
    openVaultWithPassword,
    fastBiometricUnlock,
    toggleBiometrics,
    lock,
    broadcastLock,
    logout,
    saveCredential,
    removeCredential,
    auditVault,
    importCredentials,
    copySecret,
    changeMasterPassword,
    deleteAccount,
    exportVault,
  };

  return (
    <VaultContext.Provider value={value}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVault(): VaultContextType {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error("useVault must be used within a VaultProvider");
  }
  return context;
}
