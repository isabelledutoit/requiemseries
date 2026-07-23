"use server";

import { nanoid } from "nanoid";
import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { portfolioArtwork, portfolioImage } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/roles";
import { env } from "@/lib/env";

export type NewArtworkImage = {
  url: string;
  pathname: string;
  alt?: string;
  width?: number | null;
  height?: number | null;
};

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
  // Images are optional at creation — a work with none is a private draft that
  // stays off /portfolio until images are added (see visiblePublishedWhere).

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

  if (input.images?.length) {
    await db.insert(portfolioImage).values(
      input.images.map((im, idx) => ({
        id: nanoid(),
        artworkId: id,
        imageUrl: im.url,
        imagePathname: im.pathname,
        altText: im.alt?.trim() || null,
        width: im.width ?? null,
        height: im.height ?? null,
        position: idx,
      })),
    );
  }

  revalidatePath("/portfolio");
  revalidatePath("/admin");
  return { id };
}

export type UpdateArtworkInput = {
  title: string;
  description?: string;
  medium?: string;
  year?: string;
  dimensions?: string;
};

export async function updateArtworkAction(id: string, fields: UpdateArtworkInput) {
  await requireAdmin();
  const title = fields.title?.trim();
  if (!title) throw new Error("Title is required.");
  await db
    .update(portfolioArtwork)
    .set({
      title,
      description: fields.description?.trim() || null,
      medium: fields.medium?.trim() || null,
      year: fields.year?.trim() || null,
      dimensions: fields.dimensions?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(portfolioArtwork.id, id));
  revalidatePath("/portfolio");
  revalidatePath("/admin");
}

// Append more images to an existing artwork (Isabelle's full view + details).
export async function addImagesToArtworkAction(
  artworkId: string,
  images: NewArtworkImage[],
) {
  await requireAdmin();
  if (!images?.length) return;
  const [{ maxPos }] = await db
    .select({ maxPos: sql<number | null>`max(${portfolioImage.position})` })
    .from(portfolioImage)
    .where(eq(portfolioImage.artworkId, artworkId));
  const start = (maxPos ?? -1) + 1;
  await db.insert(portfolioImage).values(
    images.map((im, idx) => ({
      id: nanoid(),
      artworkId,
      imageUrl: im.url,
      imagePathname: im.pathname,
      altText: im.alt?.trim() || null,
      width: im.width ?? null,
      height: im.height ?? null,
      position: start + idx,
    })),
  );
  revalidatePath("/portfolio");
  revalidatePath("/admin");
}

// Replace a single image in place (keeps its position). Swaps the blob URL on
// the row and deletes the old blob.
export async function replaceImageAction(imageId: string, image: NewArtworkImage) {
  await requireAdmin();
  const [old] = await db
    .select()
    .from(portfolioImage)
    .where(eq(portfolioImage.id, imageId));
  if (!old) return;
  await db
    .update(portfolioImage)
    .set({
      imageUrl: image.url,
      imagePathname: image.pathname,
      width: image.width ?? null,
      height: image.height ?? null,
    })
    .where(eq(portfolioImage.id, imageId));
  if (old.imageUrl && old.imageUrl !== image.url) {
    await del(old.imageUrl, { token: env.BLOB_READ_WRITE_TOKEN }).catch(() => {});
  }
  revalidatePath("/portfolio");
  revalidatePath("/admin");
}

// Remove a single image from an artwork (blob + row).
export async function deleteImageAction(imageId: string) {
  await requireAdmin();
  const [img] = await db
    .select()
    .from(portfolioImage)
    .where(eq(portfolioImage.id, imageId));
  if (!img) return;
  await db.delete(portfolioImage).where(eq(portfolioImage.id, imageId));
  await del(img.imageUrl, { token: env.BLOB_READ_WRITE_TOKEN }).catch(() => {});
  revalidatePath("/portfolio");
  revalidatePath("/admin");
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
