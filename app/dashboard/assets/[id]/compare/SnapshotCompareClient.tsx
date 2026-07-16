"use client";

import { useState, useMemo } from "react";

type Snapshot = {
    id: string;
    contentHash: string;
    rawContentSanitized: string;
    capturedAt: string | Date;
};

function formatDate(d: string | Date) {
    return new Date(d).toLocaleString();
}

// Simple line-by-line diff — no external dependency.
// Marks each line as unchanged, removed (only in "before"), or added (only in "after").
function diffLines(before: string, after: string) {
    const beforeLines = before.split("\n");
    const afterLines = after.split("\n");

    const afterMarked = afterLines.map((line) => ({
        text: line,
        changed: !beforeLines.includes(line),
    }));
    const beforeMarked = beforeLines.map((line) => ({
        text: line,
        changed: !afterLines.includes(line),
    }));

    return { beforeMarked, afterMarked };
}

export default function SnapshotCompareClient({
    snapshots,
}: {
    snapshots: Snapshot[];
}) {
    // Default to the two most recent snapshots (index 0 = newest, per the server query's desc order)
    const [beforeId, setBeforeId] = useState(snapshots[1].id);
    const [afterId, setAfterId] = useState(snapshots[0].id);

    const before = snapshots.find((s) => s.id === beforeId)!;
    const after = snapshots.find((s) => s.id === afterId)!;

    const { beforeMarked, afterMarked } = useMemo(
        () => diffLines(before.rawContentSanitized, after.rawContentSanitized),
        [before, after]
    );

    const changedCount =
        beforeMarked.filter((l) => l.changed).length +
        afterMarked.filter((l) => l.changed).length;

    return (
        <div className="hud-panel relative overflow-hidden">
            {/* Terminal styling decorative line */}
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

            <div className="mb-6 border-y border-[var(--border-dim)] py-3">
                {beforeId === afterId ? (
                    <p className="text-[12px] text-[#8c9baf] tracking-widest font-bold">
                        &gt; SELECT TWO DISTINCT SNAPSHOTS TO INITIALIZE DIFF ENGINE.
                    </p>
                ) : (
                    <p className="text-[12px] tracking-widest font-bold flex items-center gap-2 text-[#E8ECF1]">
                        &gt; DIFF ANALYSIS: 
                        {changedCount === 0 ? (
                            <span className="text-[var(--clear-green)]">100% MATCH. NO ANOMALIES.</span>
                        ) : (
                            <span className="text-[var(--warning-amber)]">{changedCount} MUTATIONS DETECTED.</span>
                        )}
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <h2 className="text-[11px] font-bold tracking-widest text-[#8c9baf] mb-3 uppercase flex justify-between">
                        <span>Baseline Data</span>
                        <span className="opacity-60 font-mono">{before.contentHash.substring(0, 8)}</span>
                    </h2>
                    <pre className="diff-pre p-4 text-[12px] overflow-auto max-h-[600px] whitespace-pre-wrap leading-loose">
                        {beforeMarked.map((line, i) => (
                            <div
                                key={i}
                                className={`diff-line ${line.changed ? "diff-line-removed" : "diff-line-unchanged"}`}
                            >
                                {line.text || "\u00A0"}
                            </div>
                        ))}
                    </pre>
                </div>
                <div>
                    <h2 className="text-[11px] font-bold tracking-widest text-[#8c9baf] mb-3 uppercase flex justify-between">
                        <span>Current Data</span>
                        <span className="opacity-60 font-mono">{after.contentHash.substring(0, 8)}</span>
                    </h2>
                    <pre className="diff-pre p-4 text-[12px] overflow-auto max-h-[600px] whitespace-pre-wrap leading-loose">
                        {afterMarked.map((line, i) => (
                            <div
                                key={i}
                                className={`diff-line ${line.changed ? "diff-line-added" : "diff-line-unchanged"}`}
                            >
                                {line.text || "\u00A0"}
                            </div>
                        ))}
                    </pre>
                </div>
            </div>
        </div>
    );
}