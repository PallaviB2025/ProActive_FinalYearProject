"use client";

import type { AttackGraph, BlastRadiusFinding, IdentityHub } from "../../lib/graph";

interface AttackGraphModalProps {
  graph: AttackGraph;
  onClose: () => void;
  onSelectCredential?: (id: string) => void;
}

export function AttackGraphModal({ graph, onClose, onSelectCredential }: AttackGraphModalProps) {
  const riskBadgeColors = {
    Low: "bg-emerald-100 text-emerald-800 border-emerald-300",
    Elevated: "bg-amber-100 text-amber-800 border-amber-300",
    Severe: "bg-rose-100 text-rose-800 border-rose-300",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-50/90 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-bold text-base text-slate-900 tracking-tight">
                Attack Path & Blast Radius Inspector
              </h3>
              <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${riskBadgeColors[graph.overallNetworkRisk]}`}>
                {graph.overallNetworkRisk} Risk
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulates credential stuffing and identity cascading takeover paths across your vault.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-white">
          {/* Identity Hubs */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">
              Identity Hubs (Central Email Anchors)
            </h4>
            {graph.identityHubs.length === 0 ? (
              <p className="text-xs text-slate-500">No identity hubs detected yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {graph.identityHubs.slice(0, 4).map((hub: IdentityHub) => (
                  <div
                    key={hub.identity}
                    className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-1.5 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {hub.identity}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold whitespace-nowrap ${
                          hub.isPrimary
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : "bg-blue-100 text-blue-900 border border-blue-200"
                        }`}
                      >
                        {hub.count} accounts
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate">
                      Used on: {hub.services.slice(0, 3).join(", ")}{hub.services.length > 3 ? "..." : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Crown Jewels & Cascading Vulnerability Routes */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">
              Cascading Takeover Routes & Crown Jewels
            </h4>
            <div className="space-y-3">
              {graph.findings.slice(0, 6).map((finding: BlastRadiusFinding) => {
                const isHigh = finding.riskScore >= 70;
                const isMed = finding.riskScore >= 40 && !isHigh;
                return (
                  <div
                    key={finding.id}
                    className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                      isHigh
                        ? "bg-rose-50/50 border-rose-200 border-l-4 border-l-rose-500"
                        : isMed
                        ? "bg-amber-50/50 border-amber-200 border-l-4 border-l-amber-500"
                        : "bg-slate-50/60 border-slate-200 border-l-4 border-l-emerald-500"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">
                          {finding.website}
                        </span>
                        {finding.isCrownJewel && (
                          <span className="text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <span>👑</span> Crown Jewel
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-xs font-bold whitespace-nowrap ${
                          isHigh
                            ? "text-rose-700"
                            : isMed
                            ? "text-amber-700"
                            : "text-slate-600"
                        }`}
                      >
                        Risk Score: {finding.riskScore}/100
                      </span>
                    </div>

                    {finding.crownJewelType && (
                      <p className="text-xs text-purple-900 font-semibold">
                        Role: {finding.crownJewelType}
                      </p>
                    )}

                    {finding.vulnerabilities.length > 0 ? (
                      <ul className="text-xs text-slate-700 space-y-1 pl-4 list-disc leading-relaxed">
                        {finding.vulnerabilities.map((v, i) => (
                          <li key={i}>{v}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-emerald-800 font-medium">
                        ✓ Isolated credential — no shared passwords or cascading routes detected.
                      </p>
                    )}

                    {finding.blastRadiusCount > 0 && (
                      <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs">
                        <span className="text-slate-600">
                          Blast radius:{" "}
                          <strong className="text-rose-700 font-bold">
                            {finding.blastRadiusCount} linked account(s)
                          </strong>{" "}
                          vulnerable if breached
                        </span>
                        {onSelectCredential && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectCredential(finding.id);
                              onClose();
                            }}
                            className="font-bold text-blue-600 hover:text-blue-800 transition hover:underline"
                          >
                            Review credential →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Calculated client-side with zero-knowledge identity graph analysis.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
