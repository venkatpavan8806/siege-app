"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DiscoverPagesButton({ assetId }: { assetId: string }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [links, setLinks] = useState<string[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);
    const [adding, setAdding] = useState(false);

    async function handleDiscover() {
        setOpen(true);
        setLoading(true);
        setError(null);
        setLinks([]);
        setSelected(new Set());

        try {
            const res = await fetch(`/api/assets/${assetId}/discover-pages`);
            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? "Failed to discover pages.");
            } else {
                setLinks(data.links ?? []);
            }
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    function toggle(link: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(link)) next.delete(link);
            else next.add(link);
            return next;
        });
    }

    function nameFromUrl(link: string): string {
        try {
            const u = new URL(link);
            const path = u.pathname.replace(/\/$/, "");
            return path ? `${u.hostname}${path}` : u.hostname;
        } catch {
            return link;
        }
    }

    async function handleAddSelected() {
        setAdding(true);
        setError(null);

        try {
            for (const link of selected) {
                const res = await fetch("/api/assets", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: link, name: nameFromUrl(link) }),
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => null);
                    setError(data?.error ?? `Failed to add ${link}`);
                    setAdding(false);
                    return;
                }
            }
            setOpen(false);
            setAdding(false);
            router.refresh();
        } catch {
            setError("Network error while adding assets.");
            setAdding(false);
        }
    }

    return (
        <>
            <button onClick={handleDiscover} className="hud-button-outline">
                Discover Pages
            </button>

            {open && (
                <div className="mt-3 border border-[var(--border-dim)] bg-[rgba(5,8,11,0.6)] p-4">
                    <div className="flex justify-between items-center mb-3">
                        <p className="text-[11px] uppercase tracking-widest text-[var(--kaiju-teal)] font-bold">
                            Discovered Pages
                        </p>
                        <button
                            onClick={() => setOpen(false)}
                            className="text-[10px] uppercase tracking-widest text-[#8c9baf] hover:text-[#fff]"
                        >
                            Close
                        </button>
                    </div>

                    {loading && (
                        <p className="text-[12px] text-[#8c9baf] tracking-widest">
                            &gt; SCANNING FOR LINKED PAGES...
                        </p>
                    )}

                    {error && (
                        <div className="bg-[rgba(255,42,42,0.1)] border border-[var(--breach-red)] p-2 mb-3 text-[var(--breach-red)] text-[12px]">
                            {error}
                        </div>
                    )}

                    {!loading && !error && links.length === 0 && (
                        <p className="text-[12px] text-[#8c9baf] tracking-widest">
                            &gt; NO SAME-DOMAIN PAGES FOUND.
                        </p>
                    )}

                    {links.length > 0 && (
                        <>
                            <div className="flex flex-col gap-2 mb-4 max-h-[240px] overflow-auto">
                                {links.map((link) => (
                                    <label
                                        key={link}
                                        className="flex items-center gap-2 text-[12px] text-[#D3D8E0] font-mono cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selected.has(link)}
                                            onChange={() => toggle(link)}
                                        />
                                        <span className="truncate">{link}</span>
                                    </label>
                                ))}
                            </div>
                            <button
                                onClick={handleAddSelected}
                                disabled={selected.size === 0 || adding}
                                className="hud-button"
                            >
                                {adding ? "ADDING..." : `ADD SELECTED (${selected.size})`}
                            </button>
                        </>
                    )}
                </div>
            )}
        </>
    );
}
