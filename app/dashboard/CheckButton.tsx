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
    <div className="mt-4">
      <button onClick={handleCheck} disabled={loading} className="hud-button w-full sm:w-auto text-[11px] px-4 py-2">
        {loading ? (
            <span className="flex items-center gap-2 justify-center">
                <span className="inline-block w-2 h-2 bg-current rounded-full animate-ping" /> SCANNING...
            </span>
        ) : "INITIATE SCAN"}
      </button>

      {error && (
        <div className="bg-[rgba(255,42,42,0.1)] border border-[var(--breach-red)] p-2 mt-3 text-[var(--breach-red)] text-[12px] flex items-center gap-2 fade-in-up">
            <span className="font-bold">⚠ ERROR:</span> {error}
        </div>
      )}

      {result && !result.changed && (
        <div className="bg-[rgba(0,211,100,0.1)] border border-[var(--clear-green)] p-2 mt-3 text-[var(--clear-green)] text-[12px] flex items-center gap-2 fade-in-up font-bold tracking-wider">
          ✓ NO ANOMALIES DETECTED. SYSTEM INTACT.
        </div>
      )}

      {result && result.changed && result.alert && (
        <div
          className={`mt-3 p-4 border bg-[var(--void-black)] fade-in-up ${
            result.alert.severity === "HIGH" ? "pulse-glow-high border-[var(--breach-red)]" : 
            result.alert.severity === "MEDIUM" ? "pulse-glow-amber border-[var(--warning-amber)]" : 
            "border-[var(--clear-green)]"
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
              <span
                className="badge text-[10px]"
                style={{
                  backgroundColor: severityColor(result.alert.severity),
                }}
              >
                {result.alert.severity}
              </span>
              <span className="text-[12px] tracking-widest font-bold text-[#E8ECF1]">
                RISK SCORE: <span style={{ color: severityColor(result.alert.severity) }}>{result.alert.aiRiskScore}</span>
              </span>
          </div>
          {result.degraded && (
            <div className="text-[var(--warning-amber)] text-[10px] tracking-widest uppercase mt-2 mb-2 bg-[rgba(240,165,0,0.1)] p-1 border border-[var(--warning-amber)]">
              ⚠ AUTOMATED SCORING OFFLINE — MANUAL REVIEW REQUIRED.
            </div>
          )}
          {/* Plain text only. NEVER dangerouslySetInnerHTML here — this
              text traces back to attacker-controllable page content via
              the LLM (prompt-injection surface). */}
          <p className="mt-3 text-[12px] leading-relaxed font-mono whitespace-pre-wrap text-[#8c9baf]">
            {result.alert.aiExplanation}
          </p>
        </div>
      )}
    </div>
  );
}