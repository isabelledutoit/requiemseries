import Link from "next/link";
import { requireAdmin } from "@/lib/auth/roles";
import { listAllArtworks } from "@/lib/db/queries";
import { SignOutButton } from "./_signout";
import { AdminClient } from "./_admin-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireAdmin();
  const artworks = await listAllArtworks();
  return (
    <main className="admin-wrap">
      <header className="admin-head">
        <div>
          <p className="auth-kicker">Requiem · Admin</p>
          <h1 className="admin-title">Portfolio</h1>
        </div>
        <div className="admin-user">
          <span>{session.user.name || session.user.email}</span>
          <Link href="/portfolio" className="admin-link">
            View portfolio →
          </Link>
          <SignOutButton />
        </div>
      </header>
      <AdminClient
        artworks={artworks.map((a) => ({
          id: a.id,
          title: a.title,
          published: a.published,
          imageCount: a.images.length,
          coverUrl: a.images[0]?.imageUrl ?? null,
        }))}
      />
    </main>
  );
}
