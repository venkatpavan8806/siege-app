"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteAssetButton({
  assetId,
  assetName,
}: {
  assetId: string;
  assetName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/assets/${assetId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Failed to delete asset.");
        setLoading(false);
        return;
      }

      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[#8c9baf] uppercase tracking-widest">
          Delete "{assetName}"?
        </span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-[10px] uppercase tracking-widest px-2 py-1 border border-[var(--breach-red)] bg-[var(--breach-red)] text-black font-bold"
        >
          {loading ? "..." : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="text-[10px] uppercase tracking-widest px-2 py-1 border border-[#8c9baf] text-[#8c9baf]"
        >
          Cancel
        </button>
        {error && (
          <span className="text-[10px] text-[var(--breach-red)]">{error}</span>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-[10px] uppercase tracking-widest px-2 py-1 border border-[#8c9baf] text-[#8c9baf] hover:border-[var(--breach-red)] hover:text-[var(--breach-red)] transition-colors"
    >
      Delete
    </button>
  );
}