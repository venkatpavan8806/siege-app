// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { requireAuth } from "@/lib/rbac";
import { record } from "@/lib/audit";
import { allowLogout, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
    // Still log who logged out, even though logging out doesn't require
    // a specific role — requireAuth() just confirms there IS a session
    // before we bother recording anything.
    const session = await requireAuth().catch(() => null);

    // Key by userId when we have one (the common case); fall back to IP
    // for the rare unauthenticated call so that path is still bounded.
    const limitKey = session ? session.userId : getClientIp(req);
    if (!allowLogout(limitKey)) {
        return NextResponse.json(
            { error: "Too many requests. Please wait and try again." },
            { status: 429 }
        );
    }

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