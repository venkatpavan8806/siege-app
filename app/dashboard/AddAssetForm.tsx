"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddAssetForm() {
    const router = useRouter();
    const [url, setUrl] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch("/api/assets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url, name }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error ?? "Failed to add asset");
                setLoading(false);
                return;
            }

            setUrl("");
            setName("");
            setLoading(false);
            router.refresh();
        } catch {
            setError("Something went wrong. Try again.");
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="hud-panel relative overflow-hidden">
            {/* Terminal styling decorative line */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-[var(--kaiju-teal)] opacity-50" />

            <div className="mb-5">
                <label htmlFor="name" className="block text-[11px] uppercase tracking-[0.1em] text-[#8c9baf] mb-2 font-bold">
                    Target Identity
                </label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--kaiju-teal)] font-bold opacity-70">&gt;</span>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="hud-input pl-8"
                        placeholder="e.g. Core Database Server"
                    />
                </div>
            </div>

            <div className="mb-6">
                <label htmlFor="url" className="block text-[11px] uppercase tracking-[0.1em] text-[#8c9baf] mb-2 font-bold">
                    Network Locator (URL)
                </label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--kaiju-teal)] font-bold opacity-70">&gt;</span>
                    <input
                        id="url"
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        required
                        placeholder="https://example.com"
                        className="hud-input pl-8"
                    />
                </div>
            </div>

            {error && (
                <div className="bg-[rgba(255,42,42,0.1)] border border-[var(--breach-red)] p-3 mb-5 text-[var(--breach-red)] text-[13px] flex items-center gap-2">
                    <span className="font-bold">⚠ ERROR:</span> {error}
                </div>
            )}

            <div className="flex justify-end">
                <button type="submit" disabled={loading} className="hud-button w-full sm:w-auto">
                    {loading ? "INITIALIZING..." : "REGISTER ASSET"}
                </button>
            </div>
        </form>
    );
}