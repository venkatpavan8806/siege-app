"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error ?? "Login failed");
                setLoading(false);
                return;
            }

            router.push("/dashboard");
        } catch {
            setError("Something went wrong. Try again.");
            setLoading(false);
        }
    }

    return (
        <div style={{ maxWidth: 360, margin: "80px auto", fontFamily: "sans-serif" }}>
            <h1 style={{ marginBottom: 24 }}>Sign in</h1>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 12 }}>
                    <label htmlFor="email" style={{ display: "block", marginBottom: 4 }}>
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ width: "100%", padding: 8 }}
                    />
                </div>

                <div style={{ marginBottom: 12 }}>
                    <label htmlFor="password" style={{ display: "block", marginBottom: 4 }}>
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ width: "100%", padding: 8 }}
                    />
                </div>

                {error && (
                    <p style={{ color: "crimson", marginBottom: 12 }}>{error}</p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    style={{ width: "100%", padding: 10, cursor: "pointer" }}
                >
                    {loading ? "Signing in..." : "Sign in"}
                </button>
            </form>
        </div>
    );
}