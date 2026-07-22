"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { artworkImagePathname } from "@/lib/blob";
import { createArtworkAction, deleteArtworkAction } from "./_actions";

type ArtworkRow = {
  id: string;
  title: string;
  published: boolean;
  imageCount: number;
  coverUrl: string | null;
};

export function AdminClient({ artworks }: { artworks: ArtworkRow[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [medium, setMedium] = useState("");
  const [year, setYear] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!title.trim()) return setErr("Title is required.");
    if (files.length === 0) return setErr("Add at least one image.");
    setBusy(true);
    try {
      const images: { url: string; pathname: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setStatus(`Uploading ${i + 1} of ${files.length}…`);
        const result = await upload(artworkImagePathname(file.name), file, {
          access: "public",
          handleUploadUrl: "/api/portfolio/upload",
          multipart: true,
        });
        images.push({ url: result.url, pathname: result.pathname });
      }
      setStatus("Saving…");
      await createArtworkAction({
        title,
        medium,
        year,
        dimensions,
        description,
        images,
      });
      setTitle("");
      setMedium("");
      setYear("");
      setDimensions("");
      setDescription("");
      setFiles([]);
      setStatus(null);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string, title: string) {
    if (!confirm(`Delete "${title}" and its images? This cannot be undone.`))
      return;
    await deleteArtworkAction(id);
    router.refresh();
  }

  return (
    <div className="admin-grid">
      <section className="admin-panel">
        <h2 className="admin-subtitle">Add artwork</h2>
        <form className="art-form" onSubmit={submit}>
          <label className="auth-field">
            <span>Title *</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <div className="art-form-row">
            <label className="auth-field">
              <span>Medium</span>
              <input value={medium} onChange={(e) => setMedium(e.target.value)} placeholder="Oil on canvas" />
            </label>
            <label className="auth-field">
              <span>Year</span>
              <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2026" />
            </label>
          </div>
          <label className="auth-field">
            <span>Dimensions</span>
            <input value={dimensions} onChange={(e) => setDimensions(e.target.value)} placeholder="91 x 121 cm" />
          </label>
          <label className="auth-field">
            <span>Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </label>
          <label className="auth-field">
            <span>Images * (one artwork, many views)</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
          </label>
          {files.length > 0 && (
            <p className="art-form-note">{files.length} image(s) selected</p>
          )}
          {err && <p className="auth-err">{err}</p>}
          {status && <p className="art-form-note">{status}</p>}
          <button type="submit" className="auth-btn" disabled={busy}>
            {busy ? "Working…" : "Add artwork"}
          </button>
        </form>
      </section>

      <section className="admin-panel">
        <h2 className="admin-subtitle">
          Works ({artworks.length})
        </h2>
        {artworks.length === 0 ? (
          <p className="art-form-note">No artworks yet. Add your first above.</p>
        ) : (
          <ul className="art-list">
            {artworks.map((a) => (
              <li key={a.id} className="art-list-item">
                {a.coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.coverUrl} alt="" className="art-thumb" />
                )}
                <div className="art-list-meta">
                  <span className="art-list-title">{a.title}</span>
                  <span className="art-list-sub">
                    {a.imageCount} image(s){a.published ? "" : " · hidden"}
                  </span>
                </div>
                <button
                  type="button"
                  className="art-del"
                  onClick={() => remove(a.id, a.title)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
