import { and, asc, eq, isNull } from "drizzle-orm";
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
  const imgs = await db
    .select()
    .from(portfolioImage)
    .orderBy(asc(portfolioImage.position), asc(portfolioImage.createdAt));
  return arts.map((a) => ({
    ...a,
    images: imgs.filter((i) => i.artworkId === a.id),
  }));
}

// Public /portfolio — published, not soft-deleted, ordered.
export async function listPublishedArtworks(): Promise<ArtworkWithImages[]> {
  const arts = await db
    .select()
    .from(portfolioArtwork)
    .where(
      and(
        eq(portfolioArtwork.published, true),
        isNull(portfolioArtwork.deletedAt),
      ),
    )
    .orderBy(asc(portfolioArtwork.position), asc(portfolioArtwork.createdAt));
  return attachImages(arts);
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
