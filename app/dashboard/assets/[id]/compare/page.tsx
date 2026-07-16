import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import SnapshotCompareClient from "./SnapshotCompareClient";
import Link from "next/link";

export default async function ComparePage({
    params,
}: {
    params: { id: string };
}) {
    const session = await getSession();
    if (!session) {
        redirect("/login");
    }

    // Ownership check happens server-side against the DB — never trust the URL param alone.
    const asset = await prisma.asset.findUnique({
        where: { id: params.id },
    });

    if (!asset) {
        notFound();
    }

    // Mirror whatever ownership/role rule your other asset routes use.
    // Example assumes ADMIN can see all assets, ANALYST only their own — adjust to match your real rbac rule.
    const isOwner = asset.addedById === session.userId;
    const isAdmin = session.role === "ADMIN";
    if (!isOwner && !isAdmin) {
        notFound(); // return 404 rather than 403 to avoid confirming the asset exists to non-owners
    }

    const snapshots = await prisma.snapshot.findMany({
        where: { assetId: asset.id },
        orderBy: { capturedAt: "desc" },
        take: 50,
    });

    return (
        <div className="p-6 max-w-7xl mx-auto font-['JetBrains_Mono']">
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between border-b border-[var(--border-dim)] pb-4">
                <div>
                    <Link href="/dashboard" className="text-[10px] uppercase tracking-widest text-[var(--kaiju-teal)] hover:underline mb-3 inline-block">
                        &lt; Return to Command Center
                    </Link>
                    <div className="flex items-center gap-3 mb-1">
                        <span className="w-2 h-2 bg-[var(--warning-amber)] shadow-[0_0_8px_var(--warning-amber)]"></span>
                        <h1 className="text-3xl text-[#E8ECF1] font-['Oswald'] uppercase tracking-wider">{asset.name}</h1>
                    </div>
                    <p className="text-[12px] text-[#8c9baf] bg-[rgba(5,8,11,0.5)] border border-[var(--border-dim)] px-2 py-1 inline-block mt-1">
                        TARGET_URI: {asset.url}
                    </p>
                </div>
                <div className="mt-4 md:mt-0 text-right">
                    <p className="text-[10px] text-[#8c9baf] tracking-widest uppercase mb-1">Module</p>
                    <p className="text-[12px] font-bold text-[var(--warning-amber)] tracking-wider">SNAPSHOT DIFF ENGINE</p>
                </div>
            </div>

            {snapshots.length < 2 ? (
                <div className="hud-panel flex flex-col items-center justify-center min-h-[300px]">
                    <p className="text-[#8c9baf] text-[13px] tracking-widest leading-relaxed text-center">
                        &gt; INSUFFICIENT DATA POINTS.<br/>
                        &gt; RUN A CHECK AT LEAST TWICE TO GENERATE COMPARISON.<br/>
                        <span className="animate-pulse">_</span>
                    </p>
                </div>
            ) : (
                <SnapshotCompareClient snapshots={snapshots} />
            )}
        </div>
    );
}