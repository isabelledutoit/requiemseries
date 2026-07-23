import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { purgeExpiredTrash } from "@/lib/portfolio/purge";

export const runtime = "nodejs";
// Never cache — must run fresh each invocation.
export const dynamic = "force-dynamic";

// Daily Vercel Cron (see vercel.json). Hard-deletes soft-deleted artworks whose
// retention window has elapsed, plus their blobs. Authenticated by CRON_SECRET,
// which Vercel sends as `Authorization: Bearer <CRON_SECRET>`. Fails closed:
// if CRON_SECRET is unset, or the header doesn't match, it 401s and does nothing.
export async function GET(request: Request): Promise<NextResponse> {
  const auth = request.headers.get("authorization");
  if (!env.CRON_SECRET || auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const purged = await purgeExpiredTrash();
  return NextResponse.json({ ok: true, purged });
}
