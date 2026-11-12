/**
 * Money is integer laari (100 laari = 1 MVR) everywhere. No floats: parsing, formatting and
 * currency conversion all use string and integer (BigInt) maths. Amounts in other currencies are
 * integer minor units (100 per unit), matching the database.
 */

export const LAARI_PER_MVR = 100;
const MAX = Number.MAX_SAFE_INTEGER;

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

export function assertLaari(value: unknown, label = 'amount'): asserts value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new MoneyError(`${label} must be a safe integer number of laari`);
  }
}

function checked(result: number): number {
  if (!Number.isSafeInteger(result)) throw new MoneyError('amount out of safe integer range');
  return result === 0 ? 0 : result; // normalise -0
}

export const add = (a: number, b: number): number => (assertLaari(a), assertLaari(b), checked(a + b));
export const subtract = (a: number, b: number): number => (assertLaari(a), assertLaari(b), checked(a - b));
export const sum = (amounts: readonly number[]): number => amounts.reduce((t, a) => add(t, a), 0);

/** Arabic-Indic (U+0660-0669) and Extended Arabic-Indic (U+06F0-06F9) digits to ASCII. */
function normaliseDigits(input: string): string {
  return input.replace(/[٠-٩۰-۹]/g, (ch) => {
    const code = ch.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

// Plain digits or strictly grouped thousands, optional 1-2 decimals; at least one digit.
const AMOUNT = /^(?:(\d+|\d{1,3}(?:,\d{3})+)(?:\.(\d{1,2}))?|\.(\d{1,2}))$/;

/**
 * Parse "1250", "1,250.5", "MVR 1,250.50" or "-12.30" into laari (or minor units of any currency
 * code prefix). Rejects more than two decimals (never rounds) and misplaced separators.
 */
export function parseAmount(input: string): number {
  if (typeof input !== 'string') throw new MoneyError('amount must be a string');
  let text = normaliseDigits(input).trim();
  let negative = false;
  if (text.startsWith('-')) {
    negative = true;
    text = text.slice(1).trim();
  }
  text = text.replace(/^[A-Za-z]{3}\s*/, '');
  const match = AMOUNT.exec(text);
  if (!match) throw new MoneyError(`invalid amount: ${JSON.stringify(input)}`);
  const whole = (match[1] ?? '0').replace(/,/g, '');
  const fraction = (match[2] ?? match[3] ?? '').padEnd(2, '0');
  const laari = Number(whole) * LAARI_PER_MVR + Number(fraction);
  if (!Number.isSafeInteger(laari) || laari > MAX) throw new MoneyError('amount out of safe integer range');
  return negative && laari !== 0 ? -laari : laari;
}
export const parseMVR = parseAmount;

/** "1,234.50" (no currency). */
export function formatNumber(laari: number): string {
  assertLaari(laari);
  const abs = Math.abs(laari);
  const fraction = abs % LAARI_PER_MVR;
  const whole = (abs - fraction) / LAARI_PER_MVR;
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${laari < 0 ? '-' : ''}${grouped}.${String(fraction).padStart(2, '0')}`;
}

/** "MVR 1,234.50"; negatives "-MVR 1,234.50". Latin digits always. */
export function formatMoney(laari: number, currency = 'MVR'): string {
  const n = formatNumber(laari);
  return n.startsWith('-') ? `-${currency} ${n.slice(1)}` : `${currency} ${n}`;
}
export const formatMVR = (laari: number): string => formatMoney(laari, 'MVR');

const LRI = '⁦'; // left-to-right isolate
const PDI = '⁩'; // pop directional isolate
/** Wrap a run that must stay left-to-right (amounts, codes, Latin names) inside RTL text. */
export const ltr = (text: string): string => `${LRI}${text}${PDI}`;
/** An amount ready to drop into Dhivehi or English text: "MVR 1,234.50" as one LTR run. */
export const money = (laari: number, currency = 'MVR'): string => ltr(formatMoney(laari, currency));

const RATE_SCALE = 8n;
const RATE = /^\d{1,10}(?:\.\d{1,8})?$/;

/** "15.42" -> scaled bigint (1e8). Throws on anything that is not a positive plain decimal. */
export function parseRate(input: string): bigint {
  const text = normaliseDigits(String(input)).trim();
  if (!RATE.test(text)) throw new MoneyError(`invalid exchange rate: ${JSON.stringify(input)}`);
  const [whole, frac = ''] = text.split('.');
  const scaled = BigInt(whole) * 10n ** RATE_SCALE + BigInt(frac.padEnd(Number(RATE_SCALE), '0'));
  if (scaled <= 0n) throw new MoneyError('exchange rate must be positive');
  return scaled;
}

/** Convert minor units of a foreign currency to MVR laari, rounding half up (matches the database column). */
export function toMvrLaari(minorUnits: number, rate: string): number {
  assertLaari(minorUnits);
  const product = BigInt(minorUnits) * parseRate(rate);
  const unit = 10n ** RATE_SCALE;
  const rounded = product >= 0n ? (product + unit / 2n) / unit : -((-product + unit / 2n) / unit);
  const result = Number(rounded);
  if (!Number.isSafeInteger(result)) throw new MoneyError('amount out of safe integer range');
  return result;
}
