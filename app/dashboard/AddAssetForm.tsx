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
        <form onSubmit={handleSubmit} className="hud-panel mt-8">
            <h3 className="text-lg mt-0 mb-4">Register New Asset</h3>

            <div className="mb-4">
                <label htmlFor="name" className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
                    Name
                </label>
                <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="hud-input"
                />
            </div>

            <div className="mb-4">
                <label htmlFor="url" className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
                    Target URL
                </label>
                <input
                    id="url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                    placeholder="https://example.com"
                    className="hud-input"
                />
            </div>

            {error && (
                <p className="text-[var(--breach-red)] text-sm mb-4">⚠ {error}</p>
            )}

            <button type="submit" disabled={loading} className="hud-button">
                {loading ? "Registering..." : "Add Asset"}
            </button>
        </form>
    );
}