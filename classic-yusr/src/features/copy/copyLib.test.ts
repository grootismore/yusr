import { applyExport, applyToTree, flatten, seedRows, seedSql, type Tree } from './copyLib';

const en: Tree = { home: { income: 'Income', safe: 'Safe' }, ok: 'OK' };
const dv: Tree = { home: { income: 'އާމްދަނީ', safe: 'ރައްކާ' }, ok: 'ރަނގަޅު' };
const invite = { en: { accept: 'Accept', invitedBy: '{name} invited you' }, dv: { accept: 'ގަބޫލު', invitedBy: '{name} ގޮވާލެއްވި' } };

describe('flatten', () => {
  it('turns nested keys into dotted keys', () => {
    expect(flatten(en)).toEqual({ 'home.income': 'Income', 'home.safe': 'Safe', ok: 'OK' });
  });
});

describe('seedRows', () => {
  it('has a row per app and invite string, with both languages', () => {
    const rows = seedRows({ en, dv, invite });
    expect(rows).toHaveLength(5);
    expect(rows[0]).toEqual({ surface: 'app', key: 'home.income', en: 'Income', dv: 'އާމްދަނީ', needs_review: false });
    expect(rows.find((r) => r.surface === 'invite' && r.key === 'invitedBy')).toMatchObject({ en: '{name} invited you' });
  });
  it('flags the strings whose English changed since the Dhivehi was written', () => {
    const rows = seedRows({ en, dv, invite, previousEn: { home: { income: 'Your income', safe: 'Safe' }, ok: 'OK' } });
    expect(rows.filter((r) => r.needs_review).map((r) => r.key)).toEqual(['home.income']);
  });
  it('skips a string that has no Dhivehi yet', () => {
    expect(seedRows({ en: { a: 'A', b: 'B' }, dv: { a: 'ا' }, invite: { en: {}, dv: {} } }).map((r) => r.key)).toEqual(['a']);
  });
});

describe('applyToTree', () => {
  it('changes only the edited leaves and keeps the order and shape', () => {
    const { tree, changed } = applyToTree(dv, { 'home.income': 'އާމްދަނީ!', ok: 'ރަނގަޅު' });
    expect(changed).toEqual(['home.income']);
    expect(JSON.stringify(tree)).toBe(JSON.stringify({ home: { income: 'އާމްދަނީ!', safe: 'ރައްކާ' }, ok: 'ރަނގަޅު' }));
  });
  it('does not mutate its input and reports keys it does not know', () => {
    const copy = JSON.stringify(dv);
    const { unknown } = applyToTree(dv, { 'gone.key': 'x' });
    expect(JSON.stringify(dv)).toBe(copy);
    expect(unknown).toEqual(['gone.key']);
  });
});

describe('applyExport', () => {
  it('applies English and Dhivehi edits for both surfaces and lists what changed', () => {
    const result = applyExport(
      [
        { surface: 'app', key: 'home.safe', en: 'Safe to spend', dv: 'ރައްކާ' },
        { surface: 'invite', key: 'accept', en: 'Accept', dv: 'ގަބޫލުކުރަން' },
      ],
      { en, dv, invite },
    );
    expect((result.en as { home: { safe: string } }).home.safe).toBe('Safe to spend');
    expect(result.invite.dv.accept).toBe('ގަބޫލުކުރަން');
    expect(result.changed).toEqual({ app: ['home.safe'], invite: ['accept'] });
    expect(result.unknown).toEqual([]);
  });
  it('is a no-op when nothing was edited', () => {
    const rows = seedRows({ en, dv, invite });
    const result = applyExport(rows, { en, dv, invite });
    expect(result.changed).toEqual({ app: [], invite: [] });
  });
  it('reports editor rows the repo no longer has', () => {
    const result = applyExport([{ surface: 'app', key: 'removed.key', en: 'x', dv: 'y' }], { en, dv, invite });
    expect(result.unknown).toEqual(['app:removed.key']);
  });
});

describe('seedSql', () => {
  it('inserts the rows, with placeholders as a text array, and never overwrites an edit', () => {
    const sql = seedSql(seedRows({ en, dv, invite }));
    expect(sql).toContain('insert into public.copy_strings');
    expect(sql).toContain("$yusr$home.income$yusr$, $yusr$Income$yusr$, $yusr$އާމްދަނީ$yusr$, '{}', false");
    expect(sql).toContain("array[$yusr$[name]$yusr$]".replace('[name]', '{name}'));
    expect(sql.trim().endsWith('on conflict (surface, key) do nothing;')).toBe(true);
  });
  it('refuses a string that contains the quoting marker', () => {
    expect(() => seedSql([{ surface: 'app', key: 'k', en: 'a $yusr$ b', dv: 'x', needs_review: false }])).toThrow('quoting marker');
  });
});
