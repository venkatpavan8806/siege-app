"use client";

import { useState } from "react";

export default function ScanToggle({
  assetId,
  initialEnabled,
}: {
  assetId: string;
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    const next = !enabled;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/assets/${assetId}/scan-toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanEnabled: next }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Failed to update scan status.");
        setLoading(false);
        return;
      }

      setEnabled(next);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`text-[10px] uppercase tracking-widest px-2 py-1 border transition-colors ${
          enabled
            ? "border-[var(--clear-green)] text-[var(--clear-green)] hover:bg-[var(--clear-green)] hover:text-black"
            : "border-[#8c9baf] text-[#8c9baf] hover:bg-[#8c9baf] hover:text-black"
        }`}
      >
        {loading
          ? "UPDATING..."
          : enabled
          ? "AUTO-SCAN: ON"
          : "AUTO-SCAN: OFF"}
      </button>
      {error && (
        <span className="text-[10px] text-[var(--breach-red)]">{error}</span>
      )}
    </div>
  );
}
