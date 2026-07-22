"use server";

import { nanoid } from "nanoid";
import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { portfolioArtwork, portfolioImage } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/roles";
import { env } from "@/lib/env";

export type NewArtworkImage = { url: string; pathname: string; alt?: string };

export type NewArtworkInput = {
  title: string;
  description?: string;
  medium?: string;
  year?: string;
  dimensions?: string;
  images: NewArtworkImage[];
};

export async function createArtworkAction(input: NewArtworkInput) {
  const session = await requireAdmin();
  const title = input.title?.trim();
  if (!title) throw new Error("Title is required.");
  if (!input.images?.length) throw new Error("Add at least one image.");

  const [{ maxPos }] = await db
    .select({ maxPos: sql<number | null>`max(${portfolioArtwork.position})` })
    .from(portfolioArtwork);

  const id = nanoid();
  await db.insert(portfolioArtwork).values({
    id,
    title,
    description: input.description?.trim() || null,
    medium: input.medium?.trim() || null,
    year: input.year?.trim() || null,
    dimensions: input.dimensions?.trim() || null,
    position: (maxPos ?? -1) + 1,
    published: true,
    uploadedBy: session.user.id,
  });

  await db.insert(portfolioImage).values(
    input.images.map((im, idx) => ({
      id: nanoid(),
      artworkId: id,
      imageUrl: im.url,
      imagePathname: im.pathname,
      altText: im.alt?.trim() || null,
      position: idx,
    })),
  );

  revalidatePath("/portfolio");
  revalidatePath("/admin");
  return { id };
}

export async function deleteArtworkAction(id: string) {
  await requireAdmin();
  const imgs = await db
    .select()
    .from(portfolioImage)
    .where(eq(portfolioImage.artworkId, id));
  // Best-effort blob cleanup; DB cascade removes the image rows with the artwork.
  await Promise.allSettled(
    imgs.map((im) =>
      del(im.imageUrl, { token: env.BLOB_READ_WRITE_TOKEN }),
    ),
  );
  await db.delete(portfolioArtwork).where(eq(portfolioArtwork.id, id));
  revalidatePath("/portfolio");
  revalidatePath("/admin");
}
