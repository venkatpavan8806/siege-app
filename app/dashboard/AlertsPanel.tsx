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

  if (loading) return <p className="text-gray-500 mt-10">Loading alerts...</p>;

  return (
    <div className="mt-12">
      <h2 className="text-xl mb-4">Alerts</h2>

      {error && (
        <div className="text-[var(--breach-red)] text-sm mb-4">⚠ {error}</div>
      )}

      {alerts.length === 0 ? (
        <p className="text-gray-500">No alerts yet. Assets are clear.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="hud-panel hud-panel-accent"
              style={{ ["--accent-color" as any]: severityColor(alert.severity) }}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className="badge"
                  style={{ backgroundColor: severityColor(alert.severity) }}
                >
                  {alert.severity}
                </span>
                <strong className="text-base">{alert.asset.name}</strong>
                <span className="text-gray-500 text-xs uppercase tracking-wide">
                  {alert.status}
                </span>
              </div>

              <p className="mt-3 text-sm whitespace-pre-wrap">
                {alert.aiExplanation}
              </p>

              <p className="mt-2 text-sm text-[var(--kaiju-teal)]">
                <strong className="text-gray-400">Recommended action:</strong>{" "}
                {alert.recommendedAction}
              </p>

              {alert.status !== "RESOLVED" && (
                <div className="mt-4 flex gap-3">
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
                    Resolve
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