import Link from "next/link";
import { listPublishedArtworks } from "@/lib/db/queries";
import { ArtworkSlideshow } from "./_slideshow";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Portfolio — Isabelle du Toit",
  description: "Works by Isabelle du Toit.",
};

export default async function PortfolioPage() {
  const artworks = await listPublishedArtworks();
  return (
    <main className="pf-wrap">
      <header className="pf-head">
        <p className="auth-kicker">Isabelle du Toit</p>
        <h1 className="pf-heading">Portfolio</h1>
        <Link href="/" className="pf-back">
          ← Requiem
        </Link>
      </header>

      {artworks.length === 0 ? (
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
              images={a.images.map((im) => ({
                url: im.imageUrl,
                alt: im.altText ?? a.title,
              }))}
            />
            {a.description && <p className="pf-desc">{a.description}</p>}
          </section>
        ))
      )}
    </main>
  );
}
