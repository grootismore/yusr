// Pure logic for the wording-editor endpoint. Only WebCrypto, so the same file runs in the Edge
// Function and in the Jest tests (like invite.ts).

export const MAX_FAILURES_PER_HOUR = 10;
export const MAX_TEXT = 2000;
export const MAX_SEED_ROWS = 1500;
export const SURFACES = ['app', 'invite'] as const;
export type Surface = (typeof SURFACES)[number];

export interface CopyRow {
  surface: Surface;
  key: string;
  en: string;
  dv: string;
  tokens: string[];
  needs_review: boolean;
  updated_at?: string;
  updated_by?: string | null;
}

export interface CopyDb {
  countFailures(ipHash: string, since: Date): Promise<number>;
  recordFailure(ipHash: string): Promise<void>;
  list(): Promise<CopyRow[]>;
  get(surface: Surface, key: string): Promise<CopyRow | null>;
  update(surface: Surface, key: string, patch: { en?: string; dv?: string; needs_review?: boolean; updated_by: string | null }): Promise<void>;
  /** Inserts rows that do not exist yet and returns how many were added. Existing rows are never touched. */
  insertMissing(rows: CopyRow[]): Promise<number>;
}

export interface CopyRequest {
  method: string;
  passcode: string;
  body: unknown;
  ip: string;
}
export interface CopyResponse {
  status: number;
  json: Record<string, unknown>;
}

const reply = (status: number, json: Record<string, unknown>): CopyResponse => ({ status, json });

export async function sha256Hex(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Compares two hex digests without stopping at the first difference. */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Placeholders like {{name}} or {name}, normalised and sorted, so two texts can be compared. */
export function tokensOf(text: string): string[] {
  const found = text.match(/\{\{\s*[\w.]+\s*\}\}|\{\s*[\w.]+\s*\}/g) ?? [];
  return [...new Set(found.map((t) => t.replace(/\s+/g, '')))].sort();
}

const sameTokens = (a: string[], b: string[]) => a.length === b.length && a.every((t, i) => t === b[i]);

// Control characters other than newline would only ever be a paste accident.
const hasControl = (text: string) => /[\u0000-\u0009\u000b-\u001f\u007f]/.test(text);

/** The text is allowed, or the reason it is not. */
export function checkText(text: unknown, tokens: string[]): string | null {
  if (typeof text !== 'string') return 'text_required';
  if (text.trim() === '') return 'text_empty';
  if (text.length > MAX_TEXT) return 'text_too_long';
  if (hasControl(text)) return 'text_invalid_characters';
  if (!sameTokens(tokensOf(text), tokens)) return 'placeholders_changed';
  return null;
}

const isSurface = (value: unknown): value is Surface => typeof value === 'string' && (SURFACES as readonly string[]).includes(value);
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

function cleanName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.replace(/\s+/g, ' ').trim().slice(0, 60);
  return name === '' ? null : name;
}

/**
 * Behind the wording editor. One shared passcode is the only credential, so wrong guesses are
 * throttled per hashed address, an empty or missing passcode secret never lets anyone in, and
 * every edit must keep the placeholders ({{name}}) that the app's code depends on.
 */
export async function handleCopy(req: CopyRequest, db: CopyDb, secret: string, now: () => Date = () => new Date()): Promise<CopyResponse> {
  if (req.method !== 'POST') return reply(405, { ok: false, error: 'method_not_allowed' });
  if (secret === '') return reply(503, { ok: false, error: 'not_configured' });

  const ipHash = await sha256Hex(`copy-ip:${req.ip}`);
  const hourAgo = new Date(now().getTime() - 60 * 60 * 1000);
  if ((await db.countFailures(ipHash, hourAgo)) >= MAX_FAILURES_PER_HOUR) return reply(429, { ok: false, error: 'too_many_attempts' });

  const [given, expected] = await Promise.all([sha256Hex(req.passcode), sha256Hex(secret)]);
  if (req.passcode === '' || !constantTimeEqual(given, expected)) {
    await db.recordFailure(ipHash);
    return reply(401, { ok: false, error: 'wrong_passcode' });
  }

  if (!isObject(req.body) || typeof req.body.action !== 'string') return reply(400, { ok: false, error: 'invalid_request' });
  const body = req.body;

  if (body.action === 'list') return reply(200, { ok: true, rows: await db.list() });

  if (body.action === 'save') {
    if (!isSurface(body.surface) || typeof body.key !== 'string') return reply(400, { ok: false, error: 'invalid_request' });
    const row = await db.get(body.surface, body.key);
    if (!row) return reply(404, { ok: false, error: 'not_found' });
    const patch: { en?: string; dv?: string; needs_review?: boolean; updated_by: string | null } = { updated_by: cleanName(body.editor) };
    for (const lang of ['en', 'dv'] as const) {
      if (body[lang] === undefined) continue;
      const problem = checkText(body[lang], row.tokens);
      if (problem) return reply(400, { ok: false, error: problem, field: lang });
      if (body[lang] !== row[lang]) patch[lang] = body[lang] as string;
    }
    if (body.reviewed === true) patch.needs_review = false;
    if (patch.en === undefined && patch.dv === undefined && patch.needs_review === undefined) return reply(200, { ok: true, changed: false });
    await db.update(body.surface, body.key, patch);
    return reply(200, { ok: true, changed: true });
  }

  if (body.action === 'seed') {
    if (!Array.isArray(body.rows) || body.rows.length === 0 || body.rows.length > MAX_SEED_ROWS) return reply(400, { ok: false, error: 'invalid_request' });
    const rows: CopyRow[] = [];
    const rejected: string[] = [];
    for (const item of body.rows) {
      if (!isObject(item) || !isSurface(item.surface) || typeof item.key !== 'string' || item.key.length === 0 || item.key.length > 200) {
        rejected.push(String(isObject(item) ? item.key : '?'));
        continue;
      }
      const tokens = typeof item.en === 'string' ? tokensOf(item.en) : [];
      if (checkText(item.en, tokens) || checkText(item.dv, tokens)) {
        rejected.push(`${item.surface}:${item.key}`);
        continue;
      }
      rows.push({ surface: item.surface, key: item.key, en: item.en as string, dv: item.dv as string, tokens, needs_review: item.needs_review === true });
    }
    const added = rows.length > 0 ? await db.insertMissing(rows) : 0;
    return reply(200, { ok: true, added, skipped: rows.length - added, rejected });
  }

  return reply(400, { ok: false, error: 'unknown_action' });
}
