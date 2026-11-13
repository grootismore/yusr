// The release ladder decisions, as pure functions. The database enforces the same rules in a trigger
// (migration 006), so this file can be wrong in the harmless direction only: if it proposes a move the
// database refuses, nothing happens. It can never release anything the database would not.
export const QUIET_AFTER_DAYS = 30;
export const SECOND_AFTER_DAYS = 7;
export const ASK_AFTER_DAYS = 7;
export const SINGLE_CONTACT_WAIT_DAYS = 14;
const DAY = 86_400_000;

export type State = 'active' | 'quiet' | 'second_checkin' | 'contacts_asked' | 'released';
export interface Checkin {
  user_id: string; state: State; last_active_at: string; quiet_at: string | null; second_checkin_at: string | null;
  contacts_asked_at: string | null; away_until: string | null;
}
export interface Contact { id: string; name: string; email: string; status: 'invited' | 'accepted' | 'revoked'; inviter_name: string | null }
export interface Confirmation { contact_id: string; answer: 'fine' | 'passed'; answered_at: string; withdrawn_at: string | null }

const t = (iso: string | null): number => (iso ? new Date(iso).getTime() : NaN);
const olderThan = (iso: string | null, days: number, now: Date): boolean => t(iso) <= now.getTime() - days * DAY;

/** Is the register allowed to open? Mirrors release_eligible() in the database (minus the kill switch, checked first). */
export function releasable(c: Checkin, contacts: readonly Contact[], confirmations: readonly Confirmation[], now: Date): boolean {
  if (c.state !== 'contacts_asked') return false;
  if (c.away_until && t(c.away_until) > now.getTime()) return false;
  const accepted = new Set(contacts.filter((x) => x.status === 'accepted').map((x) => x.id));
  const live = confirmations.filter((x) => x.withdrawn_at === null && accepted.has(x.contact_id));
  if (live.some((x) => x.answer === 'fine')) return false; // anyone saying "they are fine" stops it
  const passed = new Set(live.filter((x) => x.answer === 'passed').map((x) => x.contact_id)).size;
  if (accepted.size === 0) return false;
  if (accepted.size === 1) return passed >= 1 && olderThan(c.contacts_asked_at, SINGLE_CONTACT_WAIT_DAYS, now);
  return passed >= 2;
}

/** The next rung to move to, or null. Away mode pauses everything; the 30 days restart when it ends. */
export function decide(c: Checkin, contacts: readonly Contact[], confirmations: readonly Confirmation[], now: Date): Exclude<State, 'active'> | null {
  if (c.state === 'released') return null;
  if (c.away_until && t(c.away_until) > now.getTime()) return null;
  switch (c.state) {
    case 'active': {
      const since = Math.max(t(c.last_active_at), c.away_until ? t(c.away_until) : 0);
      return since <= now.getTime() - QUIET_AFTER_DAYS * DAY ? 'quiet' : null;
    }
    case 'quiet': return olderThan(c.quiet_at, SECOND_AFTER_DAYS, now) ? 'second_checkin' : null;
    case 'second_checkin': return olderThan(c.second_checkin_at, ASK_AFTER_DAYS, now) ? 'contacts_asked' : null;
    case 'contacts_asked': return releasable(c, contacts, confirmations, now) ? 'released' : null;
  }
}

/** "Passed" answers given within the last `hours`, for telling the owner straight away (they may be alive). */
export function recentPassedClaims(confirmations: readonly Confirmation[], now: Date, hours: number): Confirmation[] {
  return confirmations.filter((x) => x.answer === 'passed' && x.withdrawn_at === null && t(x.answered_at) > now.getTime() - hours * 3_600_000);
}
