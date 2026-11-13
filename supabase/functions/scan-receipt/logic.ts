// Pure functions: raw model output -> the draft the app shows. No I/O, so it is unit-tested in node.
import { CATEGORY_SLUGS, type CategorySlug, TIMEZONE } from './config.ts';

export type Confidence = Record<'merchant' | 'date' | 'currency' | 'total' | 'gst' | 'items' | 'category', number>;
export interface DraftItem { name: string; qty: number; unit_price_laari: number | null; total_laari: number }
export interface Draft {
  merchant: string | null;
  date: string | null; // YYYY-MM-DD
  currency: string; // ISO 4217, default MVR
  total_laari: number | null;
  gst_laari: number | null; // its own field, never folded into the total
  service_charge_laari: number | null;
  discount_laari: number | null;
  prices_include_gst: boolean | null;
  items: DraftItem[];
  category_slug: CategorySlug;
  confidence: Confidence;
  /** Items and GST do not add up to the total. False when it cannot be checked (no items). */
  totals_mismatch: boolean;
  items_sum_laari: number;
  expected_total_laari: number | null;
  warnings: string[];
}

const MAX_LAARI = Number.MAX_SAFE_INTEGER;
/** Receipt maths rounds per line; allow a few laari of drift before flagging. */
export const TOTAL_TOLERANCE_LAARI = 5;

/** "1,234.50", "MVR 12.5", "1 234" -> integer laari. Pure string maths, no floats. Null if unparseable. */
export function parseMoney(input: unknown): number | null {
  if (typeof input !== 'string') return typeof input === 'number' && Number.isFinite(input) ? Math.round(input * 100) : null;
  let s = input.replace(/[^0-9.,-]/g, '');
  const neg = s.startsWith('-');
  s = s.replace(/-/g, '');
  if (!/\d/.test(s)) return null;
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot >= 0 && lastComma >= 0) {
    // Both present: the later one is the decimal separator.
    const dec = Math.max(lastDot, lastComma);
    s = s.slice(0, dec).replace(/[.,]/g, '') + '.' + s.slice(dec + 1);
  } else if (lastComma >= 0) {
    // "12,50" is decimal; "1,234" is thousands.
    s = s.length - lastComma - 1 === 2 ? s.replace(',', '.') : s.replace(/,/g, '');
  }
  const [whole = '0', frac = ''] = s.split('.');
  if (!/^\d*$/.test(whole) || !/^\d*$/.test(frac) || s.split('.').length > 2) return null;
  const f = (frac + '00').slice(0, 2);
  let laari = Number(whole || '0') * 100 + Number(f);
  if (frac.length > 2 && Number(frac[2]) >= 5) laari += 1;
  if (!Number.isSafeInteger(laari) || laari > MAX_LAARI) return null;
  return neg ? -laari : laari;
}

/** Day-first. "03/04/2026", "3-4-26", "3.4.2026" and ISO "2026-04-03" -> "2026-04-03". Null if not a real date. */
export function parseDate(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const s = input.trim();
  let d: number, m: number, y: number;
  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) { y = +match[1]; m = +match[2]; d = +match[3]; } else {
    match = s.match(/^(\d{1,2})[/.\-\s](\d{1,2})[/.\-\s](\d{2}|\d{4})\b/);
    if (!match) return null;
    d = +match[1]; m = +match[2]; y = +match[3];
    if (match[3].length === 2) y += 2000;
  }
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** First day of the current month in Maldives time, as YYYY-MM-01 (the scan_usage key). */
export function monthStart(now: Date, timeZone: string = TIMEZONE): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-01`;
}

const clamp01 = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);
const text = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

export type ScanOutcome = { ok: true; draft: Draft } | { ok: false; reason: 'not_a_receipt' | 'no_total'; draft: Draft | null };

/** Normalise the model's JSON into a Draft and run the checks. Never throws on bad model output. */
export function buildDraft(raw: any, now: Date = new Date()): ScanOutcome {
  if (!raw || typeof raw !== 'object') return { ok: false, reason: 'not_a_receipt', draft: null };
  const c = raw.confidence ?? {};
  const confidence: Confidence = {
    merchant: clamp01(c.merchant), date: clamp01(c.date), currency: clamp01(c.currency),
    total: clamp01(c.total), gst: clamp01(c.gst), items: clamp01(c.items), category: clamp01(c.category),
  };
  const warnings: string[] = [];

  const items: DraftItem[] = (Array.isArray(raw.items) ? raw.items : []).flatMap((it: any) => {
    const total = parseMoney(it?.total);
    const name = text(it?.name, 200);
    if (total === null || total < 0 || !name) return [];
    const qty = Number(it?.qty);
    return [{ name, qty: Number.isFinite(qty) && qty > 0 ? qty : 1, unit_price_laari: parseMoney(it?.unit_price), total_laari: total }];
  });

  const currencyRaw = typeof raw.currency === 'string' ? raw.currency.trim().toUpperCase() : '';
  const currency = /^[A-Z]{3}$/.test(currencyRaw) ? currencyRaw : 'MVR';
  if (currency === 'MVR' && !/^[A-Z]{3}$/.test(currencyRaw)) confidence.currency = Math.max(confidence.currency, 0.5);

  let date = parseDate(raw.date);
  if (date) {
    const days = (now.getTime() - Date.parse(date + 'T00:00:00Z')) / 86_400_000;
    if (days < -1 || days > 3 * 365) { warnings.push('date_implausible'); confidence.date = Math.min(confidence.date, 0.3); }
  } else confidence.date = Math.min(confidence.date, 0.2);

  const total = parseMoney(raw.total);
  const gst = parseMoney(raw.gst);
  const service = parseMoney(raw.service_charge);
  const discount = parseMoney(raw.discount);
  const includes = typeof raw.prices_include_gst === 'boolean' ? raw.prices_include_gst : null;
  const itemsSum = items.reduce((a, i) => a + i.total_laari, 0);

  // items + service charge - discount (+ GST when it is charged on top) should equal the total.
  // When the receipt does not say, accept either reading rather than flag a correct receipt.
  const base = itemsSum + (service ?? 0) - (discount ?? 0);
  const expectedOnTop = base + (gst ?? 0);
  let expected: number | null = null;
  let mismatch = false;
  if (total !== null && items.length > 0) {
    expected = includes === true ? base : expectedOnTop;
    const near = (x: number) => Math.abs(x - total) <= TOTAL_TOLERANCE_LAARI;
    mismatch = includes === null ? !(near(base) || near(expectedOnTop)) : !near(expected);
    if (mismatch) { warnings.push('items_total_mismatch'); confidence.items = Math.min(confidence.items, 0.4); }
  }

  const slug = (CATEGORY_SLUGS as readonly string[]).includes(raw.category) ? (raw.category as CategorySlug) : 'other';
  if (slug !== raw.category) confidence.category = 0;

  const draft: Draft = {
    merchant: text(raw.merchant, 200), date, currency, total_laari: total, gst_laari: gst,
    service_charge_laari: service, discount_laari: discount, prices_include_gst: includes, items,
    category_slug: slug, confidence, totals_mismatch: mismatch, items_sum_laari: itemsSum,
    expected_total_laari: expected, warnings,
  };
  if (raw.is_receipt === false) return { ok: false, reason: 'not_a_receipt', draft: null };
  if (total === null || total <= 0) return { ok: false, reason: 'no_total', draft };
  return { ok: true, draft };
}
