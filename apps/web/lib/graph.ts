// Identity Graph, Crown Jewel Detection, and Cascading Blast Radius Analysis
import type { LocalCredential } from "./audit";

export type IdentityHub = {
  identity: string;
  count: number;
  services: string[];
  isPrimary: boolean;
};

export type BlastRadiusFinding = {
  id: string;
  website: string;
  username: string;
  isCrownJewel: boolean;
  crownJewelType?: string;
  riskScore: number; // 0 - 100
  blastRadiusCount: number;
  impactedServices: string[];
  vulnerabilities: string[];
};

export type AttackGraph = {
  identityHubs: IdentityHub[];
  findings: BlastRadiusFinding[];
  highestRiskItem: BlastRadiusFinding | null;
  overallNetworkRisk: "Low" | "Elevated" | "Severe";
};

const EMAIL_PROVIDERS = [
  "gmail.com", "google.com", "outlook.com", "hotmail.com",
  "yahoo.com", "icloud.com", "proton.me", "protonmail.com"
];

const FINANCIAL_KEYWORDS = [
  "bank", "paypal", "stripe", "chase", "wells", "coinbase",
  "binance", "fidelity", "vanguard", "robinhood", "schwab"
];

const CLOUD_KEYWORDS = [
  "aws", "amazon", "github", "gitlab", "google cloud", "azure",
  "cloudflare", "digitalocean", "vercel"
];

export function detectCrownJewel(website: string): { isCrownJewel: boolean; type?: string } {
  const normalized = website.toLowerCase();
  if (EMAIL_PROVIDERS.some((provider) => normalized.includes(provider))) {
    return { isCrownJewel: true, type: "Primary Email Hub (Password Reset Origin)" };
  }
  if (FINANCIAL_KEYWORDS.some((kw) => normalized.includes(kw))) {
    return { isCrownJewel: true, type: "Financial / Banking Service" };
  }
  if (CLOUD_KEYWORDS.some((kw) => normalized.includes(kw))) {
    return { isCrownJewel: true, type: "Cloud / Developer Infrastructure" };
  }
  return { isCrownJewel: false };
}

function fastHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

export function buildAttackGraph(items: LocalCredential[]): AttackGraph {
  const identityToServices = new Map<string, Set<string>>();
  const passwordHashToServices = new Map<string, Set<string>>();

  for (const item of items) {
    if (item.username?.trim()) {
      const user = item.username.trim().toLowerCase();
      const existing = identityToServices.get(user) ?? new Set();
      existing.add(item.website);
      identityToServices.set(user, existing);
    }
    if (item.password?.trim()) {
      const h = fastHash(item.password);
      const existing = passwordHashToServices.get(h) ?? new Set();
      existing.add(item.website);
      passwordHashToServices.set(h, existing);
    }
  }

  const identityHubs: IdentityHub[] = Array.from(identityToServices.entries())
    .map(([identity, servicesSet]) => ({
      identity,
      count: servicesSet.size,
      services: Array.from(servicesSet),
      isPrimary: servicesSet.size >= 3,
    }))
    .sort((a, b) => b.count - a.count);

  const findings: BlastRadiusFinding[] = items.map((item) => {
    const user = item.username?.trim().toLowerCase();
    const { isCrownJewel, type: crownJewelType } = detectCrownJewel(item.website);

    const pwdHash = item.password ? fastHash(item.password) : "";
    const reusedServices = (pwdHash ? passwordHashToServices.get(pwdHash) ?? new Set<string>() : new Set<string>());
    const sharedIdentityServices = (user ? identityToServices.get(user) ?? new Set<string>() : new Set<string>());

    const impacted = new Set<string>();
    const vulnerabilities: string[] = [];

    // 1. Password reuse attack path
    if (reusedServices.size > 1) {
      reusedServices.forEach((s) => {
        if (s !== item.website) impacted.add(s);
      });
      vulnerabilities.push(
        `Credential Stuffing Route: Reuses password across ${reusedServices.size - 1} other service(s).`
      );
    }

    // 2. Crown jewel email takeover route
    if (isCrownJewel && crownJewelType?.includes("Email Hub")) {
      sharedIdentityServices.forEach((s) => {
        if (s !== item.website) impacted.add(s);
      });
      const linkedCount = sharedIdentityServices.size - 1;
      if (linkedCount > 0) {
        vulnerabilities.push(
          `Master Recovery Risk: As an email provider, compromising this unlocks reset links for ${linkedCount} other linked account${linkedCount === 1 ? "" : "s"}.`
        );
      }
    }

    let riskScore = 15;
    if (isCrownJewel) riskScore += 35;
    if (reusedServices.size > 1) riskScore += 30;
    if (impacted.size > 2) riskScore += 20;
    riskScore = Math.min(100, riskScore);

    return {
      id: item.id,
      website: item.website,
      username: item.username,
      isCrownJewel,
      crownJewelType,
      riskScore,
      blastRadiusCount: impacted.size,
      impactedServices: Array.from(impacted),
      vulnerabilities,
    };
  }).sort((a, b) => b.riskScore - a.riskScore);

  const highestRiskItem = findings[0] ?? null;
  const severeCount = findings.filter((f) => f.riskScore >= 70).length;
  const overallNetworkRisk: AttackGraph["overallNetworkRisk"] =
    severeCount > 0 ? "Severe" : findings.some((f) => f.riskScore >= 45) ? "Elevated" : "Low";

  return {
    identityHubs,
    findings,
    highestRiskItem,
    overallNetworkRisk,
  };
}
