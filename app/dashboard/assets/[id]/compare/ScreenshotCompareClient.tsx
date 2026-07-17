"use client";

import { useState } from "react";

type Snapshot = {
    id: string;
    screenshotPath: string | null;
    capturedAt: string | Date;
};

function formatDate(d: string | Date) {
    return new Date(d).toLocaleString();
}

export default function ScreenshotCompareClient({
    snapshots,
}: {
    snapshots: Snapshot[];
}) {
    const [beforeId, setBeforeId] = useState(snapshots[1].id);
    const [afterId, setAfterId] = useState(snapshots[0].id);

    const before = snapshots.find((s) => s.id === beforeId)!;
    const after = snapshots.find((s) => s.id === afterId)!;

    return (
        <div className="hud-panel relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-[var(--kaiju-teal)] opacity-50" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-[10px] uppercase tracking-widest text-[var(--breach-red)] mb-2 font-bold flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-[var(--breach-red)]"></span>
                        Baseline (Before)
                    </label>
                    <select
                        className="hud-select"
                        value={beforeId}
                        onChange={(e) => setBeforeId(e.target.value)}
                    >
                        {snapshots.map((s) => (
                            <option key={s.id} value={s.id}>
                                {formatDate(s.capturedAt)}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] uppercase tracking-widest text-[var(--clear-green)] mb-2 font-bold flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-[var(--clear-green)]"></span>
                        Current State (After)
                    </label>
                    <select
                        className="hud-select"
                        value={afterId}
                        onChange={(e) => setAfterId(e.target.value)}
                    >
                        {snapshots.map((s) => (
                            <option key={s.id} value={s.id}>
                                {formatDate(s.capturedAt)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <h2 className="text-[11px] font-bold tracking-widest text-[#8c9baf] mb-3 uppercase">
                        Baseline Screenshot
                    </h2>
                    <div className="border border-[var(--border-dim)] bg-[rgba(5,8,11,0.5)] overflow-y-auto overflow-x-hidden max-h-[600px]">
                        {before.screenshotPath ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={before.screenshotPath}
                                alt="Baseline screenshot"
                                className="w-full h-auto block"
                            />
                        ) : (
                            <p className="text-[#8c9baf] text-[12px] tracking-widest p-6 text-center">
                                &gt; NO SCREENSHOT CAPTURED FOR THIS SNAPSHOT.
                            </p>
                        )}
                    </div>
                </div>
                <div>
                    <h2 className="text-[11px] font-bold tracking-widest text-[#8c9baf] mb-3 uppercase">
                        Current Screenshot
                    </h2>
                    <div className="border border-[var(--border-dim)] bg-[rgba(5,8,11,0.5)] min-h-[300px] flex items-center justify-center overflow-auto max-h-[600px]">
                        {after.screenshotPath ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={after.screenshotPath}
                                alt="Current screenshot"
                                className="w-full h-auto block"
                            />
                        ) : (
                            <p className="text-[#8c9baf] text-[12px] tracking-widest p-6 text-center">
                                &gt; NO SCREENSHOT CAPTURED FOR THIS SNAPSHOT.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
