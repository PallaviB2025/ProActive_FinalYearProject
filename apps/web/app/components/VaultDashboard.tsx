"use client";

import React from "react";
import { useVault } from "../../lib/vault-context";
import { HeroBanner } from "./HeroBanner";
import { MetricCards } from "./MetricCards";
import { SecurityPrompt } from "./SecurityPrompt";
import { SecurityMissions } from "./SecurityMissions";
import { DashboardActionsAndScore } from "./DashboardActionsAndScore";
import { ToolsGrid } from "./ToolsGrid";

interface VaultDashboardProps {
  onNavigate?: (tab: string) => void;
}

export function VaultDashboard({ onNavigate }: VaultDashboardProps) {
  const { auditVault } = useVault();

  return (
    <div id="dashboard" className="space-y-6">
      {/* 1. Hero Banner */}
      <HeroBanner onNavigate={onNavigate} onRunAudit={auditVault} />

      {/* 2. 4 Metric Cards */}
      <MetricCards onNavigate={onNavigate} />

      {/* 3. Let's make your account more secure alert */}
      <SecurityPrompt onNavigate={onNavigate} />

      {/* 4. Proactive Security Missions */}
      <SecurityMissions onNavigate={onNavigate} />

      {/* 5. Recommended Actions (2 cols) + Security Score gauge (1 col) */}
      <DashboardActionsAndScore onNavigate={onNavigate} />

      {/* 6. Security Tools (3 grid items) */}
      <ToolsGrid onNavigate={onNavigate} />
    </div>
  );
}
