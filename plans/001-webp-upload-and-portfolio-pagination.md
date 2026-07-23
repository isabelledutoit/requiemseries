# Plan — WebP conversion in the upload pipeline + portfolio pagination

## Context

`/portfolio` currently serves **unoptimized, full-resolution originals**. Uploads go
straight from the admin's browser to Vercel Blob (bypassing the server, 50MB cap), with
**no resizing, no format conversion, no `next/image`** — a phone downloads the same file a
desktop does via a plain `<img src={blobUrl}>` (`src/app/portfolio/_slideshow.tsx:45`).
There is also **no pagination** — `listPublishedArtworks()` fetches every published
artwork with no `LIMIT` (`src/lib/db/queries.ts:27`). As the collection grows this makes
the page heavy and slow.

Two independent levers fix this, and **delivery is the bigger win**:

1. **Delivery** — adopt `next/image` on `/portfolio` so Vercel auto-serves **AVIF/WebP
   sized per device**, lazy-loaded. This alone turns multi-MB images into tens of KB and
   is what actually cures the "responsiveness stall." On the **Hobby plan** this is ~5K
   image transformations/month free — trivial for a personal art site.
2. **Source hygiene** — client-side **downscale + WebP compress on upload** so the stored
   Blob source is capped in size (cheaper storage, smaller source for the optimizer).

**Decisions locked with Emile:**
- Strategy: **`next/image` for delivery + client-side upload shrink** (both).
- Skip rule: **convert/downscale only when longest edge > 2560px OR file > 2MB**; smaller
  web-ready images pass through untouched.
- Pagination: **classic Next/Prev pages**, **10 artworks per page**, prefetch next page.

**Scope note:** this touches only `/portfolio` and `/admin` (the DB-driven surface). The
static Requiem landing (`public/requiem.html`, served at `/`) is **unchanged** — it is
static HTML that already lazy-loads via a `data-src` pattern and cannot use `next/image`.

---

## Part 1 — Client-side downscale + WebP on upload

**New dependency:** `browser-image-compression` (~19KB, WebP output, runs in a Web Worker
so the admin UI stays responsive, handles EXIF orientation). Only admin uploads, so the
client-bundle cost is on the admin route only.

**New file `src/lib/image-compress.ts`** (client util) exporting `compressForUpload(file)`:
- Read intrinsic dimensions via `createImageBitmap(file)` (fallback to `Image` + object URL).
- **Passthrough** (return the original `File` unchanged) when: `type === "image/gif"`
  (preserve animation) **OR** (`file.size <= 2MB` **AND** `max(width,height) <= 2560`).
- Otherwise compress with `maxWidthOrHeight: 2560`, `fileType: "image/webp"`,
  `initialQuality: 0.9`, `maxSizeMB: 8`, `useWebWorker: true`; return renamed to `.webp`.
- Constants (`MAX_EDGE = 2560`, `SIZE_THRESHOLD = 2 * 1024 * 1024`) at the top.

**Wire-in — single choke point:** `uploadOne(file)` at `src/app/admin/_admin-client.tsx:74`
now calls `compressForUpload(file)` before `upload()`. Covers create / add-images / replace.

**No server changes needed:** `image/webp` already in `ALLOWED_IMAGE_TYPES` (`src/lib/blob.ts:8`),
token route enforces it, `artworkImagePathname` keeps the extension. `MAX_IMAGE_BYTES` (50MB)
stays as the pre-compression ceiling.

**Caveat:** the stored file becomes the shrunk 2560px WebP — the original is not archived.
Fine for web (sRGB); bump `MAX_EDGE` to 3200 for more zoom detail if wanted.

---

## Part 2 — Adopt `next/image` on `/portfolio`

**`next.config.ts`** — add `images.remotePatterns` for `*.public.blob.vercel-storage.com`
plus `formats: ["image/avif", "image/webp"]`.

**`src/app/portfolio/_slideshow.tsx`** — replace both plain `<img>`:
- Stage: `<Image fill sizes="(min-width:1100px) 1100px, 100vw" className="pf-img" />` inside
  `.pf-stage` (already `position: relative`). `fill` avoids needing intrinsic dimensions.
- `priority?: boolean` prop; page.tsx passes it only for the first artwork on the page (LCP).
- Lightbox: `<Image fill sizes="100vw" quality={90} />`.
- Optional: preload the next slide (`idx+1`) hidden for instant arrow nav.

Admin thumbnails may optionally switch to `next/image` (low priority; admin-only).

---

## Part 3 — Pagination (Next/Prev, 10 per page)

**`src/lib/db/queries.ts`:** add `limit`/`offset` to `listPublishedArtworks`, add
`countPublishedArtworks()`, and scope `attachImages` with `inArray(artworkId, ids)`.

**`src/app/portfolio/page.tsx`:** `await searchParams`, `PAGE_SIZE = 10`, compute offset +
`totalPages`, pass `priority` to the first slideshow, render a Prev/Next footer with
`<Link href="/portfolio?page=N">` (Next.js prefetches the next page). Keep `force-dynamic`.

**`src/app/globals.css`:** `.pf-pagination`, `.pf-page-btn`, `.pf-page-status` on-brand.

---

## Preload / "load all at once" — recommended optimization

Don't literally preload all 10 (bandwidth competition). Instead: lazy-load each cover with
`priority` on only the first (LCP); the Next/Continue `<Link>` prefetches page 2's RSC
payload so paging is instant, then its AVIF/WebP images stream in already-sized. A
`loading="eager"` flip on the first row is available if eager per-page loading is wanted.

---

## Deferred (optional, not v1)

Add `width`/`height` integer columns to `portfolio_image` (dimensions are already read during
compression) → fixed-dimension `next/image` with zero CLS + blur placeholders. Costs a
Drizzle migration + `_actions.ts`/query/component plumbing. Ship v1 with `fill` first.

---

## Verification

1. `npm run build` / `npm run typecheck` — clean (`await searchParams`, next/image config).
2. `/portfolio` Network tab → `/_next/image?url=…&w=…` returning `image/avif|webp`, sized to
   viewport; mobile throttle fetches smaller widths.
3. `/admin` upload: >2MB or >2560px → stored `.webp`, smaller; small `.jpg` → passthrough.
4. Pagination: `PAGE_SIZE=2` (or 11+ works) → "Page 1 of N", Next→`?page=2`, Prev hidden on
   page 1 / Next hidden on last; hovering Next prefetches.
5. Lighthouse mobile pass on `/portfolio` for LCP/CLS improvement.
