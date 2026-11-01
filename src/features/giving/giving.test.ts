import type { Transaction } from '@/features/transactions/types';
import { addDays, fromHijri, hijriMonthRange, toHijri, upcomingHijriMonth } from './hijri';
import { commitmentStatus, currentOccurrence } from './schedule';
import type { Commitment } from './types';

describe('Hijri dates (Umm al-Qura)', () => {
  it('matches the official 2026 dates for Ramadan, Eid al-Fitr, Dhul Hijjah and Eid al-Adha', () => {
    expect(fromHijri(1447, 9, 1)).toBe('2026-02-18'); // 1 Ramadan 1447
    expect(fromHijri(1447, 10, 1)).toBe('2026-03-20'); // Eid al-Fitr
    expect(fromHijri(1447, 12, 1)).toBe('2026-05-18'); // 1 Dhul Hijjah
    expect(fromHijri(1447, 12, 10)).toBe('2026-05-27'); // Eid al-Adha
    expect(toHijri('2026-02-18')).toEqual({ year: 1447, month: 9, day: 1 });
  });

  it('agrees with the platform Umm al-Qura calendar on every day from 2000 to 2028', () => {
    const format = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
      year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC',
    });
    const reference = (iso: string) => {
      const parts = Object.fromEntries(format.formatToParts(new Date(`${iso}T12:00:00Z`)).map((p) => [p.type, p.value]));
      return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
    };
    let iso = '2000-01-01';
    let days = 0;
    for (; iso < '2029-01-01'; iso = addDays(iso, 1)) {
      expect(toHijri(iso)).toEqual(reference(iso));
      days++;
    }
    expect(days).toBeGreaterThan(10000);
  });

  it('round-trips Hijri -> Gregorian -> Hijri for every day of two Hijri years', () => {
    for (const year of [1447, 1448]) {
      for (let month = 1; month <= 12; month++) {
        const { start, end } = hijriMonthRange(year, month);
        for (let iso = start; iso <= end; iso = addDays(iso, 1)) {
          const h = toHijri(iso);
          expect([h.year, h.month]).toEqual([year, month]);
          expect(fromHijri(h.year, h.month, h.day)).toBe(iso);
        }
      }
    }
  });

  it('applies the manual +/-1 day adjustment in both directions', () => {
    expect(toHijri('2026-02-18', 1)).toEqual({ year: 1447, month: 8, day: 29 }); // calendar a day later: still Shaban
    expect(toHijri('2026-02-19', 1)).toEqual({ year: 1447, month: 9, day: 1 });
    expect(fromHijri(1447, 9, 1, 1)).toBe('2026-02-19');
    expect(toHijri('2026-02-18', -1).day).toBe(2);
    expect(fromHijri(1447, 9, 1, -1)).toBe('2026-02-17');
  });

  it('gives 29 or 30 days to every month', () => {
    for (let month = 1; month <= 12; month++) {
      const { start, end } = hijriMonthRange(1447, month);
      let n = 1;
      for (let iso = start; iso < end; iso = addDays(iso, 1)) n++;
      expect([29, 30]).toContain(n);
    }
  });

  it('finds the Ramadan in progress, or the next one after it ends', () => {
    expect(upcomingHijriMonth(9, '2026-02-25')).toMatchObject({ start: '2026-02-18', year: 1447 }); // during
    expect(upcomingHijriMonth(9, '2026-01-01')).toMatchObject({ start: '2026-02-18' }); // before
    const after = upcomingHijriMonth(9, '2026-06-01'); // after: Ramadan 1448 (early 2027)
    expect(after.year).toBe(1448);
    expect(after.start > '2027-01-01' && after.start < '2027-03-01').toBe(true);
    expect(upcomingHijriMonth(9, '2026-03-18').end >= '2026-03-18').toBe(true); // last day still counts
  });
});

const commitment = (over: Partial<Commitment>): Commitment => ({
  id: 'c1', user_id: 'u', type: 'sadaqah', amount_laari: 5000, schedule: 'weekly_friday', due_on: null,
  day_of_month: null, recipient_note: null, reminder_enabled: true, active: true,
  created_at: '', updated_at: '', deleted_at: null, ...over,
});
const gave = (on: string, commitmentId = 'c1'): Transaction => ({
  id: `t-${on}`, user_id: 'u', account_id: 'a', category_id: 'c', amount_laari: 5000, kind: 'giving', occurred_on: on,
  note: null, debt_id: null, commitment_id: commitmentId, created_at: '', updated_at: '', deleted_at: null,
});

