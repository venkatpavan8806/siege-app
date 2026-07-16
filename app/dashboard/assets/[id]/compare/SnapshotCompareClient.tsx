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
        <div>
            <div className="flex gap-4 mb-4 flex-wrap">
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Before</label>
                    <select
                        className="border rounded px-2 py-1 text-sm"
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
                    <label className="block text-xs text-gray-500 mb-1">After</label>
                    <select
                        className="border rounded px-2 py-1 text-sm"
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

            {beforeId === afterId ? (
                <p className="text-sm text-gray-500 mb-4">
                    Select two different snapshots to compare.
                </p>
            ) : (
                <p className="text-sm text-gray-600 mb-4">
                    {changedCount === 0
                        ? "No differences detected between these snapshots."
                        : `${changedCount} changed line(s) detected.`}
                </p>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <h2 className="text-sm font-medium mb-2">
                        {formatDate(before.capturedAt)}
                    </h2>
                    <pre className="border rounded p-3 text-xs overflow-auto max-h-[500px] whitespace-pre-wrap">
                        {beforeMarked.map((line, i) => (
                            <div
                                key={i}
                                className={line.changed ? "bg-red-100" : undefined}
                            >
                                {line.text || "\u00A0"}
                            </div>
                        ))}
                    </pre>
                </div>
                <div>
                    <h2 className="text-sm font-medium mb-2">
                        {formatDate(after.capturedAt)}
                    </h2>
                    <pre className="border rounded p-3 text-xs overflow-auto max-h-[500px] whitespace-pre-wrap">
                        {afterMarked.map((line, i) => (
                            <div
                                key={i}
                                className={line.changed ? "bg-green-100" : undefined}
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