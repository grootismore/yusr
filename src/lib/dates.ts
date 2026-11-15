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

/** Types a date from the number pad: digits in, "15/11/2026" out. The slashes are added as you go. */
export function maskDate(text: string): string {
  const d = text.replace(/\D/g, '').slice(0, 8);
  return d.length <= 2 ? d : d.length <= 4 ? `${d.slice(0, 2)}/${d.slice(2)}` : `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** Types a month from the number pad: digits in, "03/2027" out. */
export function maskMonth(text: string): string {
  const d = text.replace(/\D/g, '').slice(0, 6);
  return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`;
}
/** "03/2027" to "2027-03-01", or null when it is not a real month. */
export function parseMonth(text: string): string | null {
  const m = /^(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const month = Number(m[1]);
  return month >= 1 && month <= 12 ? `${m[2]}-${m[1]}-01` : null;
}
/** "2027-03-01" to "03/2027". */
export const formatMonthInput = (iso: string): string => `${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
