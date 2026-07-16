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
      return "var(--breach-red)";
    case "MEDIUM":
      return "var(--warning-amber)";
    case "LOW":
      return "var(--clear-green)";
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
    <div className="mt-3">
      <button onClick={handleCheck} disabled={loading} className="hud-button">
        {loading ? "Scanning..." : "Run Check"}
      </button>

      {error && (
        <div className="text-[var(--breach-red)] text-sm mt-2">⚠ {error}</div>
      )}

      {result && !result.changed && (
        <div className="text-gray-500 text-sm mt-2">
          ✓ No changes detected.
        </div>
      )}

      {result && result.changed && result.alert && (
        <div
          className={
            "mt-3 p-3 border border-[var(--border-dim)] bg-[var(--void-black)] " +
            (result.alert.severity === "HIGH" ? "pulse-glow" : "")
          }
        >
          <span
            className="inline-block px-2 py-0.5 text-xs font-bold uppercase tracking-wide"
            style={{
              color: "var(--void-black)",
              backgroundColor: severityColor(result.alert.severity),
            }}
          >
            {result.alert.severity}
          </span>
          <span className="ml-2 text-sm">
            Risk score: {result.alert.aiRiskScore}
          </span>
          {result.degraded && (
            <div className="text-[var(--warning-amber)] text-xs mt-1">
              Automated scoring unavailable — manual review needed.
            </div>
          )}
          {/* Plain text only. NEVER dangerouslySetInnerHTML here — this
              text traces back to attacker-controllable page content via
              the LLM (prompt-injection surface). */}
          <p className="mt-2 text-sm whitespace-pre-wrap">
            {result.alert.aiExplanation}
          </p>
        </div>
      )}
    </div>
  );
}