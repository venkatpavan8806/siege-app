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
        <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden scanline">
            <div className="hud-panel w-full max-w-sm relative z-10">
                <div className="text-center mb-8">
                    <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-[var(--kaiju-teal)] mb-2 opacity-80">
                        SYSTEM SIEGE // PS-005
                    </p>
                    <h1 className="text-3xl text-[#E8ECF1]">Breach Command</h1>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-5">
                        <label htmlFor="email" className="block text-[11px] uppercase tracking-[0.1em] text-[#8c9baf] mb-2 font-bold">
                            Operator Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="hud-input"
                            placeholder="operator@sys-siege.net"
                        />
                    </div>
                    <div className="mb-6">
                        <label htmlFor="password" className="block text-[11px] uppercase tracking-[0.1em] text-[#8c9baf] mb-2 font-bold">
                            Access Code
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="hud-input"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="bg-[rgba(255,42,42,0.1)] border border-[var(--breach-red)] p-3 mb-5 text-[var(--breach-red)] text-[13px] flex items-center gap-2">
                            <span className="font-bold">⚠ ERROR:</span> {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="hud-button w-full tracking-[0.15em]"
                    >
                        {loading ? "AUTHENTICATING..." : "INITIATE SESSION"}
                    </button>
                </form>
            </div>
            
            {/* Background decorative elements */}
            <div className="absolute top-10 left-10 text-[var(--border-dim)] text-[10px] font-bold tracking-widest hidden md:block">
                SYS.MONITOR // ONLINE<br/>
                NODE: 0x48A<br/>
                UPLINK: STABLE
            </div>
            <div className="absolute bottom-10 right-10 text-[var(--border-dim)] text-[10px] font-bold tracking-widest hidden md:block text-right">
                SEC_LEVEL: ALPHA<br/>
                ENCRYPTION: AES-256
            </div>
        </div>
    );
}