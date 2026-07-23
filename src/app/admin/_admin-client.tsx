"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { artworkImagePathname } from "@/lib/blob";
import { compressForUpload } from "@/lib/image-compress";
import {
  createArtworkAction,
  addImagesToArtworkAction,
  updateArtworkAction,
  deleteArtworkAction,
  replaceImageAction,
  deleteImageAction,
  setArtworkPublishedAction,
  restoreArtworkAction,
  purgeArtworkAction,
  deleteBlobsAction,
} from "./_actions";
import { Dropzone } from "./_dropzone";
import { Tip, TipProvider } from "@/components/ui/tip";
import { ConfirmProvider, useConfirm } from "@/components/ui/confirm";
import { TRASH_RETENTION_DAYS, trashDaysLeft } from "@/lib/trash";

const DEFAULT_MEDIUM = "Oil on canvas";
const DIMENSIONS_PLACEHOLDER = "36 x 48 in";
// Prefill the year with the current year so Isabelle rarely has to touch it;
// still fully editable for older works.
const DEFAULT_YEAR = String(new Date().getFullYear());

// Grow a textarea to fit its content. Desktop has a drag handle; touch (iPad /
// iPhone Safari) does not, so a fixed-height box traps long text behind an inner
// scroll. Auto-sizing means the box always shows everything on every device.
function fitTextarea(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  // scrollHeight excludes the border; under box-sizing: border-box (Tailwind's
  // global default) the border must be added back or the last line gets clipped.
  const border = el.offsetHeight - el.clientHeight;
  el.style.height = `${el.scrollHeight + border}px`;
}

