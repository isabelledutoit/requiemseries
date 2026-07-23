import Link from "next/link";
import {
  countPublishedArtworks,
  listPublishedArtworks,
} from "@/lib/db/queries";
import { ArtworkSlideshow } from "./_slideshow";

export const dynamic = "force-dynamic";

// Artworks per page. Once the collection passes this, a Continue button opens the
// next page; Next.js prefetches it so paging feels instant.
const PAGE_SIZE = 10;

export const metadata = {
  title: "Portfolio — Isabelle du Toit",
  description: "Works by Isabelle du Toit.",
};

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const total = await countPublishedArtworks();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const requested = Number.parseInt(page ?? "1", 10);
  const pageNum = Math.min(
    Math.max(Number.isFinite(requested) ? requested : 1, 1),
    totalPages,
  );
  const artworks = await listPublishedArtworks({
    limit: PAGE_SIZE,
    offset: (pageNum - 1) * PAGE_SIZE,
  });

  return (
    <main className="pf-wrap">
      <header className="pf-head">
        <p className="auth-kicker">Isabelle du Toit</p>
        <h1 className="pf-heading">Portfolio</h1>
        <Link href="/" className="pf-back">
          ← Requiem
        </Link>
      </header>

      {total === 0 ? (
        <p className="pf-empty">Works coming soon.</p>
      ) : (
        artworks.map((a, i) => (
          <section key={a.id} className="pf-block">
            {i > 0 && <div className="pf-divider" aria-hidden="true" />}
            <h2 className="pf-title">{a.title}</h2>
            {(a.medium || a.year || a.dimensions) && (
              <p className="pf-meta">
                {[a.medium, a.dimensions, a.year].filter(Boolean).join("  ·  ")}
              </p>
            )}
            <ArtworkSlideshow
              title={a.title}
              // Only the first artwork on page 1 is the LCP; eager-load it.
              priority={pageNum === 1 && i === 0}
              images={a.images.map((im) => ({
                url: im.imageUrl,
                alt: im.altText ?? a.title,
                width: im.width,
                height: im.height,
              }))}
            />
            {a.description && <p className="pf-desc">{a.description}</p>}
          </section>
        ))
      )}

      {totalPages > 1 && (
        <nav className="pf-pagination" aria-label="Portfolio pages">
          {pageNum > 1 ? (
            <Link className="pf-page-btn" href={`/portfolio?page=${pageNum - 1}`}>
              ← Previous
            </Link>
          ) : (
            <span className="pf-page-btn is-disabled" aria-hidden="true">
              ← Previous
            </span>
          )}
          <span className="pf-page-status">
            Page {pageNum} of {totalPages}
          </span>
          {pageNum < totalPages ? (
            <Link className="pf-page-btn" href={`/portfolio?page=${pageNum + 1}`}>
              Continue →
            </Link>
          ) : (
            <span className="pf-page-btn is-disabled" aria-hidden="true">
              Continue →
            </span>
          )}
        </nav>
      )}
    </main>
  );
}