describe('commitment schedules', () => {
  it('weekly Fridays: today if it is Friday, otherwise the coming Friday', () => {
    const c = commitment({});
    expect(currentOccurrence(c, '2026-11-06')?.dueOn).toBe('2026-11-06'); // a Friday
    expect(currentOccurrence(c, '2026-11-01')?.dueOn).toBe('2026-11-06'); // Sunday
    expect(currentOccurrence(c, '2026-11-07')?.dueOn).toBe('2026-11-13'); // Saturday: next week
    expect(currentOccurrence(c, '2026-11-06')).toMatchObject({ start: '2026-10-31', end: '2026-11-06' });
  });
  it('weekly: done for this Friday only if logged inside its window, and never overdue', () => {
    const c = commitment({});
    expect(commitmentStatus(c, [gave('2026-11-03')], '2026-11-01')).toMatchObject({ done: true, overdue: false });
    expect(commitmentStatus(c, [gave('2026-10-30')], '2026-11-01')).toMatchObject({ done: false, overdue: false });
    expect(commitmentStatus(c, [], '2026-11-07').overdue).toBe(false); // a missed week just moves on
    expect(commitmentStatus(c, [gave('2026-11-03', 'someone-else')], '2026-11-01').done).toBe(false);
    expect(commitmentStatus(c, [{ ...gave('2026-11-03'), deleted_at: 'x' }], '2026-11-01').done).toBe(false);
  });

  it('monthly: this month until done, then next month; overdue only while outstanding after its day', () => {
    const c = commitment({ schedule: 'monthly', day_of_month: 10 });
    expect(commitmentStatus(c, [], '2026-11-05')).toMatchObject({ done: false, overdue: false });
    expect(currentOccurrence(c, '2026-11-05')?.dueOn).toBe('2026-11-10');
    expect(commitmentStatus(c, [], '2026-11-15')).toMatchObject({ done: false, overdue: true }); // still outstanding
    expect(currentOccurrence(c, '2026-11-15', [gave('2026-11-12')])?.dueOn).toBe('2026-12-10'); // done late: on to next
    expect(commitmentStatus(c, [gave('2026-11-02')], '2026-11-05')).toMatchObject({ done: true, overdue: false }); // done early
  });
  it('monthly: clamps day 31 to short months and wraps the year', () => {
    const c = commitment({ schedule: 'monthly', day_of_month: 31 });
    expect(currentOccurrence(c, '2026-02-01')?.dueOn).toBe('2026-02-28');
    const twentieth = commitment({ schedule: 'monthly', day_of_month: 20 });
    expect(currentOccurrence(twentieth, '2026-12-25', [gave('2026-12-20')])?.dueOn).toBe('2027-01-20'); // done: on to next year
    expect(currentOccurrence(c, '2026-12-31', [gave('2026-12-31')])?.dueOn).toBe('2026-12-31'); // on its day, still shown (as done)
    expect(currentOccurrence(commitment({ schedule: 'monthly', day_of_month: null }), '2026-11-01')).toBeNull();
  });

  it('one-off: stays outstanding (overdue) until it is done', () => {
    const c = commitment({ schedule: 'once', due_on: '2026-11-10' });
    expect(commitmentStatus(c, [], '2026-11-01')).toMatchObject({ done: false, overdue: false });
    expect(commitmentStatus(c, [], '2026-11-20')).toMatchObject({ done: false, overdue: true });
    expect(commitmentStatus(c, [gave('2026-11-10')], '2026-11-20')).toMatchObject({ done: true, overdue: false });
    expect(currentOccurrence(commitment({ schedule: 'once', due_on: null }), '2026-11-01')).toBeNull();
  });

  it('Ramadan: counts any day of the month, and due today once it has begun', () => {
    const c = commitment({ type: 'fitr', schedule: 'ramadan' });
    expect(currentOccurrence(c, '2026-01-10')).toMatchObject({ dueOn: '2026-02-18', start: '2026-02-18' });
    expect(currentOccurrence(c, '2026-03-01')?.dueOn).toBe('2026-03-01'); // under way: due today
    expect(commitmentStatus(c, [gave('2026-03-05')], '2026-03-01').done).toBe(true);
    expect(commitmentStatus(c, [gave('2026-03-05')], '2026-03-01').overdue).toBe(false);
    expect(currentOccurrence(c, '2026-04-01')?.start.startsWith('2027')).toBe(true); // next year's
  });
  it('Dhul Hijjah: the 2026 month runs 18 May to mid June', () => {
    const c = commitment({ type: 'sadaqah', schedule: 'dhul_hijjah' });
    expect(currentOccurrence(c, '2026-05-01')).toMatchObject({ start: '2026-05-18' });
    expect((currentOccurrence(c, '2026-05-01')?.end ?? '') > '2026-06-10').toBe(true);
  });
  it('respects the Hijri adjustment when working out the month', () => {
    const c = commitment({ schedule: 'ramadan' });
    expect(currentOccurrence(c, '2026-01-10', [], 1)?.start).toBe('2026-02-19');
    expect(currentOccurrence(c, '2026-01-10', [], -1)?.start).toBe('2026-02-17');
  });
});
