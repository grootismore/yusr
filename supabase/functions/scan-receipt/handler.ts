import { FREE_SCANS_PER_MONTH, MAX_IMAGE_BYTES } from './config.ts';
import { type Draft, buildDraft, monthStart } from './logic.ts';

/** Everything the handler needs from the outside world, so quota behaviour is testable without Supabase. */
export interface ScanDeps {
  getUserId(authHeader: string | null): Promise<string | null>;
  /** Returns the new count, or null when the monthly limit is already reached. */
  reserveScan(userId: string, month: string, limit: number): Promise<number | null>;
  refundScan(userId: string, month: string): Promise<void>;
  download(path: string): Promise<{ bytes: Uint8Array; mimeType: string } | null>;
  deleteImage(path: string): Promise<boolean>;
  keepImages(userId: string): Promise<boolean>;
  extract(image: { bytes: Uint8Array; mimeType: string }): Promise<unknown>;
  now?: () => Date;
}

export interface ScanResponse { status: number; json: Record<string, unknown> }
const reply = (status: number, json: Record<string, unknown>): ScanResponse => ({ status, json });

/**
 * Verify the user, reserve a scan, extract, return a DRAFT. It never saves an expense.
 * The scan is reserved up front (so parallel requests cannot overshoot the limit) and refunded
 * on every path that does not return a usable draft, so a failed scan never costs quota.
 */
export async function handleScan(
  req: { method: string; authHeader: string | null; body: unknown },
  deps: ScanDeps,
): Promise<ScanResponse> {
  if (req.method !== 'POST') return reply(405, { error: 'method_not_allowed' });
  const userId = await deps.getUserId(req.authHeader);
  if (!userId) return reply(401, { error: 'unauthorized' });

  const path = (req.body as { image_path?: unknown } | null)?.image_path;
  // Own prefix only, no traversal. Storage RLS enforces this again on the download.
  if (typeof path !== 'string' || !path.startsWith(`${userId}/`) || path.includes('..')) {
    return reply(400, { error: 'invalid_image_path' });
  }

  const now = (deps.now ?? (() => new Date()))();
  const month = monthStart(now);
  const used = await deps.reserveScan(userId, month, FREE_SCANS_PER_MONTH);
  if (used === null) return reply(429, { error: 'quota_exceeded', scans_used: FREE_SCANS_PER_MONTH, scans_left: 0, limit: FREE_SCANS_PER_MONTH });

  let usable = false;
  try {
    const image = await deps.download(path);
    if (!image) return reply(404, { error: 'image_not_found' });
    if (image.bytes.length > MAX_IMAGE_BYTES) return reply(413, { error: 'image_too_large' });

    const outcome = buildDraft(await deps.extract(image), now);
    const quota = { scans_used: used, scans_left: FREE_SCANS_PER_MONTH - used, limit: FREE_SCANS_PER_MONTH };
    if (!outcome.ok) {
      // Blurry, not a receipt, or no total: the app offers a retake or a pre-filled form. Image is kept for that.
      return reply(422, { error: 'unreadable', reason: outcome.reason, draft: outcome.draft, ...refundedQuota(used) });
    }
    usable = true;
    const imageDeleted = (await deps.keepImages(userId)) ? false : await deps.deleteImage(path);
    return reply(200, { draft: outcome.draft satisfies Draft, image_deleted: imageDeleted, ...quota });
  } catch (_e) {
    return reply(502, { error: 'scan_failed', ...refundedQuota(used) });
  } finally {
    if (!usable) await deps.refundScan(userId, month).catch(() => {});
  }
}

const refundedQuota = (used: number) => ({ scans_used: used - 1, scans_left: FREE_SCANS_PER_MONTH - used + 1, limit: FREE_SCANS_PER_MONTH });
