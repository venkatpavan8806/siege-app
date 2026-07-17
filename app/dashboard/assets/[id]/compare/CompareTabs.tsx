"use client";

import { useState } from "react";
import SnapshotCompareClient from "./SnapshotCompareClient";
import ScreenshotCompareClient from "./ScreenshotCompareClient";

type Snapshot = {
    id: string;
    contentHash: string;
    rawContentSanitized: string;
    screenshotPath: string | null;
    capturedAt: string | Date;
};

export default function CompareTabs({ snapshots }: { snapshots: Snapshot[] }) {
    const [tab, setTab] = useState<"diff" | "screenshots">("diff");

    return (
        <div>
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setTab("diff")}
                    className={`text-[11px] uppercase tracking-widest px-4 py-2 border font-bold transition-colors ${
                        tab === "diff"
                            ? "bg-[var(--kaiju-teal)] text-[var(--void-black)] border-[var(--kaiju-teal)]"
                            : "bg-transparent text-[var(--kaiju-teal)] border-[var(--kaiju-teal)] hover:bg-[rgba(0,230,204,0.1)]"
                    }`}
                >
                    Snapshot Diff
                </button>
                <button
                    onClick={() => setTab("screenshots")}
                    className={`text-[11px] uppercase tracking-widest px-4 py-2 border font-bold transition-colors ${
                        tab === "screenshots"
                            ? "bg-[var(--kaiju-teal)] text-[var(--void-black)] border-[var(--kaiju-teal)]"
                            : "bg-transparent text-[var(--kaiju-teal)] border-[var(--kaiju-teal)] hover:bg-[rgba(0,230,204,0.1)]"
                    }`}
                >
                    View Screenshots
                </button>
            </div>

            {tab === "diff" ? (
                <SnapshotCompareClient snapshots={snapshots} />
            ) : (
                <ScreenshotCompareClient snapshots={snapshots} />
            )}
        </div>
    );
}
