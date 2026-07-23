import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "./client";
import {
  portfolioArtwork,
  portfolioImage,
  type PortfolioArtwork,
  type PortfolioImage,
} from "./schema";

export type ArtworkWithImages = PortfolioArtwork & { images: PortfolioImage[] };

async function attachImages(
  arts: PortfolioArtwork[],
): Promise<ArtworkWithImages[]> {
  if (arts.length === 0) return [];
  // Only fetch images for the artworks on this page (matters once paginated).
  const ids = arts.map((a) => a.id);
  const imgs = await db
    .select()
    .from(portfolioImage)
    .where(inArray(portfolioImage.artworkId, ids))
    .orderBy(asc(portfolioImage.position), asc(portfolioImage.createdAt));
  return arts.map((a) => ({
    ...a,
    images: imgs.filter((i) => i.artworkId === a.id),
  }));
}

// A work is publicly visible iff it is published, not soft-deleted, AND has at
// least one image. The image check hides freshly-created drafts (no images yet)
// and any work whose last image was removed — no manual publish step needed.
function visiblePublishedWhere() {
  return and(
    eq(portfolioArtwork.published, true),
    isNull(portfolioArtwork.deletedAt),
    sql`exists (select 1 from ${portfolioImage} where ${portfolioImage.artworkId} = ${portfolioArtwork.id})`,
  );
}

// Public /portfolio — visible works, ordered. Pass limit/offset to page; omit
// them to fetch every visible artwork (default).
export async function listPublishedArtworks(
  opts: { limit?: number; offset?: number } = {},
): Promise<ArtworkWithImages[]> {
  const where = visiblePublishedWhere();
  const arts =
    opts.limit != null
      ? await db
          .select()
          .from(portfolioArtwork)
          .where(where)
          .orderBy(
            asc(portfolioArtwork.position),
            asc(portfolioArtwork.createdAt),
          )
          .limit(opts.limit)
          .offset(opts.offset ?? 0)
      : await db
          .select()
          .from(portfolioArtwork)
          .where(where)
          .orderBy(
            asc(portfolioArtwork.position),
            asc(portfolioArtwork.createdAt),
          );
  return attachImages(arts);
}

// Total visible artworks (published + has images) — for the page count.
export async function countPublishedArtworks(): Promise<number> {
  const [row] = await db
    .select({ c: sql<number>`cast(count(*) as int)` })
    .from(portfolioArtwork)
    .where(visiblePublishedWhere());
  return Number(row?.c ?? 0);
}

// Admin — everything not hard-deleted.
export async function listAllArtworks(): Promise<ArtworkWithImages[]> {
  const arts = await db
    .select()
    .from(portfolioArtwork)
    .where(isNull(portfolioArtwork.deletedAt))
    .orderBy(asc(portfolioArtwork.position), asc(portfolioArtwork.createdAt));
  return attachImages(arts);
}
