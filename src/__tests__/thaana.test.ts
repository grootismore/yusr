import { LETTERS, LOAN, SIGNS, backspaceAt, insertAt } from '@/features/keyboard/thaana';

describe('Thaana keyboard layout', () => {
  it('has every Thaana letter once, and every vowel sign', () => {
    const all = [...LETTERS.flat(), ...LOAN.flat()];
    expect(new Set(all).size).toBe(all.length);
    for (let c = 0x0780; c <= 0x07a5; c++) expect(all).toContain(String.fromCharCode(c));
    for (let c = 0x07a6; c <= 0x07b0; c++) expect(SIGNS).toContain(String.fromCharCode(c));
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
