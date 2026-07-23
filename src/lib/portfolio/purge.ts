import "server-only";

import { and, eq, isNotNull, lt } from "drizzle-orm";
import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { portfolioArtwork, portfolioImage } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { TRASH_RETENTION_DAYS } from "@/lib/trash";

// Server-only trash helpers. Deliberately NOT in a "use server" module: every
// export there becomes a public server-action endpoint, and these run without an
// auth check. Callers gate access — purgeArtworkAction (requireAdmin) and the
// cron route (CRON_SECRET) — so these must stay un-exported as actions.

// Hard-delete one artwork: best-effort blob cleanup, then the row (the DB
// cascade removes its image rows).
export async function hardDeleteArtwork(id: string): Promise<void> {
  const imgs = await db
    .select()
    .from(portfolioImage)
    .where(eq(portfolioImage.artworkId, id));
  await Promise.allSettled(
    imgs.map((im) => del(im.imageUrl, { token: env.BLOB_READ_WRITE_TOKEN })),
  );
  await db.delete(portfolioArtwork).where(eq(portfolioArtwork.id, id));
}

// Hard-delete every soft-deleted artwork whose retention window has elapsed.
// Returns the count purged. Invoked by the daily cron.
export async function purgeExpiredTrash(): Promise<number> {
  const cutoff = new Date(
    Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  const expired = await db
    .select({ id: portfolioArtwork.id })
    .from(portfolioArtwork)
    .where(
      and(
        isNotNull(portfolioArtwork.deletedAt),
        lt(portfolioArtwork.deletedAt, cutoff),
      ),
    );
  for (const { id } of expired) await hardDeleteArtwork(id);
  if (expired.length) revalidatePath("/admin");
  return expired.length;
}
