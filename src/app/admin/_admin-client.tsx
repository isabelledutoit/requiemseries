"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { artworkImagePathname } from "@/lib/blob";
import {
  createArtworkAction,
  addImagesToArtworkAction,
  updateArtworkAction,
  deleteArtworkAction,
} from "./_actions";
import { Dropzone } from "./_dropzone";
import { Tip, TipProvider } from "@/components/ui/tip";

const DEFAULT_MEDIUM = "Oil on canvas";
const DIMENSIONS_PLACEHOLDER = "36 x 48 in";

type ArtworkRow = {
  id: string;
  title: string;
  description: string;
  medium: string;
  year: string;
  dimensions: string;
  published: boolean;
  imageCount: number;
  coverUrl: string | null;
};

async function uploadOne(file: File) {
  const res = await upload(artworkImagePathname(file.name), file, {
    access: "public",
    handleUploadUrl: "/api/portfolio/upload",
    multipart: true,
  });
  return { url: res.url, pathname: res.pathname };
}

export function AdminClient({ artworks }: { artworks: ArtworkRow[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [medium, setMedium] = useState(DEFAULT_MEDIUM);
  const [year, setYear] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function createArtwork(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!title.trim()) return setErr("Title is required.");
    if (files.length === 0) return setErr("Add at least one image.");
    setBusy(true);
    try {
      const images: { url: string; pathname: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        setStatus(`Uploading ${i + 1} of ${files.length}…`);
        images.push(await uploadOne(files[i]));
      }
      setStatus("Saving…");
      await createArtworkAction({ title, medium, year, dimensions, description, images });
      // Only NOW clear — an actual new artwork was created. Medium resets to
      // its default (Isabelle's usual), not blank.
      setTitle("");
      setMedium(DEFAULT_MEDIUM);
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

  return (
    <TipProvider>
    <div className="admin-grid">
      <section className="admin-panel">
        <h2 className="admin-subtitle">New artwork</h2>
        <form className="art-form" onSubmit={createArtwork}>
          <label className="auth-field">
            <span>Title *</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <div className="art-form-row">
            <label className="auth-field">
              <span>Medium</span>
              <input value={medium} onChange={(e) => setMedium(e.target.value)} />
            </label>
            <label className="auth-field">
              <span>Year</span>
              <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2026" />
            </label>
          </div>
          <label className="auth-field">
            <span>Dimensions</span>
            <input
              value={dimensions}
              onChange={(e) => setDimensions(e.target.value)}
              placeholder={DIMENSIONS_PLACEHOLDER}
            />
          </label>
          <label className="auth-field">
            <span>Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </label>
          <div className="auth-field">
            <span>Images *</span>
            <Dropzone files={files} onFiles={setFiles} />
          </div>
          {err && <p className="auth-err">{err}</p>}
          {status && <p className="art-form-note">{status}</p>}
          <button type="submit" className="auth-btn" disabled={busy}>
            {busy ? "Working…" : "Create new artwork"}
          </button>
          <p className="art-form-hint">
            Creating clears the form. To add more images to or edit a work you
            already made, use the actions under Works to Edit, Add images or
            Delete.
          </p>
        </form>
      </section>

      <section className="admin-panel admin-works">
        <h2 className="admin-subtitle">Works ({artworks.length})</h2>
        {artworks.length === 0 ? (
          <p className="art-form-note">No artworks yet. Add your first on the left.</p>
        ) : (
          <ul className="art-list">
            {artworks.map((a) => (
              <WorkCard key={a.id} art={a} />
            ))}
          </ul>
        )}
      </section>
    </div>
    </TipProvider>
  );
}

function WorkCard({ art }: { art: ArtworkRow }) {
  const router = useRouter();
  const addRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  // Edit-form state, seeded from the artwork.
  const [title, setTitle] = useState(art.title);
  const [medium, setMedium] = useState(art.medium);
  const [year, setYear] = useState(art.year);
  const [dimensions, setDimensions] = useState(art.dimensions);
  const [description, setDescription] = useState(art.description);
  const [editErr, setEditErr] = useState<string | null>(null);

  function openEdit() {
    setTitle(art.title);
    setMedium(art.medium);
    setYear(art.year);
    setDimensions(art.dimensions);
    setDescription(art.description);
    setEditErr(null);
    setEditing(true);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setEditErr("Title is required.");
    setBusy("save");
    try {
      await updateArtworkAction(art.id, { title, medium, year, dimensions, description });
      setEditing(false);
      router.refresh();
    } catch (e) {
      setEditErr(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(null);
    }
  }

  async function onAddImages(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    setBusy("upload");
    try {
      const images: { url: string; pathname: string }[] = [];
      for (const f of picked) images.push(await uploadOne(f));
      await addImagesToArtworkAction(art.id, images);
      if (addRef.current) addRef.current.value = "";
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function onDelete() {
    if (!confirm(`Delete "${art.title}" and its images? This cannot be undone.`)) return;
    setBusy("delete");
    try {
      await deleteArtworkAction(art.id);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <li className="art-list-item">
      <div className="art-card-head">
        {art.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={art.coverUrl} alt="" className="art-thumb" />
        ) : (
          <div className="art-thumb art-thumb-empty" />
        )}
        <div className="art-list-meta">
          <span className="art-list-title">{art.title}</span>
          <span className="art-list-sub">
            {art.imageCount} image(s){art.published ? "" : " · hidden"}
          </span>
        </div>
        <div className="art-card-actions">
          <Tip label="Edit this work’s details">
            <button
              type="button"
              className="art-edit"
              onClick={() => (editing ? setEditing(false) : openEdit())}
              disabled={busy !== null}
            >
              {editing ? "Close" : "Edit"}
            </button>
          </Tip>
          <Tip label="Add more images to this work">
            <button
              type="button"
              className="art-add"
              onClick={() => addRef.current?.click()}
              disabled={busy !== null}
            >
              {busy === "upload" ? "Adding…" : "Add images"}
            </button>
          </Tip>
          <Tip label="Delete this work and its images">
            <button
              type="button"
              className="art-del"
              onClick={onDelete}
              disabled={busy !== null}
            >
              {busy === "delete" ? "…" : "Delete"}
            </button>
          </Tip>
          <input ref={addRef} type="file" accept="image/*" multiple hidden onChange={onAddImages} />
        </div>
      </div>

      {editing && (
        <form className="art-edit-form" onSubmit={saveEdit}>
          <label className="auth-field">
            <span>Title *</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <div className="art-form-row">
            <label className="auth-field">
              <span>Medium</span>
              <input value={medium} onChange={(e) => setMedium(e.target.value)} />
            </label>
            <label className="auth-field">
              <span>Year</span>
              <input value={year} onChange={(e) => setYear(e.target.value)} />
            </label>
          </div>
          <label className="auth-field">
            <span>Dimensions</span>
            <input
              value={dimensions}
              onChange={(e) => setDimensions(e.target.value)}
              placeholder={DIMENSIONS_PLACEHOLDER}
            />
          </label>
          <label className="auth-field">
            <span>Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </label>
          {editErr && <p className="auth-err">{editErr}</p>}
          <div className="art-edit-actions">
            <button type="submit" className="art-save" disabled={busy !== null}>
              {busy === "save" ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              className="art-cancel"
              onClick={() => setEditing(false)}
              disabled={busy !== null}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </li>
  );
}
