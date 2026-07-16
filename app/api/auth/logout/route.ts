// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { requireAuth } from "@/lib/rbac";
import { record } from "@/lib/audit";

export async function POST() {
    // Still log who logged out, even though logging out doesn't require
    // a specific role — requireAuth() just confirms there IS a session
    // before we bother recording anything.
    const session = await requireAuth().catch(() => null);

    await destroySession();

    if (session) {
        await record({
            userId: session.userId,
            action: "LOGOUT",
            resourceType: "User",
            resourceId: session.userId,
        });
    }

    return NextResponse.json({ ok: true });
}