function AutoTextarea({
  value,
  onChange,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  value: string;
  onChange: React.ChangeEventHandler<HTMLTextAreaElement>;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  // Re-fit whenever the value changes — covers typing and the edit form opening
  // with an existing (possibly long) description already in state.
  useEffect(() => fitTextarea(ref.current), [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => {
        onChange(e);
        fitTextarea(e.currentTarget);
      }}
      {...rest}
    />
  );
}

type ArtworkRow = {
  id: string;
  title: string;
  description: string;
  medium: string;
  year: string;
  dimensions: string;
  published: boolean;
  coverUrl: string | null;
  images: { id: string; url: string }[];
};

type TrashRow = {
  id: string;
  title: string;
  coverUrl: string | null;
  imageCount: number;
  deletedAt: string; // ISO — for the auto-delete countdown
};

async function uploadOne(file: File) {
  // Downscale/convert to WebP in the browser first (oversized/heavy files only);
  // small web-ready images pass through untouched. See src/lib/image-compress.ts.
  const { file: prepared, width, height } = await compressForUpload(file);
  const res = await upload(artworkImagePathname(prepared.name), prepared, {
    access: "public",
    handleUploadUrl: "/api/portfolio/upload",
    multipart: true,
  });
  return { url: res.url, pathname: res.pathname, width, height };
}

// Delete blobs that were uploaded but never persisted (the save action threw).
// Best-effort — a failed cleanup shouldn't surface a second error to the user.
async function rollbackBlobs(uploaded: { url: string }[]) {
  if (uploaded.length === 0) return;
  await deleteBlobsAction(uploaded.map((u) => u.url)).catch(() => {});
}

export function AdminClient({
  artworks,
  trashed,
}: {
  artworks: ArtworkRow[];
  trashed: TrashRow[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [medium, setMedium] = useState(DEFAULT_MEDIUM);
  const [year, setYear] = useState(DEFAULT_YEAR);
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
    // Images are optional — a work with none is saved as a private draft.
    setBusy(true);
    // Track blobs already uploaded so we can roll them back if the save fails —
    // otherwise a thrown action leaves orphaned (billable) blobs with no row.
    const images: Awaited<ReturnType<typeof uploadOne>>[] = [];
    try {
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
      setYear(DEFAULT_YEAR);
      setDimensions("");
      setDescription("");
      setFiles([]);
      setStatus(null);
      router.refresh();
    } catch (e) {
      await rollbackBlobs(images);
      setErr(e instanceof Error ? e.message : "Upload failed.");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfirmProvider>
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
            <AutoTextarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </label>
          <div className="auth-field">
            <span>Images</span>
            <Dropzone files={files} onFiles={setFiles} />
            <p className="art-form-hint">
              Optional — create the work now and add photos later. It stays a
              private draft (off your public portfolio) until it has at least one
              image.
            </p>
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

        {trashed.length > 0 && <TrashPanel trashed={trashed} />}
      </section>
    </div>
    </TipProvider>
    </ConfirmProvider>
  );
}

function TrashPanel({ trashed }: { trashed: TrashRow[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);

  async function onRestore(t: TrashRow) {
    setBusy(t.id);
    try {
      await restoreArtworkAction(t.id);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function onPurge(t: TrashRow) {
    const ok = await confirm({
      title: "Delete permanently",
      message: `Permanently delete “${t.title}” and its images now? This cannot be undone.`,
      confirmLabel: "Delete permanently",
      danger: true,
    });
    if (!ok) return;
    setBusy(t.id);
    try {
      await purgeArtworkAction(t.id);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="art-trash">
      <h3 className="art-trash-title">Trash ({trashed.length})</h3>
      <p className="art-trash-hint">
        Deleted works are kept for {TRASH_RETENTION_DAYS} days, then removed
        automatically. Restore anytime before then.
      </p>
      <ul className="art-list">
        {trashed.map((t) => {
          const daysLeft = trashDaysLeft(t.deletedAt);
          return (
            <li key={t.id} className="art-list-item art-trash-item">
              <div className="art-card-head">
                {t.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.coverUrl} alt="" className="art-thumb" />
                ) : (
                  <div className="art-thumb art-thumb-empty" />
                )}
                <div className="art-list-meta">
                  <span className="art-list-title">{t.title}</span>
                  <span className="art-list-sub">
                    {t.imageCount} image(s) ·{" "}
                    {daysLeft > 0
                      ? `auto-deletes in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`
                      : "deletes on next cleanup"}
                  </span>
                </div>
                <div className="art-card-actions">
                  <Tip label="Restore this work to your portfolio">
                    <button
                      type="button"
                      className="art-add"
                      onClick={() => onRestore(t)}
                      disabled={busy !== null}
                    >
                      {busy === t.id ? "…" : "Restore"}
                    </button>
                  </Tip>
                  <Tip label="Delete this work permanently now">
                    <button
                      type="button"
                      className="art-del"
                      onClick={() => onPurge(t)}
                      disabled={busy !== null}
                    >
                      Delete permanently
                    </button>
                  </Tip>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function WorkCard({ art }: { art: ArtworkRow }) {
  const router = useRouter();
  const confirm = useConfirm();
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
  const replaceRef = useRef<HTMLInputElement>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);

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
    const images: Awaited<ReturnType<typeof uploadOne>>[] = [];
    try {
      for (const f of picked) images.push(await uploadOne(f));
      await addImagesToArtworkAction(art.id, images);
      if (addRef.current) addRef.current.value = "";
      router.refresh();
    } catch {
      await rollbackBlobs(images);
    } finally {
      setBusy(null);
    }
  }

  async function onDelete() {
    const ok = await confirm({
      title: "Move to Trash",
      message: `Move “${art.title}” to the Trash? It comes off your public portfolio right away and is kept for ${TRASH_RETENTION_DAYS} days, so you can restore it if you change your mind.`,
      confirmLabel: "Move to Trash",
      danger: true,
    });
    if (!ok) return;
    setBusy("delete");
    try {
      await deleteArtworkAction(art.id);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function onTogglePublished() {
    setBusy("publish");
    try {
      await setArtworkPublishedAction(art.id, !art.published);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  function startReplace(id: string) {
    setReplacingId(id);
    replaceRef.current?.click();
  }
  async function onReplaceFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !replacingId) return;
    setBusy("replace");
    let uploaded: Awaited<ReturnType<typeof uploadOne>> | null = null;
    try {
      uploaded = await uploadOne(f);
      await replaceImageAction(replacingId, uploaded);
      if (replaceRef.current) replaceRef.current.value = "";
      setReplacingId(null);
      router.refresh();
    } catch {
      if (uploaded) await rollbackBlobs([uploaded]);
    } finally {
      setBusy(null);
    }
  }
  async function removeImage(id: string) {
    const only = art.images.length <= 1;
    const ok = await confirm({
      title: only ? "Remove the only image?" : "Remove image",
      message: only
        ? "This is the only image. Remove it anyway? The work will have no image until you add one."
        : "Remove this image from the artwork?",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    setBusy("removeimg");
    try {
      await deleteImageAction(id);
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
          <span
            className={
              "art-list-sub" + (art.images.length === 0 ? " is-draft" : "")
            }
          >
            {art.images.length === 0
              ? "Draft — add images to publish (not on your portfolio yet)"
              : `${art.images.length} image(s)${
                  art.published ? "" : " · hidden"
                }`}
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
          {art.images.length > 0 && (
            <Tip
              label={
                art.published
                  ? "Hide this work from your public portfolio"
                  : "Show this work on your public portfolio"
              }
            >
              <button
                type="button"
                className="art-hide"
                onClick={onTogglePublished}
                disabled={busy !== null}
              >
                {busy === "publish" ? "…" : art.published ? "Hide" : "Show"}
              </button>
            </Tip>
          )}
          <Tip label={`Move to Trash — recoverable for ${TRASH_RETENTION_DAYS} days`}>
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
            <AutoTextarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </label>
          <div className="art-images">
            <span className="art-images-label">Images ({art.images.length}) — replace or remove any</span>
            <div className="art-images-grid">
              {art.images.map((im) => (
                <div key={im.id} className="art-image-cell">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={im.url} alt="" className="art-image-thumb" />
                  <div className="art-image-acts">
                    <button
                      type="button"
                      className="art-mini"
                      onClick={() => startReplace(im.id)}
                      disabled={busy !== null}
                    >
                      {busy === "replace" && replacingId === im.id ? "…" : "Replace"}
                    </button>
                    <button
                      type="button"
                      className="art-mini danger"
                      onClick={() => removeImage(im.id)}
                      disabled={busy !== null}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <input ref={replaceRef} type="file" accept="image/*" hidden onChange={onReplaceFile} />
          </div>
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
