"use client";

import { useEffect, useState } from "react";

type Signal = {
  type: "SCAN_GAP" | "ALERT_CLUSTER" | "RISING_RISK_TREND";
  message: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
};

type Synthesis = {
  summary: string;
  priorityAction: string;
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

function typeLabel(type: string): string {
  switch (type) {
    case "SCAN_GAP":
      return "SCAN GAP";
    case "ALERT_CLUSTER":
      return "ALERT CLUSTER";
    case "RISING_RISK_TREND":
      return "RISING RISK";
    default:
      return type;
  }
}

export default function BehavioralSignals() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [synthesis, setSynthesis] = useState<Synthesis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/analytics/behavioral");
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setError(data?.error || "Failed to load behavioral signals.");
          return;
        }
        setSignals(data.signals ?? []);
        setSynthesis(data.synthesis ?? null);
      } catch {
        setError("Network error loading behavioral signals.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="hud-panel flex items-center justify-center min-h-[120px]">
        <p className="text-[#8c9baf] tracking-widest text-sm animate-pulse">
          Analyzing behavioral patterns...
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center bg-[var(--hull-steel)] border border-[var(--border-dim)] p-3 mb-4">
        <h2 className="text-lg text-[#E8ECF1] m-0 flex items-center gap-2">
          <span className="text-[10px] opacity-70">▶</span> Behavioral Signals
        </h2>
        <span className="text-[11px] font-bold text-[#E8ECF1] bg-[var(--border-dim)] px-2 py-1 tracking-widest">
          {signals.length} DETECTED
        </span>
      </div>

      {synthesis && (
        <div className="hud-panel hud-panel-compact mb-4 border-[var(--kaiju-teal)]">
          <h4 className="text-[10px] text-[var(--kaiju-teal)] tracking-widest uppercase mb-2 font-bold">
            AI Synthesis
          </h4>
          <p className="text-[12px] text-[#E8ECF1] leading-relaxed mb-3">
            {synthesis.summary}
          </p>
          <h4 className="text-[10px] text-[#8c9baf] tracking-widest uppercase mb-1">
            Priority Action
          </h4>
          <p className="text-[12px] font-bold text-[var(--kaiju-teal)] flex items-start gap-2">
            <span className="mt-0.5">&gt;</span> {synthesis.priorityAction}
          </p>
        </div>
      )}

      {error && (
        <div className="bg-[rgba(255,42,42,0.1)] border border-[var(--breach-red)] p-3 mb-4 text-[var(--breach-red)] text-[12px]">
          {error}
        </div>
      )}

      {signals.length === 0 ? (
        <div className="hud-panel bg-[rgba(0,211,100,0.05)] border-[var(--clear-green)]">
          <p className="text-[var(--clear-green)] text-center tracking-widest text-[12px] font-bold py-4">
            NO ANOMALOUS PATTERNS DETECTED.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {signals.map((s, i) => (
            <div
              key={i}
              className="hud-panel hud-panel-compact"
              style={{ borderLeft: `3px solid ${severityColor(s.severity)}` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5"
                  style={{ color: severityColor(s.severity), border: `1px solid ${severityColor(s.severity)}` }}
                >
                  {s.severity}
                </span>
                <span className="text-[10px] text-[#8c9baf] uppercase tracking-widest">
                  {typeLabel(s.type)}
                </span>
              </div>
              {/* Plain text only — signal messages are built server-side
                  from asset names and counts, but rendered as plain JSX
                  text regardless, never dangerouslySetInnerHTML. */}
              <p className="text-[12px] text-[#E8ECF1] leading-relaxed">
                {s.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}