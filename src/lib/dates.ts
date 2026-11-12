export const MALDIVES_TZ = 'Indian/Maldives';

const pad = (n: number) => String(n).padStart(2, '0');

/** First day of the month containing `now`, in Maldives time, as YYYY-MM-01 (matches the server's scan quota month). */
export function monthStart(now: Date = new Date(), timeZone: string = MALDIVES_TZ): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-01`;
}

/** Today in Maldives time as YYYY-MM-DD. */
export function today(now: Date = new Date(), timeZone: string = MALDIVES_TZ): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Month shifted by n (YYYY-MM-01 in, YYYY-MM-01 out). */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-01`;
}

/** Add days to a YYYY-MM-DD date. */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const r = new Date(Date.UTC(y, m - 1, d + n));
  return `${r.getUTCFullYear()}-${pad(r.getUTCMonth() + 1)}-${pad(r.getUTCDate())}`;
}

/** YYYY-MM-DD -> "03/11/2026" (day-first, Latin digits). */
export const formatDate = (iso: string): string => iso.split('-').reverse().join('/');

/** Day-first "3/11/2026", "03-11-26", "3.11.2026" or ISO -> YYYY-MM-DD, or null if not a real date. */
export function parseDate(input: string): string | null {
  const s = input.trim().replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660));
  let y: number, m: number, d: number;
  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    [y, m, d] = [+match[1], +match[2], +match[3]];
  } else {
    match = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
    if (!match) return null;
    [d, m, y] = [+match[1], +match[2], +match[3]];
    if (match[3].length === 2) y += 2000;
  }
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}
