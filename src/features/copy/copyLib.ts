import { tokensOf } from '../../../supabase/functions/_shared/copy.ts';

// Pure helpers for syncing the wording editor with the repo (see scripts/copy-sync.ts).
// No Node or React imports, so they are unit tested and run under plain Node.

export type Tree = { [key: string]: string | Tree };

export interface SeedRow {
  surface: 'app' | 'invite';
  key: string;
  en: string;
  dv: string;
  needs_review: boolean;
}
export interface ExportRow {
  surface: 'app' | 'invite';
  key: string;
  en: string;
  dv: string;
}
export interface InviteStrings {
  en: Record<string, string>;
  dv: Record<string, string>;
}

/** { a: { b: 'x' } } -> { 'a.b': 'x' } */
export function flatten(tree: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    if (typeof value === 'string') out[prefix + key] = value;
    else Object.assign(out, flatten(value, `${prefix}${key}.`));
  }
  return out;
}

/**
 * The rows to put in the database: every app string (en + dv) and every invite-page string.
 * A string whose English differs from `previousEn` is flagged as needing a review, because its
 * Dhivehi was written for the older English.
 */
export function seedRows(input: { en: Tree; dv: Tree; invite: InviteStrings; previousEn?: Tree }): SeedRow[] {
  const en = flatten(input.en);
  const dv = flatten(input.dv);
  const before = input.previousEn ? flatten(input.previousEn) : {};
  const rows: SeedRow[] = [];
  for (const key of Object.keys(en)) {
    if (dv[key] === undefined) continue;
    rows.push({ surface: 'app', key, en: en[key], dv: dv[key], needs_review: before[key] !== undefined && before[key] !== en[key] });
  }
  for (const key of Object.keys(input.invite.en)) {
    if (input.invite.dv[key] === undefined) continue;
    rows.push({ surface: 'invite', key, en: input.invite.en[key], dv: input.invite.dv[key], needs_review: false });
  }
  return rows;
}

/** Writes edited strings back into a tree, keeping its order and shape. Keys the tree does not have are skipped. */
export function applyToTree(tree: Tree, values: Record<string, string>, prefix = ''): { tree: Tree; changed: string[]; unknown: string[] } {
  const changed: string[] = [];
  const known = new Set<string>();
  const walk = (node: Tree, path: string): Tree => {
    const out: Tree = {};
    for (const [key, value] of Object.entries(node)) {
      const full = path + key;
      if (typeof value === 'string') {
        known.add(full);
        const next = values[full];
        if (next !== undefined && next !== value) {
          changed.push(full);
          out[key] = next;
        } else out[key] = value;
      } else out[key] = walk(value, `${full}.`);
    }
    return out;
  };
  const result = walk(tree, prefix);
  return { tree: result, changed, unknown: Object.keys(values).filter((key) => !known.has(key)) };
}

export interface ExportResult {
  en: Tree;
  dv: Tree;
  invite: InviteStrings;
  changed: { app: string[]; invite: string[] };
  unknown: string[];
}

/** The repo's files after applying the editor's current wording. */
export function applyExport(rows: readonly ExportRow[], files: { en: Tree; dv: Tree; invite: InviteStrings }): ExportResult {
  const app = rows.filter((row) => row.surface === 'app');
  const invite = rows.filter((row) => row.surface === 'invite');
  const en = applyToTree(files.en, Object.fromEntries(app.map((row) => [row.key, row.en])));
  const dv = applyToTree(files.dv, Object.fromEntries(app.map((row) => [row.key, row.dv])));
  const inviteEn = applyToTree(files.invite.en, Object.fromEntries(invite.map((row) => [row.key, row.en])));
  const inviteDv = applyToTree(files.invite.dv, Object.fromEntries(invite.map((row) => [row.key, row.dv])));
  return {
    en: en.tree,
    dv: dv.tree,
    invite: { en: inviteEn.tree as Record<string, string>, dv: inviteDv.tree as Record<string, string> },
    changed: { app: [...new Set([...en.changed, ...dv.changed])].sort(), invite: [...new Set([...inviteEn.changed, ...inviteDv.changed])].sort() },
    unknown: [...new Set([...en.unknown, ...dv.unknown].map((key) => `app:${key}`)), ...new Set([...inviteEn.unknown, ...inviteDv.unknown].map((key) => `invite:${key}`))],
  };
}

/**
 * The seed as SQL (for loading the hosted database without the passcode): inserts the rows that are
 * missing and leaves existing ones, and so any edits, alone.
 */
export function seedSql(rows: readonly SeedRow[]): string {
  const q = (text: string): string => {
    if (text.includes('$yusr$')) throw new Error('A string contains the SQL quoting marker $yusr$');
    return `$yusr$${text}$yusr$`;
  };
  const values = rows.map((row) => {
    const tokens = tokensOf(row.en);
    const array = tokens.length === 0 ? "'{}'" : `array[${tokens.map(q).join(', ')}]::text[]`;
    return `  (${q(row.surface)}, ${q(row.key)}, ${q(row.en)}, ${q(row.dv)}, ${array}, ${row.needs_review})`;
  });
  return `insert into public.copy_strings (surface, key, en, dv, tokens, needs_review) values\n${values.join(',\n')}\non conflict (surface, key) do nothing;\n`;
}
