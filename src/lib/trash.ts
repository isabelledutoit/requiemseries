// Trash / soft-delete retention shared between server (cron purge, actions) and
// client (admin countdown). Client-safe: no server-only imports.

// How long a soft-deleted artwork stays recoverable before the daily cron
// (see /api/cron/purge-trash) hard-deletes it and its blobs. Change here only.
export const TRASH_RETENTION_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

// Whole days left before auto-purge (0 once due). Used for the admin countdown.
export function trashDaysLeft(deletedAt: Date | string | number): number {
  const elapsed = Date.now() - new Date(deletedAt).getTime();
  return Math.max(0, Math.ceil(TRASH_RETENTION_DAYS - elapsed / DAY_MS));
}
