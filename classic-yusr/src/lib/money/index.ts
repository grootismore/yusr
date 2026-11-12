/**
 * Money is stored and computed as integer laari (100 laari = 1 MVR). No floats.
 * Every function here accepts and returns safe integers and throws MoneyError
 * otherwise. Parsing and formatting use string/integer math only.
 */

export const LAARI_PER_MVR = 100;

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

export function add(a: number, b: number): number {
  assertLaari(a);
  assertLaari(b);
  return checked(a + b);
}

export function subtract(a: number, b: number): number {
  assertLaari(a);
  assertLaari(b);
  return checked(a - b);
}

export function sum(amounts: readonly number[]): number {
  return amounts.reduce((total, amount) => add(total, amount), 0);
}

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
 * Parse user input such as "1250", "1,250.5", "MVR 1,250.50" or "-12.30" into
 * laari. Rejects more than two decimals (never rounds), stray characters and
 * misplaced separators.
 */
export function parseMVR(input: string): number {
  if (typeof input !== 'string') throw new MoneyError('amount must be a string');
  let text = normaliseDigits(input).trim();
  let negative = false;
  if (text.startsWith('-')) {
    negative = true;
    text = text.slice(1).trim();
  }
  text = text.replace(/^MVR\s*/i, '');
  const match = AMOUNT.exec(text);
  if (!match) throw new MoneyError(`invalid amount: ${JSON.stringify(input)}`);
  const whole = (match[1] ?? '0').replace(/,/g, '');
  const fraction = (match[2] ?? match[3] ?? '').padEnd(2, '0');
  const laari = Number(whole) * LAARI_PER_MVR + Number(fraction);
  if (!Number.isSafeInteger(laari)) throw new MoneyError('amount out of safe integer range');
  return negative && laari !== 0 ? -laari : laari;
}

/** Format laari as "MVR 1,250.00" (negatives as "-MVR 1,250.00"). */
export function formatMVR(laari: number): string {
  assertLaari(laari);
  const abs = Math.abs(laari);
  const fraction = abs % LAARI_PER_MVR;
  const whole = (abs - fraction) / LAARI_PER_MVR; // exact: abs - fraction is a multiple of 100
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${laari < 0 ? '-' : ''}MVR ${grouped}.${String(fraction).padStart(2, '0')}`;
}
