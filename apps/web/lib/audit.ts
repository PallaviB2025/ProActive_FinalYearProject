import zxcvbn from "zxcvbn";
import type { Credential } from "@proactive/shared";
import type { BreachStatus, PwnedPasswordsClient } from "./hibp";
export type LocalCredential = Credential & { id: string };
export type Finding = {
  id: string;
  severity: "Low" | "Medium" | "High";
  reasons: string[];
  actions: string[];
  breach?: BreachStatus;
};
// Deliberately narrow: ASCII letter bases (>=6 letters), optional initial capital,
// and a terminal 1-4 digit or punctuation suffix. No fuzzy or substring matching.
export function similarBase(password: string): string | null {
  const match = /^([A-Za-z]{6,})([0-9!@#$%^&*?]{0,4})$/.exec(password);
  if (!match?.[1]) return null;
  const base = match[1];
  if (
    base !== base.toLowerCase() &&
    base !== base[0]?.toUpperCase() + base.slice(1).toLowerCase()
  )
    return null;
  return base.toLowerCase();
}

export async function auditWithBreaches(
  items: LocalCredential[],
  client: PwnedPasswordsClient,
): Promise<Finding[]> {
  const findings = auditCredentials(items);
  await Promise.all(
    items.map(async (item, index) => {
      const finding = findings[index]!;
      // Do not query HIBP for notes, cards, or items without passwords
      if (!item.password || item.type === "note" || item.type === "card") {
        return;
      }
      const breach = await client.check(item.password);
      finding.breach = breach;
      if (breach.status === "breached") {
        finding.severity = "High";
        finding.reasons.push(
          `Found in HIBP Pwned Passwords: ${breach.count} occurrences`,
        );
        finding.actions.push(
          "Change this password immediately on the affected service. Use a unique, randomly generated replacement.",
        );
      } else if (breach.status === "unavailable") {
        finding.actions.push(
          "Breach check unavailable. Local checks still apply; retry the audit later.",
        );
      }
    }),
  );
  return findings;
}
export function auditCredentials(items: LocalCredential[]): Finding[] {
  const exact = new Map<string, number>();
  const similar = new Map<string, Set<string>>();
  for (const item of items) {
    if (!item.password || item.type === "note" || item.type === "card") continue;
    exact.set(item.password, (exact.get(item.password) ?? 0) + 1);
    const base = similarBase(item.password);
    if (base) {
      const group = similar.get(base) ?? new Set<string>();
      group.add(item.password);
      similar.set(base, group);
    }
  }
  return items.map((item) => {
    if (item.type === "note") {
      return {
        id: item.id,
        severity: "Low",
        reasons: ["Encrypted secure note"],
        actions: ["Stored safely with AES-256-GCM zero-knowledge encryption."],
      };
    }
    if (item.type === "card") {
      return {
        id: item.id,
        severity: "Low",
        reasons: ["Encrypted payment card"],
        actions: ["Card credentials protected with AES-256-GCM zero-knowledge encryption."],
      };
    }
    if (!item.password) {
      return {
        id: item.id,
        severity: "Medium",
        reasons: ["No password set for this login"],
        actions: ["Add a strong, unique password if this account requires credentials."],
      };
    }
    const score = zxcvbn(item.password, [item.username, item.website]).score;
    const reasons: string[] = [];
    const actions: string[] = [];
    let severity: Finding["severity"] = "Low";
    if (score < 3) {
      severity = score < 2 ? "High" : "Medium";
      reasons.push(
        score < 2 ? "Very guessable password" : "Guessable password",
      );
      actions.push(
        "Replace with a long, randomly generated password or unrelated-word passphrase.",
      );
    }
    if ((exact.get(item.password) ?? 0) > 1) {
      severity = "High";
      reasons.push("Exact password reuse");
      actions.push("Use a different random password for each account.");
    }
    const base = similarBase(item.password);
    if (base && (similar.get(base)?.size ?? 0) > 1) {
      if (severity === "Low") severity = "Medium";
      reasons.push(
        "Similar pattern: same letter base with only capitalization or a short suffix changed",
      );
      actions.push(
        "Replace predictable variations with independent passwords.",
      );
    }
    if (!reasons.length) {
      reasons.push("No local weakness detected");
      actions.push(
        "Keep this password unique. Local checks do not establish breach status.",
      );
    }
    return { id: item.id, severity, reasons, actions };
  });
}
