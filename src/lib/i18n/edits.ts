import { getItem, setItem } from '../kv';
import { PREVIEW, getSupabase } from '../supabase';
import { i18n } from './index';

// Wording edited in the string editor (kharadhu-strings site) is kept in the database and laid over the text the app
// ships with. The last copy is remembered on the phone, so edits show at once on the next start and offline.
const CACHE_KEY = 'kharadhu.string-edits';
export interface StringEdit { key: string; lang: string; value: string }

const placeholders = (s: string): string => (s.match(/\{\{\s*\w+\s*\}\}/g) ?? []).map((p) => p.replace(/\s/g, '')).sort().join('|');

/** An edit is used only when it is plain text for a string the app has and keeps exactly the same {{placeholders}}, so an edit can never break a screen. */
export function acceptEdit(base: unknown, value: unknown): value is string {
  return typeof base === 'string' && typeof value === 'string' && value.length > 0 && value.length <= 2000 && placeholders(base) === placeholders(value);
}

// What the app shipped for each string an edit replaced, so removing an edit puts the shipped text back.
const shipped = new Map<string, string>();
const idOf = (lang: string, key: string) => `${lang}|${key}`;

/** Lay the edits over the shipped strings. Returns how many were used. */
export function applyEdits(edits: readonly StringEdit[]): number {
  let used = 0;
  for (const e of edits) {
    if ((e.lang !== 'dv' && e.lang !== 'en') || !/^[\w.]{1,120}$/.test(e.key)) continue;
    const id = idOf(e.lang, e.key);
    const base = shipped.get(id) ?? i18n.getResource(e.lang, 'translation', e.key);
    if (!acceptEdit(base, e.value)) continue;
    if (!shipped.has(id)) shipped.set(id, base as string);
    i18n.addResource(e.lang, 'translation', e.key, e.value);
    used += 1;
  }
  return used;
}

/** Put back the shipped text for every string that is no longer in `current`. Returns how many went back. */
export function revertMissing(current: readonly StringEdit[]): number {
  const keep = new Set(current.map((e) => idOf(e.lang, e.key)));
  let back = 0;
  for (const [id, base] of [...shipped]) {
    if (keep.has(id)) continue;
    const [lang, key] = id.split('|');
    i18n.addResource(lang, 'translation', key, base);
    shipped.delete(id);
    back += 1;
  }
  return back;
}

const refresh = () => { void i18n.changeLanguage(i18n.language); }; // makes every screen read its text again

/** Use the remembered edits straight away, then fetch the current ones. Never throws: wording is never worth a failed start. */
export async function loadStringEdits(): Promise<void> {
  if (PREVIEW) return;
  try {
    const cached = await getItem(CACHE_KEY);
    if (cached && applyEdits(JSON.parse(cached) as StringEdit[])) refresh();
  } catch { /* an unreadable copy is ignored */ }
  try {
    const { data, error } = await getSupabase().from('string_edits').select('key,lang,value').limit(5000);
    if (error || !data) return;
    const rows = data as StringEdit[];
    const changed = revertMissing(rows) + applyEdits(rows);
    if (changed) refresh();
    await setItem(CACHE_KEY, JSON.stringify(rows));
  } catch { /* offline: the remembered edits stay */ }
}
