"use client";

import { useEffect, useState } from "react";

type Alert = {
  id: string;
  aiRiskScore: number;
  aiExplanation: string;
  recommendedAction: string;
  severity: string;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  createdAt: string;
  asset: {
    id: string;
    name: string;
    url: string;
  };
};

function severityColor(severity: string): string {
  switch (severity) {
    case "HIGH":
      return "var(--breach-red)";
    case "MEDIUM":
      return "var(--warning-amber)";
    case "LOW":
      return "var(--clear-green)";
    default:
      return "#7f8c8d";
  }
}

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadAlerts() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/alerts");
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to load alerts.");
        return;
      }
      setAlerts(data.alerts);
    } catch {
      setError("Network error loading alerts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlerts();
  }, []);

  async function updateStatus(id: string, status: "ACKNOWLEDGED" | "RESOLVED") {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Failed to update alert.");
        return;
      }
      await loadAlerts();
    } catch {
      setError("Network error updating alert.");
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) return (
    <div className="mt-8 hud-panel flex items-center justify-center min-h-[200px]">
        <p className="text-[#8c9baf] tracking-widest text-sm animate-pulse">Scanning event logs...</p>
    </div>
  );

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3 mb-6 border-b border-[var(--border-dim)] pb-3">
        <div className="w-3 h-3 bg-[var(--breach-red)] shadow-[0_0_10px_var(--breach-red)] animate-pulse" />
        <h2 className="text-2xl text-[#E8ECF1] m-0">Active Threat Alerts</h2>
        <span className="ml-auto text-xs font-bold text-[var(--breach-red)] bg-[rgba(255,42,42,0.1)] border border-[var(--breach-red)] px-2 py-1 tracking-widest">
            {alerts.filter(a => a.status === 'OPEN').length} OPEN
        </span>
      </div>

      {error && (
        <div className="bg-[rgba(255,42,42,0.1)] border border-[var(--breach-red)] p-3 mb-5 text-[var(--breach-red)] text-[13px] flex items-center gap-2">
            <span className="font-bold">⚠ ERROR:</span> {error}
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="hud-panel bg-[rgba(0,211,100,0.05)] border-[var(--clear-green)]">
            <p className="text-[var(--clear-green)] text-center tracking-widest text-sm font-bold flex items-center justify-center gap-3 py-6">
                <span className="status-dot"></span> NO THREATS DETECTED. ALL SYSTEMS NOMINAL.
            </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`hud-panel hud-panel-accent ${alert.severity === 'HIGH' && alert.status === 'OPEN' ? 'pulse-glow-high' : alert.severity === 'MEDIUM' && alert.status === 'OPEN' ? 'pulse-glow-amber' : ''}`}
              style={{ ["--accent-color" as any]: severityColor(alert.severity) }}
            >
              <div className="flex justify-between items-start flex-wrap gap-4 border-b border-[var(--border-dim)] pb-3 mb-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className="badge text-[12px]"
                      style={{ backgroundColor: severityColor(alert.severity) }}
                    >
                      {alert.severity} RISK
                    </span>
                    <strong className="text-xl font-['Oswald'] tracking-wide">{alert.asset.name}</strong>
                  </div>
                  <div className="flex items-center gap-4">
                      <div className="text-right">
                          <div className="text-[10px] text-[#8c9baf] tracking-widest uppercase mb-1">AI Risk Score</div>
                          <div className="text-2xl font-bold font-['Oswald']" style={{ color: severityColor(alert.severity) }}>
                              {alert.aiRiskScore}
                          </div>
                      </div>
                      <span className={`text-[11px] uppercase tracking-widest font-bold px-2 py-1 border ${
                          alert.status === 'OPEN' ? 'border-[var(--breach-red)] text-[var(--breach-red)]' : 
                          alert.status === 'ACKNOWLEDGED' ? 'border-[var(--warning-amber)] text-[var(--warning-amber)]' : 
                          'border-[var(--clear-green)] text-[var(--clear-green)]'
                      }`}>
                        {alert.status}
                      </span>
                  </div>
              </div>

              <div className="mb-4">
                  <h4 className="text-[11px] text-[#8c9baf] tracking-widest uppercase mb-2">Analysis Report</h4>
                  <p className="text-[13px] leading-relaxed text-[#E8ECF1] bg-[rgba(5,8,11,0.5)] p-3 border border-[var(--border-dim)] font-mono whitespace-pre-wrap">
                    {alert.aiExplanation}
                  </p>
              </div>

              <div className="mb-5">
                  <h4 className="text-[11px] text-[#8c9baf] tracking-widest uppercase mb-2">Recommended Action</h4>
                  <p className="text-[13px] font-bold text-[var(--kaiju-teal)] flex items-start gap-2">
                    <span className="mt-1">&gt;</span> {alert.recommendedAction}
                  </p>
              </div>

              {alert.status !== "RESOLVED" && (
                <div className="mt-6 pt-4 border-t border-[var(--border-dim)] flex gap-3 justify-end">
                  {alert.status === "OPEN" && (
                    <button
                      onClick={() => updateStatus(alert.id, "ACKNOWLEDGED")}
                      disabled={updatingId === alert.id}
                      className="hud-button-outline"
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    onClick={() => updateStatus(alert.id, "RESOLVED")}
                    disabled={updatingId === alert.id}
                    className="hud-button"
                  >
                    Resolve Incident
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}