import { splitScripts } from '@/lib/scripts';

describe('splitScripts', () => {
  it('keeps one English name together, with its spaces and hyphens', () => {
    expect(splitScripts('Areesh MIB - Cycle')).toEqual([{ latin: true, text: 'Areesh MIB - Cycle' }]);
  });
  it('sets Latin runs apart from Thaana words and keeps the spaces around them', () => {
    const r = splitScripts('ދަރަނި: Areesh MIB ގެ');
    expect(r.map((x) => x.latin)).toEqual([false, true, false]);
    expect(r[1].text).toBe('Areesh MIB');
    expect(r.map((x) => x.text).join('')).toBe('ދަރަނި: Areesh MIB ގެ');
  });
  it('keeps numbers with punctuation, and percent signs and brackets, in one run', () => {
    expect(splitScripts('MVR 5,554')).toEqual([{ latin: true, text: 'MVR 5,554' }]);
    expect(splitScripts('(15%)')[1]).toEqual({ latin: true, text: '15%)' });
  });
  it('leaves plain Thaana alone and never loses a character', () => {
    expect(splitScripts('ބަޖެޓް')).toEqual([{ latin: false, text: 'ބަޖެޓް' }]);
    const s = 'Nanns&Areesh - MACL ގެ 2027 އަހަރު';
    expect(splitScripts(s).map((x) => x.text).join('')).toBe(s);
  });
});
