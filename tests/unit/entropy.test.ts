import { describe, it, expect } from "vitest";
import { analyzeEntropy, calculatePoolSize, formatCrackTime, shannonEntropy } from "../../apps/web/lib/entropy";

describe("Shannon Entropy & GPU Cracking Simulator", () => {
  it("calculates pool size based on character variety", () => {
    expect(calculatePoolSize("abcdef")).toBe(26);
    expect(calculatePoolSize("abcABC")).toBe(52);
    expect(calculatePoolSize("abc123")).toBe(36);
    expect(calculatePoolSize("abc123!@#")).toBe(69);
  });

  it("evaluates weak passwords appropriately", () => {
    const analysis = analyzeEntropy("simple");
    expect(analysis.entropyBits).toBeLessThan(35);
    expect(["Critical", "Weak"]).toContain(analysis.rating);
    expect(analysis.gpuClusterTime).toBe("Instant");
  });

  it("evaluates strong passwords appropriately", () => {
    const analysis = analyzeEntropy("X9#mQ2$vL8!zW5@p");
    expect(analysis.entropyBits).toBeGreaterThanOrEqual(80);
    expect(analysis.rating).toBe("Unbreakable");
    expect(analysis.gpuClusterTime).toMatch(/centuries|million years|Beyond age of the universe/);
  });

  it("formats crack time durations properly", () => {
    expect(formatCrackTime(0.05)).toBe("Instant");
    expect(formatCrackTime(45)).toBe("45 seconds");
    expect(formatCrackTime(120)).toBe("2 minutes");
    expect(formatCrackTime(7200)).toBe("2 hours");
    expect(formatCrackTime(172800)).toBe("2 days");
  });

  it("calculates true Shannon frequency entropy", () => {
    expect(shannonEntropy("aaaaaaaaaa")).toBe(0);
    expect(shannonEntropy("k7#Rm2$pX@")).toBeGreaterThan(30);
  });

  it("penalizes highly repetitive passwords as Critical regardless of length", () => {
    const repetitive = analyzeEntropy("a".repeat(30));
    expect(repetitive.shannonEntropyBits).toBe(0);
    expect(repetitive.rating).toBe("Critical");
    expect(repetitive.gpuClusterTime).toBe("Instant");
  });
});
