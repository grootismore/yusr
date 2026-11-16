/**
 * The Kharadhu Thaana keyboard: what keys there are, and what a key does to the text. Pure, so it is tested without a screen.
 *
 * The keys are in the order of the Thaana alphabet, so nothing has to be learned first. Rows are listed from the right, the
 * way they are read. To change the layout, change only this file.
 */
export const LETTERS: readonly (readonly string[])[] = [
  ['ހ', 'ށ', 'ނ', 'ރ', 'ބ', 'ޅ', 'ކ', 'އ', 'ވ'],
  ['މ', 'ފ', 'ދ', 'ތ', 'ލ', 'ގ', 'ޏ', 'ސ', 'ޑ'],
  ['ޒ', 'ޓ', 'ޔ', 'ޕ', 'ޖ', 'ޗ'],
];
/** The vowel signs (fili) and the sukun, put on the letter before them. */
export const SIGNS: readonly string[] = ['ަ', 'ާ', 'ި', 'ީ', 'ު', 'ޫ', 'ެ', 'ޭ', 'ޮ', 'ޯ', 'ް'];
/** Letters used for words from Arabic. */
export const LOAN: readonly (readonly string[])[] = [
  ['ޘ', 'ޙ', 'ޚ', 'ޛ', 'ޜ', 'ޝ', 'ޞ'],
  ['ޟ', 'ޠ', 'ޡ', 'ޢ', 'ޣ', 'ޤ', 'ޥ'],
];
export const PUNCTUATION: readonly string[] = ['،', '.', '؟'];

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
