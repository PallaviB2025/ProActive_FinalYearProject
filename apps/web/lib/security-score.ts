import { auditCredentials, type Finding, type LocalCredential } from "./audit";

export interface SecurityScoreResult {
  score: number;
  scoreLabel: string;
  scoreColor: string;
  weakCount: number;
  reusedCount: number;
  breachedCount: number;
  strongCount: number;
  totpCount: number;
  activeFindings: Finding[];
  /** Number of actionable suggestions (0–3) */
  suggestionCount: number;
}

/**
 * Compute security score and all derived metrics from vault items and findings.
 * Centralised so every component shows consistent numbers.
 */
export function computeSecurityScore(
  items: LocalCredential[],
  findings: Finding[] | null,
): SecurityScoreResult {
  const activeFindings =
    findings ?? (items.length ? auditCredentials(items) : []);

  const weakCount = activeFindings.filter((f) =>
    f.reasons.some((r) => r.toLowerCase().includes("guessable")),
  ).length;

  const reusedCount = activeFindings.filter((f) =>
    f.reasons.some(
      (r) => r.includes("reuse") || r.includes("Similar pattern"),
    ),
  ).length;

  const breachedCount = activeFindings.filter(
    (f) => f.breach?.status === "breached",
  ).length;

  const totpCount = items.filter((i) => Boolean(i.totpSecret)).length;
  const strongCount = Math.max(
    0,
    items.length - weakCount - reusedCount - breachedCount,
  );

  // Score: meaningful only when vault has items
  let score = 0;
  if (items.length > 0) {
    score = Math.max(
      20,
      100 -
        breachedCount * 40 -
        reusedCount * 20 -
        weakCount * 15 -
        (findings === null ? 8 : 0),
    );
  }

  // Dynamic label & color
  let scoreLabel = "Good";
  let scoreColor = "#059669";
  if (items.length === 0) {
    scoreLabel = "—";
    scoreColor = "#94a3b8";
  } else if (breachedCount > 0 || score < 50) {
    scoreLabel = "High Risk";
    scoreColor = "#e11d48";
  } else if (weakCount > 0 || reusedCount > 0 || score < 75) {
    scoreLabel = "Needs Work";
    scoreColor = "#d97706";
  }

  // How many distinct suggestion categories are active
  const suggestionCount =
    (breachedCount > 0 ? 1 : 0) +
    (reusedCount > 0 ? 1 : 0) +
    (weakCount > 0 ? 1 : 0);

  return {
    score,
    scoreLabel,
    scoreColor,
    weakCount,
    reusedCount,
    breachedCount,
    strongCount,
    totpCount,
    activeFindings,
    suggestionCount,
  };
}
