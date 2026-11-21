/**
 * The Kharadhu Thaana keyboard: what keys there are, and what a key does to the text. Pure, so it is tested without a screen.
 *
 * The keys sit where the standard Dhivehi (Maldives) keyboard puts them, in the QWERTY positions, so a person who types
 * Dhivehi on their phone or computer already knows where everything is. Each key has what it types and what it types with
 * Shift, and the Latin letter it sits on as a hint. To change the layout, change only this file.
 */
export interface LetterKey { base: string; shift?: string; latin: string }

/** The Rufiyaa sign, Unicode 17+. Shown in the keyboard's own font; where a font lacks it the person can still type Rf. */
export const RUFIYAA = '\u20C2';

const k = (latin: string, base: string, shift?: string): LetterKey => ({ latin, base, shift });

/** The three letter rows, from the left. Vowel signs (fili) and the sukun are on the same keys, base or Shift. */
export const ROWS: readonly (readonly LetterKey[])[] = [
  [k('Q', 'ް', 'ޤ'), k('W', 'އ', 'ޢ'), k('E', 'ެ', 'ޭ'), k('R', 'ރ', 'ޜ'), k('T', 'ތ', 'ޓ'), k('Y', 'ޔ', 'ޠ'), k('U', 'ު', 'ޫ'), k('I', 'ި', 'ީ'), k('O', 'ޮ', 'ޯ'), k('P', 'ޕ', 'ޘ')],
  [k('A', 'ަ', 'ާ'), k('S', 'ސ', 'ށ'), k('D', 'ދ', 'ޑ'), k('F', 'ފ', 'ﷲ'), k('G', 'ގ', 'ޣ'), k('H', 'ހ', 'ޙ'), k('J', 'ޖ', 'ޛ'), k('K', 'ކ', 'ޚ'), k('L', 'ލ', 'ޅ')],
  [k('Z', 'ޒ', 'ޡ'), k('X', 'ޝ', '﷽'), k('C', 'ޗ', 'ޟ'), k('V', 'ވ', 'ޥ'), k('B', 'ބ', 'ޞ'), k('N', 'ނ', 'ޏ'), k('M', 'މ', 'ޱ')],
];
/** The number row: the digit, and what Shift gives. */
export const NUMBERS: readonly { base: string; shift: string }[] = [
  { base: '1', shift: '!' }, { base: '2', shift: '@' }, { base: '3', shift: '#' }, { base: '4', shift: '$' }, { base: '5', shift: '%' },
  { base: '6', shift: '^' }, { base: '7', shift: '&' }, { base: '8', shift: '*' }, { base: '9', shift: '(' }, { base: '0', shift: ')' },
];
/** The symbols page: punctuation and signs, including the Thaana comma, semicolon and question mark. */
export const SYMBOLS: readonly (readonly string[])[] = [
  ['@', '#', '$', '%', '&', '*', '-', '+', '=', '/'],
  ['(', ')', RUFIYAA, '{', '}', '[', ']', '<', '>', '^'],
  [':', ';', '،', '÷', '×', '!', '"', "'"],
];
/** Is this a vowel sign (fili or sukun)? Those are shown on a dotted circle so it is clear they sit on a letter. */
export const isSign = (ch: string): boolean => ch.length === 1 && ch.charCodeAt(0) >= 0x07a6 && ch.charCodeAt(0) <= 0x07b0;

export interface Selection { start: number; end: number }
export interface Edit { text: string; caret: number }

/** Put `ch` where the cursor is (replacing any selected text). Unchanged if it would pass `maxLength`. */
export function insertAt(text: string, sel: Selection, ch: string, maxLength?: number): Edit {
  const start = Math.min(sel.start, sel.end), end = Math.max(sel.start, sel.end);
  if (maxLength !== undefined && text.length - (end - start) + ch.length > maxLength) return { text, caret: end };
  return { text: text.slice(0, start) + ch + text.slice(end), caret: start + ch.length };
}

/** Delete the selection, or the one character before the cursor. */
export function backspaceAt(text: string, sel: Selection): Edit {
  const start = Math.min(sel.start, sel.end), end = Math.max(sel.start, sel.end);
  if (start !== end) return { text: text.slice(0, start) + text.slice(end), caret: start };
  if (start === 0) return { text, caret: 0 };
  const code = text.charCodeAt(start - 1);
  const cut = code >= 0xdc00 && code <= 0xdfff && start >= 2 ? 2 : 1; // an emoji is two code units
  return { text: text.slice(0, start - cut) + text.slice(start), caret: start - cut };
}
