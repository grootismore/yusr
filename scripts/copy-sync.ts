/**
 * Moves wording between the repo and the wording editor's database (docs/COPY_EDITOR.md).
 *
 *   COPY_FUNCTION_URL=https://<ref>.supabase.co/functions/v1/copy-editor \
 *   COPY_EDITOR_PASSCODE=...  node --experimental-strip-types scripts/copy-sync.ts <command>
 *
 *   seed [--previous-en <file>]  add the strings the database does not have yet (never overwrites an edit)
 *   seed --sql [--previous-en <file>]  print the same seed as SQL instead (needs no passcode; for loading a database directly)
 *   export [--dry]               write the editor's current wording into the repo's files
 *
 * The passcode is read from the environment only and is never printed.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { applyExport, seedRows, seedSql, type ExportRow, type InviteStrings, type Tree } from '../src/features/copy/copyLib.ts';

const FILES = {
  en: 'src/lib/i18n/locales/en.json',
  dv: 'src/lib/i18n/locales/dv.json',
  invite: 'web/accept/strings.json',
};

const wantsSql = process.argv.includes('seed') && process.argv.includes('--sql');
const url = process.env.COPY_FUNCTION_URL;
const passcode = process.env.COPY_EDITOR_PASSCODE;
if (!wantsSql && (!url || !/^https?:\/\//.test(url))) throw new Error('Set COPY_FUNCTION_URL to the copy-editor function URL');
if (!wantsSql && !passcode) throw new Error('Set COPY_EDITOR_PASSCODE');

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const writeJson = (path: string, value: unknown) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

async function call(body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(url as string, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-editor-passcode': passcode as string },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(`The editor answered ${res.status}: ${String(json.error ?? 'error')}`);
  return json;
}

const [command, ...args] = process.argv.slice(2);

if (command === 'seed') {
  const previousPath = args[args.indexOf('--previous-en') + 1];
  const rows = seedRows({
    en: readJson<Tree>(FILES.en),
    dv: readJson<Tree>(FILES.dv),
    invite: readJson<InviteStrings>(FILES.invite),
    previousEn: args.includes('--previous-en') ? readJson<Tree>(previousPath) : undefined,
  });
  if (wantsSql) {
    process.stdout.write(seedSql(rows));
    process.exit(0);
  }
  const result = await call({ action: 'seed', rows });
  console.log(`Sent ${rows.length} strings: ${String(result.added)} added, ${String(result.skipped)} already there.`);
  const rejected = result.rejected as string[];
  if (rejected.length > 0) console.log(`Rejected (placeholders differ between English and Dhivehi, or the text is invalid): ${rejected.join(', ')}`);
} else if (command === 'export') {
  const { rows } = (await call({ action: 'list' })) as { rows: ExportRow[] };
  const result = applyExport(rows, { en: readJson<Tree>(FILES.en), dv: readJson<Tree>(FILES.dv), invite: readJson<InviteStrings>(FILES.invite) });
  const total = result.changed.app.length + result.changed.invite.length;
  console.log(`${rows.length} strings in the editor; ${total} differ from the repo.`);
  if (result.changed.app.length > 0) console.log(`  app: ${result.changed.app.join(', ')}`);
  if (result.changed.invite.length > 0) console.log(`  invite page: ${result.changed.invite.join(', ')}`);
  if (result.unknown.length > 0) console.log(`  in the editor but no longer in the repo (left alone): ${result.unknown.join(', ')}`);
  if (args.includes('--dry')) console.log('Dry run: no files written.');
  else if (total > 0) {
    writeJson(FILES.en, result.en);
    writeJson(FILES.dv, result.dv);
    writeJson(FILES.invite, result.invite);
    console.log('Files updated. Review the diff, run the tests, and open a pull request.');
  }
} else {
  console.log('Usage: copy-sync.ts seed [--previous-en <file>] | export [--dry]');
  process.exit(1);
}
