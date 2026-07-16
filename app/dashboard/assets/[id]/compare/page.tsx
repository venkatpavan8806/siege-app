import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import SnapshotCompareClient from "./SnapshotCompareClient";

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
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-6">
                <h1 className="text-xl font-semibold">{asset.name}</h1>
                <p className="text-sm text-gray-500">{asset.url}</p>
            </div>

            {snapshots.length < 2 ? (
                <p className="text-gray-500">
                    Not enough snapshots yet to compare. Run a check at least twice to
                    see a comparison here.
                </p>
            ) : (
                <SnapshotCompareClient snapshots={snapshots} />
            )}
        </div>
    );
}