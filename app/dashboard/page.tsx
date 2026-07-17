import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AddAssetForm from "./AddAssetForm";
import LogoutButton from "./LogoutButton";
import CheckButton from "./CheckButton";
import AlertsPanel from "./AlertsPanel";
import Link from "next/link";
import ScanToggle from "./ScanToggle";
import VulnScanButton from "./VulnScanButton";
import BehavioralSignals from "./BehavioralSignals";
import DeleteAssetButton from "./DeleteAssetButton";

export default async function DashboardPage() {
    const session = await getSession();
    if (!session) {
        redirect("/login");
    }
    const assets = await prisma.asset.findMany({
        where: session.role === "ADMIN" ? {} : { addedById: session.userId },
        orderBy: { createdAt: "desc" },
    });
    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 font-['JetBrains_Mono']">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-[var(--border-dim)] pb-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="status-dot"></span>
                        <p className="text-[10px] font-bold tracking-[0.2em] text-[var(--kaiju-teal)] uppercase">
                            Global Threat Monitor // System Active
                        </p>
                    </div>
                    <h1 className="text-4xl text-[#E8ECF1] tracking-wider font-['Oswald']">Breach Command</h1>
                </div>
                <div className="mt-4 md:mt-0 flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-[#8c9baf] tracking-widest uppercase">Operator</p>
                        <p className="text-[12px] font-bold text-[var(--kaiju-teal)]">{session.role}</p>
                    </div>
                    <LogoutButton />
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-8 items-start">
                {/* LEFT COLUMN: Monitored Targets */}
                <div className="flex flex-col h-full">
                    <div className="flex justify-between items-center bg-[var(--hull-steel)] border border-[var(--border-dim)] p-3 mb-4">
                        <h2 className="text-lg text-[var(--kaiju-teal)] m-0 flex items-center gap-2">
                            <span className="text-[10px] opacity-70">&#9656;</span> Monitored Targets
                        </h2>
                        <span className="text-[11px] font-bold text-[#E8ECF1] bg-[var(--border-dim)] px-2 py-1 tracking-widest">
                            ACTIVE_UNITS: {assets.length}
                        </span>
                    </div>

                    {assets.length === 0 ? (
                        <div className="hud-panel flex-1 flex items-center justify-center min-h-[300px]">
                            <p className="text-center text-[#8c9baf] text-[13px] tracking-widest leading-relaxed">
                                &gt; NO CHASSIS REGISTERED.<br/>
                                &gt; DEPLOY NEW ASSET FROM REGISTRATION TERMINAL.<br/>
                                <span className="animate-pulse">_</span>
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {assets.map((asset, i) => (
                                <div
                                    key={asset.id}
                                    className="hud-panel hud-panel-compact fade-in-up"
                                    style={{ animationDelay: `${i * 0.08}s` }}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 bg-[var(--kaiju-teal)] shadow-[0_0_8px_var(--kaiju-teal)]" />
                                            <strong className="text-lg tracking-wide text-[#E8ECF1] font-['Oswald']">{asset.name}</strong>
                                        </div>
                                        <Link
                                            href={`/dashboard/assets/${asset.id}/compare`}
                                            className="text-[11px] uppercase tracking-widest text-[var(--warning-amber)] hover:text-[#fff] transition-colors border border-[var(--warning-amber)] px-2 py-1 hover:bg-[var(--warning-amber)]"
                                        >
                                            Snapshot Diff
                                        </Link>
                                    </div>
                                    <div className="text-[#A8B5C7] text-[13px] mb-4 p-2.5 bg-[rgba(5,8,11,0.5)] border border-[var(--border-dim)] font-mono truncate">
                                        {asset.url}
                                    </div>
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <CheckButton assetId={asset.id} />
                                        <ScanToggle assetId={asset.id} initialEnabled={asset.scanEnabled} />
                                    </div>
                                    <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                                        <VulnScanButton assetId={asset.id} />
                                        <DeleteAssetButton assetId={asset.id} assetName={asset.name} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Terminal & Alerts */}
                <div className="flex flex-col gap-8">
                    <div>
                        <div className="flex justify-between items-center bg-[var(--hull-steel)] border border-[var(--border-dim)] p-3 mb-4">
                            <h2 className="text-lg text-[#E8ECF1] m-0 flex items-center gap-2">
                                <span className="text-[10px] opacity-70">&#9656;</span> Registration Terminal
                            </h2>
                        </div>
                        <AddAssetForm />
                    </div>

                    <div className="flex-1">
                        <AlertsPanel />
                    </div>
                    <div>
                        <BehavioralSignals />
                    </div>
                </div>
            </div>
        </div>
    );
}