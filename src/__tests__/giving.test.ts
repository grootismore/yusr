import { daysBetween, fromHijri, nextHijriOccurrence, toHijri } from '@/features/giving/hijri';
import { activeCommitments, commitmentNote, commitmentTotal, goalPercent, isPaid, monthGiving, reminderDates, type GivingCommitment, type GivingEntry } from '@/features/giving/logic';

describe('Hijri dates (Umm al-Qura)', () => {
  it('matches the official 2026 dates', () => {
    expect(toHijri('2026-02-18')).toMatchObject({ year: 1447, month: 9, day: 1 }); // 1 Ramadan 1447
    expect(fromHijri(1447, 9, 1)).toBe('2026-02-18');
  });
  it('a manual adjustment shifts by a day both ways', () => {
    expect(toHijri('2026-02-19', 1)).toMatchObject({ month: 9, day: 1 });
    expect(fromHijri(1447, 9, 1, 1)).toBe('2026-02-19');
  });
  it('finds the next occurrence of a zakat date, today included', () => {
    expect(nextHijriOccurrence(9, 1, '2026-01-01')).toBe('2026-02-18');
    expect(nextHijriOccurrence(9, 1, '2026-02-18')).toBe('2026-02-18');
    expect(nextHijriOccurrence(9, 1, '2026-02-19')).toBe('2027-02-08'); // next year's Ramadan
  });
  it('day 30 in a 29-day month falls on the 29th', () => {
    const iso = nextHijriOccurrence(9, 30, '2027-01-01'); // Ramadan 1448 has 29 days
    expect(toHijri(iso)).toMatchObject({ month: 9, day: 29 });
  });
  it('counts days between dates', () => expect(daysBetween('2026-11-13', '2026-11-20')).toBe(7));
});

describe('giving totals', () => {
  const e = (kind: GivingEntry['kind'], amount_laari: number): GivingEntry => ({ id: kind + amount_laari, expense_id: 'x', kind, recipient_note: null, amount_laari, spent_at: '2026-11-01' });
  it('voluntary giving counts toward the goal, obligations are kept apart', () => {
    expect(monthGiving([e('sadaqah', 5_000), e('jariyah', 2_000), e('zakat', 100_000), e('fidya', 3_000)])).toEqual({ goalCounted: 7_000, obligations: 103_000, total: 110_000 });
  });
  it('percent can pass 100', () => {
    expect(goalPercent(5_000, 20_000)).toBe(25);
    expect(goalPercent(30_000, 20_000)).toBe(150);
  });
});

describe('zakat reminders', () => {
  it('a week before and the day itself, only those still ahead', () => {
    expect(reminderDates('2027-02-08', new Date(2026, 10, 13)).map((d) => d.getDate())).toEqual([1, 8]);
    expect(reminderDates('2027-02-08', new Date(2027, 1, 3)).map((d) => d.getDate())).toEqual([8]);
    expect(reminderDates('2027-02-08', new Date(2027, 1, 9))).toEqual([]);
  });
});


describe('monthly commitments', () => {
  const school: GivingCommitment = { id: 'c1', recipient: 'Alooka School', note: 'sponsorship of Lama', amount_laari: 70_000, kind: 'sadaqah', due_day: 5, started_on: '2026-09-01', ended_on: null };
  const old: GivingCommitment = { ...school, id: 'c2', recipient: 'Old', amount_laari: 5_000, ended_on: '2026-10-01' };
  it('stays active until ended, and the total counts only active ones', () => {
    expect(activeCommitments([school, old]).map((c) => c.id)).toEqual(['c1']);
    expect(commitmentTotal([school, old])).toBe(70_000);
  });
  it('is paid for the month only when an entry points at it', () => {
    const e: GivingEntry = { id: 'g', expense_id: 'x', kind: 'sadaqah', recipient_note: null, amount_laari: 70_000, spent_at: '2026-11-05', commitment_id: 'c1' };
    expect(isPaid(school, [])).toBe(false);
    expect(isPaid(school, [e])).toBe(true);
    expect(isPaid(old, [e])).toBe(false);
  });
  it('writes who and why into the private note', () => {
    expect(commitmentNote(school)).toBe('Alooka School · sponsorship of Lama');
    expect(commitmentNote({ ...school, note: null })).toBe('Alooka School');
  });
});
