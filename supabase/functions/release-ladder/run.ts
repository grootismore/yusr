import { ownerCheckin, contactAsked, ownerPassedClaim, released, type Email } from './emails.ts';
import { decide, recentPassedClaims, type Checkin, type Confirmation, type Contact } from './logic.ts';

/** Everything the run needs from the outside world, so every path can be tested without a database or Resend. */
export interface Deps {
  /** The kill switch (release_config.enabled). */
  enabled(): Promise<boolean>;
  listOpen(now: Date): Promise<Checkin[]>;
  contacts(userId: string): Promise<Contact[]>;
  confirmations(userId: string): Promise<Confirmation[]>;
  /** Ask the database to move the ladder. 'refused' = its guard said no (e.g. the confirmations are not enough). */
  setState(userId: string, to: string): Promise<'ok' | 'refused'>;
  log(userId: string, event: 'notice_sent' | 'release_blocked', meta: Record<string, string>): Promise<void>;
  ownerEmail(userId: string): Promise<string | null>;
  send(email: Email): Promise<void>;
  appUrl: string;
}

export interface Summary { enabled: boolean; checked: number; advanced: number; released: number; blocked: number; errors: number; emails: number }

/** How often this runs, in hours. A "passed" answer newer than this is announced to the owner once. */
export const RUN_EVERY_HOURS = 24;

/**
 * One pass over everyone who is not 'released'. It is safe to run twice: emails carry an idempotency key,
 * and the database refuses any move that is not allowed. With the kill switch off it does nothing at all.
 */
export async function runLadder(d: Deps, now: Date = new Date()): Promise<Summary> {
  const s: Summary = { enabled: false, checked: 0, advanced: 0, released: 0, blocked: 0, errors: 0, emails: 0 };
  if (!(await d.enabled())) return s;
  s.enabled = true;

  const send = async (e: Email) => { await d.send(e); s.emails++; };

  for (const c of await d.listOpen(now)) {
    s.checked++;
    try {
      const needsPeople = c.state === 'second_checkin' || c.state === 'contacts_asked';
      const contacts = needsPeople ? await d.contacts(c.user_id) : [];
      const confirmations = c.state === 'contacts_asked' ? await d.confirmations(c.user_id) : [];

      // A contact says "passed away": tell the owner at once, in case they are alive and can cancel.
      if (c.state === 'contacts_asked') {
        const owner = await d.ownerEmail(c.user_id);
        for (const claim of recentPassedClaims(confirmations, now, RUN_EVERY_HOURS + 1)) {
          if (owner) await send(ownerPassedClaim(owner, d.appUrl, `ladder-passed-${c.user_id}-${claim.contact_id}-${claim.answered_at}`));
        }
      }

      const to = decide(c, contacts, confirmations, now);
      if (!to) continue;

      if (to === 'released') {
        // The database decides. Only after it says yes do we tell anyone the register is open.
        if ((await d.setState(c.user_id, 'released')) === 'refused') {
          s.blocked++;
          await d.log(c.user_id, 'release_blocked', { reason: 'not_eligible' });
          continue;
        }
        s.released++; s.advanced++;
        for (const k of contacts.filter((x) => x.status === 'accepted')) await send(released(k.email, 'contact', k.inviter_name, d.appUrl, c.user_id, k.id));
        const owner = await d.ownerEmail(c.user_id);
        if (owner) await send(released(owner, 'owner', null, d.appUrl, c.user_id));
        await d.log(c.user_id, 'notice_sent', { step: 'released' });
        continue;
      }

      // Notify first (idempotent), then move: if sending fails nothing has moved and the next run tries again.
      if (to === 'quiet' || to === 'second_checkin') {
        const owner = await d.ownerEmail(c.user_id);
        if (owner) await send(ownerCheckin(to === 'quiet' ? 'first' : 'second', owner, d.appUrl, c.user_id));
      } else if (to === 'contacts_asked') {
        for (const k of contacts.filter((x) => x.status === 'accepted')) await send(contactAsked(k, d.appUrl, c.user_id));
      }
      if ((await d.setState(c.user_id, to)) === 'refused') { s.blocked++; continue; }
      s.advanced++;
      await d.log(c.user_id, 'notice_sent', { step: to });
    } catch {
      s.errors++; // one person's failure never stops the others; never log names or addresses
    }
  }
  return s;
}
