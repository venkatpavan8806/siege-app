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
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="hud-panel w-full max-w-sm">
                <p className="text-xs tracking-widest text-[var(--kaiju-teal)] mb-1">
                    SYSTEM SIEGE // PS-005
                </p>
                <h1 className="text-2xl mb-6">Breach Command</h1>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="email" className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
                            Operator Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="hud-input"
                        />
                    </div>
                    <div className="mb-5">
                        <label htmlFor="password" className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
                            Access Code
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="hud-input"
                        />
                    </div>

                    {error && (
                        <p className="text-[var(--breach-red)] text-sm mb-4">
                            ⚠ {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="hud-button w-full"
                    >
                        {loading ? "Authenticating..." : "Initiate Session"}
                    </button>
                </form>
            </div>
        </div>
    );
}