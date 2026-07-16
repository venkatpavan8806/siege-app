"use client";

import { useEffect, useState } from "react";

type Alert = {
  id: string;
  aiRiskScore: number;
  aiExplanation: string;
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
      return "#c0392b";
    case "MEDIUM":
      return "#e67e22";
    case "LOW":
      return "#27ae60";
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

  if (loading) return <p style={{ color: "#888" }}>Loading alerts...</p>;

  return (
    <div style={{ marginTop: 32 }}>
      <h2>Alerts</h2>

      {error && (
        <div style={{ color: "#c0392b", fontSize: 14, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {alerts.length === 0 ? (
        <p style={{ color: "#888" }}>No alerts yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {alerts.map((alert) => (
            <li
              key={alert.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 6,
                padding: 12,
                marginBottom: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: 4,
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                    backgroundColor: severityColor(alert.severity),
                  }}
                >
                  {alert.severity}
                </span>
                <strong>{alert.asset.name}</strong>
                <span style={{ color: "#666", fontSize: 13 }}>
                  ({alert.status})
                </span>
              </div>

              <p style={{ marginTop: 6, fontSize: 14, whiteSpace: "pre-wrap" }}>
                {alert.aiExplanation}
              </p>

              {alert.status !== "RESOLVED" && (
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  {alert.status === "OPEN" && (
                    <button
                      onClick={() => updateStatus(alert.id, "ACKNOWLEDGED")}
                      disabled={updatingId === alert.id}
                      style={{ padding: "4px 10px", cursor: "pointer" }}
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    onClick={() => updateStatus(alert.id, "RESOLVED")}
                    disabled={updatingId === alert.id}
                    style={{ padding: "4px 10px", cursor: "pointer" }}
                  >
                    Resolve
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}