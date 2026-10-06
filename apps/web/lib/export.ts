import type { VaultMetadata, StoredCredential } from "@proactive/shared";
import type { LocalCredential } from "./audit";

export function exportAsCSV(items: LocalCredential[]): string {
  const headers = [
    "website",
    "username",
    "password",
    "totpSecret",
    "note",
    "type",
    "cardholder",
    "cardNumber",
    "cardExpiry",
    "cardCvv",
  ];

  const escapeField = (val: string | undefined): string => {
    if (val === undefined || val === null) return "";
    let str = String(val);
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    if (/[",\r\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = items.map((item) =>
    [
      escapeField(item.website),
      escapeField(item.username),
      escapeField(item.password),
      escapeField(item.totpSecret),
      escapeField(item.note),
      escapeField(item.type || "login"),
      escapeField(item.cardholder),
      escapeField(item.cardNumber),
      escapeField(item.cardExpiry),
      escapeField(item.cardCvv),
    ].join(","),
  );

  return [headers.join(","), ...rows].join("\r\n");
}

export function exportAsEncryptedJSON(
  metadata: VaultMetadata,
  credentials: StoredCredential[],
): string {
  return JSON.stringify(
    {
      format: "ProActive-Encrypted-Vault",
      version: 1,
      exportedAt: new Date().toISOString(),
      vault: metadata,
      credentials,
    },
    null,
    2,
  );
}

export function downloadFile(
  content: string,
  filename: string,
  contentType: string,
): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
