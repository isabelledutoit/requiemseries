// Client-side image preparation for the portfolio upload pipeline.
//
// Uploads go browser -> Vercel Blob directly (see src/app/admin/_admin-client.tsx
// and /api/portfolio/upload), so any resizing/format conversion has to happen in
// the browser before upload. We downscale oversized images and re-encode them to
// WebP so the stored source stays small; next/image then serves AVIF/WebP sized
// per device at render time.
//
// Only the admin (Isabelle) uploads, so the CPU cost of encoding is a non-issue,
// and browser-image-compression runs it in a Web Worker to keep the UI responsive.

import imageCompression from "browser-image-compression";

// Longest edge we keep. Full-screen fine art on a Retina display looks great at
// this; the lightbox reads it as the "full" image. Bump to 3200 for more zoom
// detail (roughly doubles stored file size).
export const MAX_EDGE = 2560;

// Below this size AND within MAX_EDGE, a web-ready image passes through untouched
// — no needless re-encode, original stays crisp.
export const SIZE_THRESHOLD = 2 * 1024 * 1024; // 2 MB

function toWebpName(name: string): string {
  const base = (name || "image").replace(/\.[^./\\]+$/, "");
  return `${base || "image"}.webp`;
}

// Read pixel dimensions without adding the image to the page. Prefer
// createImageBitmap (fast, decodes off the main thread); fall back to an <img>
// for engines/formats it can't decode. Returns null if dimensions are unknowable.
async function readDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file);
      const dims = { width: bmp.width, height: bmp.height };
      bmp.close();
      return dims;
    } catch {
      // Fall through to the <img> path.
    }
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export type PreparedUpload = {
  file: File;
  // Intrinsic size of the returned file (null if it couldn't be decoded). Stored
  // on the row so next/image can render frame-exact with no layout shift.
  width: number | null;
  height: number | null;
};

// Prepare a file for upload. Returns a downscaled WebP File when the source is
// oversized (longest edge > MAX_EDGE) or heavy (> SIZE_THRESHOLD); otherwise the
// original File, unchanged — plus the final file's pixel dimensions. Never throws:
// on any failure it returns the original so a bad encode can't block the upload
// (the server still enforces size/MIME).
export async function compressForUpload(file: File): Promise<PreparedUpload> {
  const dimsOf = async (f: File): Promise<PreparedUpload> => {
    const d = await readDimensions(f);
    return { file: f, width: d?.width ?? null, height: d?.height ?? null };
  };

  // GIFs may be animated; re-encoding to a still WebP would drop the animation.
  if (file.type === "image/gif") return dimsOf(file);

  const dims = await readDimensions(file);
  const longEdge = dims ? Math.max(dims.width, dims.height) : 0;
  const tooBig = file.size > SIZE_THRESHOLD;
  const tooWide = longEdge > MAX_EDGE; // 0 (unknown dims) is never "too wide"

  // Small + already web-sized → keep as-is. If dimensions were unreadable we fall
  // back to the size check alone.
  if (!tooBig && !tooWide) {
    return { file, width: dims?.width ?? null, height: dims?.height ?? null };
  }

  try {
    const out = await imageCompression(file, {
      maxWidthOrHeight: MAX_EDGE,
      fileType: "image/webp",
      initialQuality: 0.9, // favor quality for fine art
      maxSizeMB: 8, // generous ceiling so quality isn't over-crushed
      useWebWorker: true,
    });
    // The library preserves the source filename; give it a .webp name so the Blob
    // pathname/extension matches the actual encoding. Re-read dims (they changed
    // when downscaled).
    const webp = new File([out], toWebpName(file.name), { type: "image/webp" });
    return dimsOf(webp);
  } catch {
    return { file, width: dims?.width ?? null, height: dims?.height ?? null };
  }
}
