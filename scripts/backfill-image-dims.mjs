// One-time / reusable backfill: populate portfolio_image.width/height for rows
// created before those columns existed, by reading each stored Blob's real pixel
// dimensions. Idempotent — only touches rows still missing dimensions.
//
// Run: node scripts/backfill-image-dims.mjs
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { imageSize } from "image-size";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set (.env.local missing?).");
  process.exit(1);
}
const sql = neon(url);

const rows = await sql`
  SELECT id, image_url
  FROM portfolio_image
  WHERE width IS NULL OR height IS NULL
`;

if (rows.length === 0) {
  console.log("Nothing to backfill — all images already have dimensions.");
  process.exit(0);
}

console.log(`Backfilling ${rows.length} image(s)…`);
let ok = 0;
let failed = 0;
for (const row of rows) {
  try {
    const res = await fetch(row.image_url);
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const buf = new Uint8Array(await res.arrayBuffer());
    const { width, height, type } = imageSize(buf);
    if (!width || !height) throw new Error("no dimensions read");
    await sql`
      UPDATE portfolio_image
      SET width = ${width}, height = ${height}
      WHERE id = ${row.id}
    `;
    ok++;
    console.log(`  ok  ${row.id}  ${width}x${height} (${type})`);
  } catch (e) {
    failed++;
    console.warn(
      `  FAIL  ${row.id}  ${row.image_url}  — ${
        e instanceof Error ? e.message : e
      }`,
    );
  }
}
console.log(`Done. Updated ${ok}, failed ${failed}.`);
process.exit(failed > 0 ? 1 : 0);
