import { describe, it, expect } from "vitest";
import { buildAttackGraph, detectCrownJewel } from "../../apps/web/lib/graph";
import type { LocalCredential } from "../../apps/web/lib/audit";

describe("Attack Graph & Blast Radius Engine", () => {
  it("identifies crown jewel services accurately", () => {
    expect(detectCrownJewel("mail.google.com").isCrownJewel).toBe(true);
    expect(detectCrownJewel("chase.com").isCrownJewel).toBe(true);
    expect(detectCrownJewel("aws.amazon.com").isCrownJewel).toBe(true);
    expect(detectCrownJewel("somerandomblog.org").isCrownJewel).toBe(false);
  });

  it("calculates identity hubs and cascading blast radius", () => {
    const items: LocalCredential[] = [
      { id: "1", website: "gmail.com", username: "alice@gmail.com", password: "SecretPassword1!" },
      { id: "2", website: "github.com", username: "alice@gmail.com", password: "SecretPassword1!" }, // Reused password & email
      { id: "3", website: "chase.com", username: "alice@gmail.com", password: "DifferentBankPassword9#" }, // Shared email
      { id: "4", website: "unrelated.io", username: "bob_dev", password: "UniquePassword456$" },
    ];

    const graph = buildAttackGraph(items);

    expect(graph.identityHubs.length).toBeGreaterThan(0);
    expect(graph.identityHubs[0]?.identity).toBe("alice@gmail.com");
    expect(graph.identityHubs[0]?.count).toBe(3);

    // Finding for gmail.com should be flagged as crown jewel with blast radius
    const gmailFinding = graph.findings.find((f) => f.website === "gmail.com");
    expect(gmailFinding?.isCrownJewel).toBe(true);
    expect(gmailFinding?.blastRadiusCount).toBeGreaterThan(0);
    expect(graph.overallNetworkRisk).not.toBe("Low");
  });
});
