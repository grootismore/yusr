import { addDays, addMonths, formatDate, monthStart, parseDate, today } from '@/lib/dates';

it('month and day use Maldives time (UTC+5)', () => {
  expect(monthStart(new Date('2026-10-31T20:00:00Z'))).toBe('2026-11-01');
  expect(monthStart(new Date('2026-10-31T18:00:00Z'))).toBe('2026-10-01');
  expect(today(new Date('2026-11-12T20:30:00Z'))).toBe('2026-11-13');
});
it('shifts months and days', () => {
  expect(addMonths('2026-11-01', 2)).toBe('2027-01-01');
  expect(addMonths('2026-01-01', -1)).toBe('2025-12-01');
  expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
});
it('parses day-first dates', () => {
  expect(parseDate('03/04/2026')).toBe('2026-04-03');
  expect(parseDate('3-4-26')).toBe('2026-04-03');
  expect(parseDate('٣/٤/٢٠٢٦')).toBe('2026-04-03');
  expect(parseDate('2026-04-03')).toBe('2026-04-03');
  expect(parseDate('31/02/2026')).toBeNull();
  expect(parseDate('hello')).toBeNull();
  expect(formatDate('2026-04-03')).toBe('03/04/2026');
});
