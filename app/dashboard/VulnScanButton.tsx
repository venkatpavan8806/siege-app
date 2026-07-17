"use client";

import { useState } from "react";

type VulnFinding = {
  id: string;
  category: "HEADERS" | "TRANSPORT" | "EXPOSURE" | "INFO_DISCLOSURE";
  finding: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
};

function severityColor(severity: string): string {
  switch (severity) {
    case "HIGH":
      return "text-[var(--breach-red)] border-[var(--breach-red)]";
    case "MEDIUM":
      return "text-[var(--warning-amber)] border-[var(--warning-amber)]";
    case "LOW":
      return "text-[var(--kaiju-teal)] border-[var(--kaiju-teal)]";
    default:
      return "text-[#8c9baf] border-[#8c9baf]";
  }
}

export default function VulnScanButton({ assetId }: { assetId: string }) {
  const [loading, setLoading] = useState(false);
  const [findings, setFindings] = useState<VulnFinding[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleScan() {
    setLoading(true);
    setError(null);
    setFindings(null);

    try {
      const res = await fetch(`/api/assets/${assetId}/vuln-scan`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Vulnerability scan failed.");
        return;
      }

      setFindings(data.findings ?? []);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <button
        onClick={handleScan}
        disabled={loading}
        className="text-[10px] uppercase tracking-widest px-2 py-1 border border-[var(--breach-red)] text-[var(--breach-red)] hover:bg-[var(--breach-red)] hover:text-black transition-colors"
      >
        {loading ? "SCANNING..." : "VULN SCAN"}
      </button>

      {error && (
        <p className="text-[10px] text-[var(--breach-red)] mt-2">{error}</p>
      )}

      {findings && findings.length === 0 && (
        <p className="text-[10px] text-[var(--kaiju-teal)] mt-2 tracking-widest">
          ✓ NO FINDINGS. TARGET CLEAN.
        </p>
      )}

      {findings && findings.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {findings.map((f) => (
            <div
              key={f.id}
              className={`border px-2 py-1.5 bg-[rgba(5,8,11,0.5)] ${severityColor(f.severity)}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-bold uppercase tracking-widest">
                  {f.severity}
                </span>
                <span className="text-[9px] text-[#8c9baf] uppercase tracking-widest">
                  {f.category}
                </span>
              </div>
              {/* Plain text only — never dangerouslySetInnerHTML, this
                  string is derived from response headers of an untrusted
                  target. */}
              <p className="text-[11px] text-[#E8ECF1] leading-relaxed">
                {f.finding}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}