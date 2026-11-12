/** Re-lock after the app has been in the background at least this long. */
// ponytail: fixed constant; becomes a user setting with the Settings work in a later phase.
export const AUTO_LOCK_MS = 30_000;

export function shouldRelock(backgroundedAt: number | null, now: number, timeoutMs = AUTO_LOCK_MS): boolean {
  if (backgroundedAt === null) return false;
  return now - backgroundedAt >= timeoutMs;
}
