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
                // Surface the server's own validation message rather than
                // re-implementing URL validation logic here.
                setError(data.error ?? "Failed to add asset");
                setLoading(false);
                return;
            }

            setUrl("");
            setName("");
            setLoading(false);
            router.refresh(); // re-fetches the server component's asset list
        } catch {
            setError("Something went wrong. Try again.");
            setLoading(false);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            style={{
                border: "1px solid #ddd",
                borderRadius: 6,
                padding: 16,
                marginTop: 16,
            }}
        >
            <h3 style={{ marginTop: 0 }}>Add Asset</h3>

            <div style={{ marginBottom: 12 }}>
                <label htmlFor="name" style={{ display: "block", marginBottom: 4 }}>
                    Name
                </label>
                <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{ width: "100%", padding: 8 }}
                />
            </div>

            <div style={{ marginBottom: 12 }}>
                <label htmlFor="url" style={{ display: "block", marginBottom: 4 }}>
                    URL
                </label>
                <input
                    id="url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                    placeholder="https://example.com"
                    style={{ width: "100%", padding: 8 }}
                />
            </div>

            {error && <p style={{ color: "crimson", marginBottom: 12 }}>{error}</p>}

            <button type="submit" disabled={loading} style={{ padding: "8px 16px" }}>
                {loading ? "Adding..." : "Add Asset"}
            </button>
        </form>
    );
}