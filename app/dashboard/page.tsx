import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AddAssetForm from "./AddAssetForm";
import LogoutButton from "./LogoutButton";
import CheckButton from "./CheckButton";
import AlertsPanel from "./AlertsPanel";
import Link from "next/link";

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
        <div className="max-w-6xl mx-auto py-8 px-4">
            <div className="hud-panel flex justify-between items-center mb-8">
                <div>
                    <p className="text-xs text-[var(--kaiju-teal)] tracking-wide mb-1">
                   
                    </p>
                    <h1 className="text-3xl">Breach Command</h1>
                </div>
                <LogoutButton />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-6 items-start">
                <div>
                    <div className="flex justify-between items-center border-b border-[var(--border-dim)] pb-2 mb-4">
                        <div className="flex items-center gap-2">
                            <span className="status-dot" />
                            <h2 className="text-xl">Monitored Targets</h2>
                        </div>
                        <span className="text-xs text-gray-500">
                            [ACTIVE_UNITS: {assets.length}]
                        </span>
                    </div>

                    {assets.length === 0 ? (
                        <div className="hud-panel">
                            <p className="text-center text-gray-500 text-sm py-8">
                                // NO CHASSIS REGISTERED. DEPLOY NEW ASSET FROM TERMINAL.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {assets.map((asset, i) => (
                                <div
                                    key={asset.id}
                                    className="hud-panel hud-panel-compact scanline fade-in-up"
                                    style={{ animationDelay: `${i * 0.06}s` }}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="status-dot" />
                                        <strong className="text-base">{asset.name}</strong>
                                    </div>
                                    <div className="text-gray-400 text-xs mb-3 truncate">{asset.url}</div>
                                    <CheckButton assetId={asset.id} />
                                    <div className="mt-2">
                                        <Link
                                            href={`/dashboard/assets/${asset.id}/compare`}
                                            className="text-[var(--kaiju-teal)] text-sm hover:underline"
                                        >
                                            Compare Snapshots
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <div className="border-b border-[var(--border-dim)] pb-2 mb-4">
                        <h2 className="text-xl">Registration Terminal</h2>
                    </div>
                    <AddAssetForm />
                </div>
            </div>

            <div className="mt-12">
                <AlertsPanel />
            </div>
        </div>
    );
}