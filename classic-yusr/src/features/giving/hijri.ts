import umalqura from '@umalqura/core';

/**
 * Umm al-Qura calendar via @umalqura/core. Checked against Node's built-in Umm al-Qura
 * calendar for every day from 2000 to 2028 (identical) and against the official 2026
 * dates for Ramadan, Eid al-Fitr, Dhul Hijjah and Eid al-Adha. Outside that window the
 * tables are projections and may differ by a day, which is what `adjustment` is for.
 */

export interface HijriDate {
  year: number;
  /** 1 (Muharram) - 12 (Dhul Hijjah). */
  month: number;
  day: number;
}

const pad = (n: number) => String(n).padStart(2, '0');
const isoOf = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const noon = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

export function addDays(iso: string, days: number): string {
  const date = noon(iso);
  date.setDate(date.getDate() + days);
  return isoOf(date);
}

/** Islamic month numbers used by commitments. */
export const RAMADAN = 9;
export const DHUL_HIJJAH = 12;

/** Gregorian ISO date to Hijri. A +1 adjustment means the user's local moon sighting is one day later. */
export function toHijri(iso: string, adjustment = 0): HijriDate {
  const h = umalqura(noon(addDays(iso, -adjustment)));
  return { year: h.hy, month: h.hm, day: h.hd };
}

/** Hijri date to Gregorian ISO, with the same adjustment. */
export function fromHijri(year: number, month: number, day: number, adjustment = 0): string {
  return addDays(isoOf(umalqura(year, month, day).date), adjustment);
}

export function daysInHijriMonth(year: number, month: number): number {
  return umalqura(year, month, 1).daysInMonth;
}

/** First and last Gregorian day of a Hijri month. */
export function hijriMonthRange(year: number, month: number, adjustment = 0): { start: string; end: string } {
  return {
    start: fromHijri(year, month, 1, adjustment),
    end: fromHijri(year, month, daysInHijriMonth(year, month), adjustment),
  };
}

/**
 * The occurrence of a Hijri month that is happening on `today` or is next to come.
 * (If Ramadan is under way, that is the current Ramadan; after it ends, the next one.)
 */
export function upcomingHijriMonth(month: number, today: string, adjustment = 0): { start: string; end: string; year: number } {
  const currentYear = toHijri(today, adjustment).year;
  for (const year of [currentYear, currentYear + 1]) {
    const range = hijriMonthRange(year, month, adjustment);
    if (range.end >= today) return { ...range, year };
  }
  const year = currentYear + 2;
  return { ...hijriMonthRange(year, month, adjustment), year };
}
