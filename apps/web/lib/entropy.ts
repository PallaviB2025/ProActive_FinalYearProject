// Character-Class Keyspace Entropy, Shannon Frequency Entropy & Multi-Tier GPU Cracking Simulator

export type CrackEstimate = {
  entropyBits: number;
  shannonEntropyBits: number;
  poolSize: number;
  onlineTime: string;
  workstationTime: string;
  gpuClusterTime: string;
  quantumTime: string;
  rating: "Critical" | "Weak" | "Moderate" | "Strong" | "Unbreakable";
};

export function calculatePoolSize(password: string): number {
  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/[0-9]/.test(password)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(password)) pool += 33;
  return Math.max(pool, 1);
}

export function shannonEntropy(password: string): number {
  if (!password) return 0;
  const freq = new Map<string, number>();
  for (const ch of password) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / password.length;
    entropy -= p * Math.log2(p);
  }
  return Math.round(entropy * password.length * 100) / 100;
}

export function formatCrackTime(seconds: number): string {
  if (seconds < 0.1) return "Instant";
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.round(minutes)} minutes`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)} hours`;
  const days = hours / 24;
  if (days < 30) return `${Math.round(days)} days`;
  const months = days / 30.44;
  if (months < 12) return `${Math.round(months)} months`;
  const years = days / 365.25;
  if (years < 100) return `${Math.round(years)} years`;
  const centuries = years / 100;
  if (centuries < 1000) return `${Math.round(centuries).toLocaleString()} centuries`;
  const millions = years / 1_000_000;
  if (millions < 1000) return `${Math.round(millions).toLocaleString()} million years`;
  return "Beyond age of the universe";
}

export function analyzeEntropy(password: string): CrackEstimate {
  if (!password) {
    return {
      entropyBits: 0,
      shannonEntropyBits: 0,
      poolSize: 0,
      onlineTime: "Instant",
      workstationTime: "Instant",
      gpuClusterTime: "Instant",
      quantumTime: "Instant",
      rating: "Critical",
    };
  }

  const pool = calculatePoolSize(password);
  const length = password.length;
  // Character-Class pool entropy: H = L * log2(R)
  const entropyBits = Math.round(length * Math.log2(pool));
  const shannonEntropyBits = shannonEntropy(password);

  // Measure repetition uniformity: ratio of observed Shannon entropy to max possible Shannon entropy
  const maxPossibleShannon = length > 1 ? length * Math.log2(length) : 1;
  const uniformity = length > 1 ? Math.min(1, Math.max(0, shannonEntropyBits / maxPossibleShannon)) : (shannonEntropyBits > 0 ? 1 : 0);
  const effectiveEntropy = Math.round(entropyBits * uniformity);

  // Combinations N = 2^effectiveEntropy. Average guesses needed = N / 2.
  // Use log math to prevent BigInt / Number overflow
  const log2Guesses = Math.max(0, effectiveEntropy - 1);

  // Attacker models (guesses per second):
  // 1. Throttled Online: 100/s (log2(100) ≈ 6.64)
  // 2. Fast Workstation: 100,000,000/s (log2(1e8) ≈ 26.58)
  // 3. 8x RTX 4090 GPU Rig: 100,000,000,000/s (log2(1e11) ≈ 36.54)
  // 4. Theoretical Supercomputer: 10^14/s (log2(1e14) ≈ 46.51)

  const calcSeconds = (rateLog2: number) => {
    if (effectiveEntropy <= 0) return 0;
    const diff = log2Guesses - rateLog2;
    if (diff <= 0) return 0;
    if (diff > 100) return Number.MAX_SAFE_INTEGER;
    return 2 ** diff;
  };

  const onlineSeconds = calcSeconds(6.643856);
  const workstationSeconds = calcSeconds(26.575425);
  const gpuClusterSeconds = calcSeconds(36.541209);
  const quantumSeconds = calcSeconds(46.506993);

  let rating: CrackEstimate["rating"] = "Critical";
  if (effectiveEntropy >= 80) rating = "Unbreakable";
  else if (effectiveEntropy >= 60) rating = "Strong";
  else if (effectiveEntropy >= 45) rating = "Moderate";
  else if (effectiveEntropy >= 30) rating = "Weak";

  return {
    entropyBits,
    shannonEntropyBits,
    poolSize: pool,
    onlineTime: formatCrackTime(onlineSeconds),
    workstationTime: formatCrackTime(workstationSeconds),
    gpuClusterTime: formatCrackTime(gpuClusterSeconds),
    quantumTime: formatCrackTime(quantumSeconds),
    rating,
  };
}
