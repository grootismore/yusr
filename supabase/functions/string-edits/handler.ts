// Pure request logic for the string editor API, so it can be tested without Deno or a database.
export type Edit = { key: string; lang: 'dv' | 'en'; value: string };
export type Deps = {
  editorKey: string | undefined;
  list(): Promise<Edit[]>;
  save(edit: Edit): Promise<void>;
  remove(key: string, lang: string): Promise<void>;
};
export type Reply = { status: number; body: unknown };

const same = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

export async function handleEdits(req: { method: string; key: string | null; body: unknown }, deps: Deps): Promise<Reply> {
  // Fail closed: no key configured, or a wrong one, never reaches the database.
  if (!deps.editorKey || !req.key || !same(req.key, deps.editorKey)) return { status: 401, body: { error: 'unauthorized' } };
  if (req.method === 'GET') return { status: 200, body: { edits: await deps.list() } };
  if (req.method !== 'POST') return { status: 405, body: { error: 'method' } };
  const b = req.body as { key?: unknown; lang?: unknown; value?: unknown } | null;
  if (!b || typeof b.key !== 'string' || !/^[\w.]{1,120}$/.test(b.key) || (b.lang !== 'dv' && b.lang !== 'en')) return { status: 400, body: { error: 'bad_request' } };
  // null or empty means "back to the app's own wording".
  if (b.value === null || b.value === '') { await deps.remove(b.key, b.lang); return { status: 200, body: { ok: true } }; }
  if (typeof b.value !== 'string' || b.value.length > 2000) return { status: 400, body: { error: 'bad_request' } };
  await deps.save({ key: b.key, lang: b.lang, value: b.value });
  return { status: 200, body: { ok: true } };
}
