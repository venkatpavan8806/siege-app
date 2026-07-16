import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AddAssetForm from "./AddAssetForm";
import LogoutButton from "./LogoutButton";


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
        <div style={{ maxWidth: 720, margin: "40px auto", fontFamily: "sans-serif" }}>
            <h1>Dashboard</h1>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ color: "#666" }}>
                    Signed in as role: <strong>{session.role}</strong>
                </p>
                <LogoutButton />
            </div>

            <h2 style={{ marginTop: 32 }}>Monitored Assets</h2>

            {assets.length === 0 ? (
                <p style={{ color: "#888" }}>No assets yet. Add one below.</p>
            ) : (
                <ul style={{ listStyle: "none", padding: 0 }}>
                    {assets.map((asset) => (
                        <li
                            key={asset.id}
                            style={{
                                border: "1px solid #ddd",
                                borderRadius: 6,
                                padding: 12,
                                marginBottom: 8,
                            }}
                        >
                            <strong>{asset.name}</strong>
                            <div style={{ color: "#666", fontSize: 14 }}>{asset.url}</div>
                        </li>
                    ))}
                </ul>
            )}
            <AddAssetForm />
        </div>
    );
}