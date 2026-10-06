// Real WebAuthn / Windows Hello & Touch ID Platform Authenticator Integration
// Uses @simplewebauthn/browser with server-side challenge and cryptographic signature verification

import {
  startRegistration,
  startAuthentication,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { api } from "./api";

const STORAGE_BIO_ENROLLED = "proactive_bio_enrolled";

export async function isBiometricsAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function isBiometricsEnrolled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_BIO_ENROLLED) === "true";
}

export async function fetchBiometricsEnrolled(): Promise<boolean> {
  try {
    const res = await api<{ enrolled: boolean }>("/auth/webauthn/status");
    if (typeof window !== "undefined") {
      if (res.enrolled) {
        localStorage.setItem(STORAGE_BIO_ENROLLED, "true");
      } else {
        localStorage.removeItem(STORAGE_BIO_ENROLLED);
      }
    }
    return res.enrolled;
  } catch {
    return isBiometricsEnrolled();
  }
}

const STORAGE_BIO_ENVELOPE = "proactive_bio_envelope";
const STORAGE_BIO_KEY = "proactive_bio_key";

export function hasBioSession(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    sessionStorage.getItem(STORAGE_BIO_ENVELOPE) &&
      sessionStorage.getItem(STORAGE_BIO_KEY),
  );
}

export function clearBioSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_BIO_ENVELOPE);
  sessionStorage.removeItem(STORAGE_BIO_KEY);
}

export async function storeBioSession(masterPassword: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const rawKey = crypto.getRandomValues(new Uint8Array(32));
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      rawKey,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"],
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(masterPassword);
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      encoded,
    );
    sessionStorage.setItem(STORAGE_BIO_KEY, btoa(String.fromCharCode(...rawKey)));
    sessionStorage.setItem(
      STORAGE_BIO_ENVELOPE,
      JSON.stringify({
        iv: btoa(String.fromCharCode(...iv)),
        ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
      }),
    );
  } catch (err) {
    console.warn("Could not store biometric session:", err);
  }
}

export async function retrieveBioSession(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const rawKeyStr = sessionStorage.getItem(STORAGE_BIO_KEY);
    const envelopeStr = sessionStorage.getItem(STORAGE_BIO_ENVELOPE);
    if (!rawKeyStr || !envelopeStr) return null;
    const rawKey = Uint8Array.from(atob(rawKeyStr), (c) => c.charCodeAt(0));
    const envelope = JSON.parse(envelopeStr) as { iv: string; ciphertext: string };
    const iv = Uint8Array.from(atob(envelope.iv), (c) => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(envelope.ciphertext), (c) => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      rawKey,
      { name: "AES-GCM" },
      false,
      ["decrypt"],
    );
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      ciphertext,
    );
    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.warn("Could not retrieve biometric session:", err);
    return null;
  }
}

export async function clearBiometrics(): Promise<void> {
  clearBioSession();
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_BIO_ENROLLED);
    localStorage.removeItem("proactive_bio_credential_id");
    localStorage.removeItem("proactive_bio_user_id");
  }
  try {
    await api("/auth/webauthn", "DELETE");
  } catch (err) {
    console.warn("Could not delete biometrics on server:", err);
  }
}

export async function registerBiometricUnlock(): Promise<boolean> {
  if (!(await isBiometricsAvailable())) return false;

  try {
    const options = await api<PublicKeyCredentialCreationOptionsJSON>(
      "/auth/webauthn/register/options",
      "POST",
      {},
    );

    const attestation = await startRegistration({ optionsJSON: options });

    const result = await api<{ ok: boolean; verified: boolean }>(
      "/auth/webauthn/register/verify",
      "POST",
      { response: attestation },
    );

    if (result.verified) {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_BIO_ENROLLED, "true");
      }
      return true;
    }
    return false;
  } catch (error) {
    console.warn("Biometric enrollment cancelled or failed:", error);
    return false;
  }
}

export async function verifyBiometricUnlock(): Promise<{ ok: boolean; verified: boolean; ticket?: string }> {
  if (!(await isBiometricsAvailable())) return { ok: false, verified: false };

  try {
    const options = await api<PublicKeyCredentialRequestOptionsJSON>(
      "/auth/webauthn/authenticate/options",
      "POST",
      {},
    );

    const assertion = await startAuthentication({ optionsJSON: options });

    const result = await api<{ ok: boolean; verified: boolean; ticket?: string }>(
      "/auth/webauthn/authenticate/verify",
      "POST",
      { response: assertion },
    );

    return { ok: !!result.ok, verified: !!result.verified, ticket: result.ticket };
  } catch (error) {
    console.warn("Biometric verification rejected or cancelled:", error);
    return { ok: false, verified: false };
  }
}
