// Vercel Blob helpers for portfolio artwork images. The store is public
// (public showcase), so uploaded files get public URLs we store on the row.
// Uploads go browser -> Blob directly (see /api/portfolio/upload) to bypass
// the ~4.5MB serverless body limit.

export const MAX_IMAGE_BYTES = 50 * 1024 * 1024; // 50 MB per image

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

// Namespaced pathname; the upload token adds a random suffix so names never
// collide. Kept under the `portfolio/` prefix, which the token route enforces.
export function artworkImagePathname(filename: string): string {
  const base = (filename || "image")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `portfolio/${base || "image"}`;
}
