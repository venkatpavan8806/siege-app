"use client";

import { useState } from "react";

type CheckResult = {
  changed: boolean;
  alert?: {
    aiRiskScore: number;
    aiExplanation: string;
    severity: string;
  };
  degraded?: boolean;
  error?: string;
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

export default function CheckButton({ assetId }: { assetId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheck() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/assets/${assetId}/check`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Check failed. Please try again.");
        setLoading(false);
        return;
      }

      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={handleCheck}
        disabled={loading}
        style={{ padding: "6px 12px", cursor: loading ? "default" : "pointer" }}
      >
        {loading ? "Checking..." : "Run Check"}
      </button>

      {error && (
        <div style={{ color: "#c0392b", fontSize: 14, marginTop: 6 }}>
          {error}
        </div>
      )}

      {result && !result.changed && (
        <div style={{ color: "#666", fontSize: 14, marginTop: 6 }}>
          No changes detected.
        </div>
      )}

      {result && result.changed && result.alert && (
        <div
          style={{
            marginTop: 8,
            padding: 10,
            border: "1px solid #ddd",
            borderRadius: 6,
          }}
        >
          <span
            style={{
              display: "inline-block",
              padding: "2px 8px",
              borderRadius: 4,
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: severityColor(result.alert.severity),
            }}
          >
            {result.alert.severity}
          </span>
          <span style={{ marginLeft: 8, fontSize: 14 }}>
            Risk score: {result.alert.aiRiskScore}
          </span>
          {result.degraded && (
            <div style={{ color: "#e67e22", fontSize: 12, marginTop: 4 }}>
              Automated scoring unavailable — manual review needed.
            </div>
          )}
          {/* Plain text only. NEVER dangerouslySetInnerHTML here — this
              text traces back to attacker-controllable page content via
              the LLM (prompt-injection surface). */}
          <p style={{ marginTop: 6, fontSize: 14, whiteSpace: "pre-wrap" }}>
            {result.alert.aiExplanation}
          </p>
        </div>
      )}
    </div>
  );
}