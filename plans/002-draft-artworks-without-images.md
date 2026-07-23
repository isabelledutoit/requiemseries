# Plan — Allow image-less artworks as auto-hidden drafts (Option A)

## Context
Today an artwork can't be **created** without ≥1 image (blocked both client- and
server-side), but one can still **become** image-less by removing its last image — and the
public `/portfolio` would then render it as a bare title/meta block with no image (looks
broken), because `listPublishedArtworks` (`src/lib/db/queries.ts`) filters on `published`
only, not on having images. Isabelle wants to create a work now and add photos later
("come back when I have them"), clearly, without ever exposing an incomplete work publicly.

There is **no publish/unpublish toggle** in the admin today (`published` defaults to `true`
on create and is never changed via UI — only shown read-only as "· hidden"). So the
simplest, forget-proof design is **auto-managed visibility**: a work is public iff
`published = true AND it has ≥1 image`. An image-less work hides itself and re-appears
automatically once images are added (via the existing "Add images" flow) — no manual step.
This also closes the latent "removed last image → broken public block" bug.

## Changes

### 1. Allow image-less creation (relax the two guards)
- Client `src/app/admin/_admin-client.tsx` `createArtwork`: drop the
  `if (files.length === 0) … "Add at least one image."` check; keep Title required. The
  existing upload loop already no-ops on zero files.
- Server `src/app/admin/_actions.ts` `createArtworkAction`: remove
  `if (!input.images?.length) throw …`, and guard the image insert so it only runs when
  there are images (`db.insert(portfolioImage).values([])` throws on an empty array).

### 2. Public visibility requires ≥1 image (the real fix)
- `src/lib/db/queries.ts`: add an `EXISTS (SELECT 1 FROM portfolio_image WHERE artwork_id =
  a.id)` condition to **both** `listPublishedArtworks` and `countPublishedArtworks`,
  alongside the current `published = true AND deleted_at IS NULL`. Do it in SQL — not a JS
  `.filter` after limit/offset — so pagination and the page count stay correct and
  consistent. `attachImages` then always receives works that have images.
- Admin's `listAllArtworks` is unchanged: `/admin` still lists every work, drafts included.

### 3. Make the draft state clear in /admin
- WorkCard status line in `src/app/admin/_admin-client.tsx` (`{n} image(s){published ? "" :
  " · hidden"}`): add an explicit image-less state — when `images.length === 0`, show a
  badge/line like **"Draft — add images to publish (not on your portfolio yet)."**
- Create form: change the `Images *` label (drop the required `*`) to **"Images"** with a
  hint that the work stays a private draft until it has at least one image. Update the
  existing form hint text to match.
- Optional copy tweak: the remove-last-image confirm already warns the work will have no
  image; add that it will drop off the public portfolio until an image is added.

### Not doing
- No manual publish/unpublish toggle (none exists today; visibility is driven by image
  presence, which is simpler and can't be forgotten). The `published` column is left intact
  for future use.

## Files to modify
| File | Change |
|---|---|
| `src/app/admin/_admin-client.tsx` | relax create guard; draft badge; form label + hint |
| `src/app/admin/_actions.ts` | relax server guard; skip image insert when none |
| `src/lib/db/queries.ts` | require `EXISTS(images)` in `listPublishedArtworks` + `countPublishedArtworks` |
| `src/app/globals.css` | small `.art-list-sub.is-draft` accent style |

## Verification
1. `npm run build` / `npm run typecheck` — clean.
2. `/admin`: create a work with a title and **no images** → succeeds; Works list shows the
   "Draft — add images…" badge.
3. `/portfolio` (and its page count) does **not** include the draft.
4. Add an image to that work via "Add images" → it now appears on `/portfolio` and counts
   toward pages.
5. Remove the last image from a live work → it disappears from `/portfolio` (no bare block)
   and flips to the draft badge in admin.
6. The existing 2 works (with images) still render normally.
