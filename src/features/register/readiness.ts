import type { RegisterItem, TrustedContact } from './types';

export interface Readiness { hasItems: boolean; hasContact: boolean; contactAccepted: boolean; ready: boolean }

/** A calm checklist, not a score: something written down, and at least one person who has said yes. */
export function readiness(items: readonly RegisterItem[], contacts: readonly TrustedContact[], debtCount: number): Readiness {
  const live = contacts.filter((c) => c.status !== 'revoked');
  const hasItems = items.length > 0 || debtCount > 0;
  const contactAccepted = live.some((c) => c.status === 'accepted');
  return { hasItems, hasContact: live.length > 0, contactAccepted, ready: hasItems && contactAccepted };
}

/** Events that are worth showing the owner in plain words. Anything unknown is shown generically, never hidden. */
export const KNOWN_EVENTS = [
  'contact_invited', 'contact_accepted', 'contact_declined', 'contact_revoked', 'register_item_changed', 'register_viewed',
  'checkin_okay', 'ladder_advanced', 'notice_sent', 'released', 'release_blocked', 'contact_answered', 'answer_withdrawn', 'away_set', 'away_ended',
] as const;
export const eventKey = (event: string): string => ((KNOWN_EVENTS as readonly string[]).includes(event) ? event : 'unknown');
