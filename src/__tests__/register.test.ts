import { TOKEN_PATTERN, inviteLink } from '@/features/register/invite';
import { eventKey, readiness } from '@/features/register/readiness';
import en from '@/lib/i18n/locales/en.json';
import dv from '@/lib/i18n/locales/dv.json';
import type { RegisterItem, TrustedContact } from '@/features/register/types';

const item: RegisterItem = { id: 'i', kind: 'wish', title: 't', counterparty: null, amount_laari: null };
const contact = (status: TrustedContact['status']): TrustedContact => ({ id: status, name: 'n', email: 'e@x.test', status, inviter_name: null, invite_expires_at: '2026-12-01T00:00:00Z' });

describe('readiness checklist', () => {
  it('needs something written down and a contact who said yes', () => {
    expect(readiness([], [], 0)).toMatchObject({ hasItems: false, hasContact: false, ready: false });
    expect(readiness([item], [contact('invited')], 0)).toMatchObject({ hasItems: true, hasContact: true, contactAccepted: false, ready: false });
    expect(readiness([item], [contact('accepted')], 0).ready).toBe(true);
  });
  it('debts count as something written down, and a revoked contact does not count', () => {
    expect(readiness([], [contact('accepted')], 2).ready).toBe(true);
    expect(readiness([item], [contact('revoked')], 0)).toMatchObject({ hasContact: false, ready: false });
  });
});

it('invite links carry only the token', () => {
  expect(TOKEN_PATTERN.test('A'.repeat(43))).toBe(true);
  expect(TOKEN_PATTERN.test('A'.repeat(42))).toBe(false);
  expect(inviteLink('https://app.example/', 'T'.repeat(43))).toBe(`https://app.example/accept?token=${'T'.repeat(43)}`);
});

it('every audit event has plain wording in both languages, and unknown ones fall back instead of disappearing', () => {
  const events = ['contact_invited', 'contact_accepted', 'contact_declined', 'contact_revoked', 'register_item_changed', 'register_viewed', 'checkin_okay', 'ladder_advanced', 'notice_sent', 'released', 'release_blocked', 'contact_answered', 'answer_withdrawn', 'away_set', 'away_ended'];
  for (const e of events) {
    expect(eventKey(e)).toBe(e);
    expect((en.release.events as Record<string, string>)[e]).toBeTruthy();
    expect((dv.release.events as Record<string, string>)[e]).toBeTruthy();
  }
  expect(eventKey('something_new')).toBe('unknown');
});
