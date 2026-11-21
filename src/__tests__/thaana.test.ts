import { NUMBERS, ROWS, backspaceAt, insertAt, isSign } from '@/features/keyboard/thaana';

describe('Thaana keyboard layout', () => {
  const all = ROWS.flat().flatMap((k) => (k.shift ? [k.base, k.shift] : [k.base]));

  it('has every Thaana letter once, and every vowel sign once', () => {
    const letters = all.filter((c) => !isSign(c) && c.charCodeAt(0) >= 0x0780 && c.charCodeAt(0) <= 0x07a5);
    expect(new Set(letters).size).toBe(letters.length);
    for (let c = 0x0780; c <= 0x07a5; c++) expect(letters).toContain(String.fromCharCode(c));
    const signs = all.filter(isSign);
    expect(new Set(signs).size).toBe(signs.length);
    for (let c = 0x07a6; c <= 0x07b0; c++) expect(signs).toContain(String.fromCharCode(c));
  });

  it('puts the unshifted keys where the standard Dhivehi keyboard has them', () => {
    const base = Object.fromEntries(ROWS.flat().map((k) => [k.latin, k.base]));
    expect(base).toMatchObject({
      Q: 'ް', W: 'އ', E: 'ެ', R: 'ރ', T: 'ތ', Y: 'ޔ', U: 'ު', I: 'ި', O: 'ޮ', P: 'ޕ',
      A: 'ަ', S: 'ސ', D: 'ދ', F: 'ފ', G: 'ގ', H: 'ހ', J: 'ޖ', K: 'ކ', L: 'ލ',
      Z: 'ޒ', X: 'ޝ', C: 'ޗ', V: 'ވ', B: 'ބ', N: 'ނ', M: 'މ',
    });
  });

  it('has the QWERTY rows, ten digits and their symbols', () => {
    expect(ROWS.map((r) => r.map((k) => k.latin).join(''))).toEqual(['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']);
    expect(NUMBERS.map((n) => n.base).join('')).toBe('1234567890');
    expect(NUMBERS.map((n) => n.shift).join('')).toBe('!@#$%^&*()');
  });
});

describe('insertAt', () => {
  it('puts a letter at the cursor', () => {
    expect(insertAt('ހަ', { start: 1, end: 1 }, 'ރ')).toEqual({ text: 'ހރަ', caret: 2 });
  });
  it('replaces the selected text', () => {
    expect(insertAt('ހރަ', { start: 0, end: 2 }, 'ބ')).toEqual({ text: 'ބަ', caret: 1 });
  });
  it('stops at the field limit', () => {
    expect(insertAt('ހރ', { start: 2, end: 2 }, 'ބ', 2)).toEqual({ text: 'ހރ', caret: 2 });
  });
});

describe('backspaceAt', () => {
  it('removes the character before the cursor, a vowel sign first', () => {
    expect(backspaceAt('ހަ', { start: 2, end: 2 })).toEqual({ text: 'ހ', caret: 1 });
  });
  it('removes a selection', () => {
    expect(backspaceAt('ހރބ', { start: 1, end: 3 })).toEqual({ text: 'ހ', caret: 1 });
  });
  it('does nothing at the start, and takes a whole emoji', () => {
    expect(backspaceAt('ހ', { start: 0, end: 0 })).toEqual({ text: 'ހ', caret: 0 });
    expect(backspaceAt('a😀', { start: 3, end: 3 })).toEqual({ text: 'a', caret: 1 });
  });
});
