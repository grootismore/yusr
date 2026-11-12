// Edge Function: the wording editor's server side (verify_jwt = false; the shared passcode is the
// credential). Plain fetch to the database's REST API with the server key Supabase injects, like
// accept-invite. The passcode itself lives only in this function's secrets (COPY_EDITOR_PASSCODE).
import { type CopyDb, type CopyRow, handleCopy } from '../_shared/copy.ts';

const url = Deno.env.get('SUPABASE_URL') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const passcode = Deno.env.get('COPY_EDITOR_PASSCODE') ?? '';
const allowedOrigin = Deno.env.get('COPY_ALLOWED_ORIGIN') ?? '*';

async function rest(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...init.headers },
  });
  if (!res.ok) throw new Error(`database request failed (${res.status})`);
  return res;
}

const COLUMNS = 'surface,key,en,dv,tokens,needs_review,updated_at,updated_by';

const db: CopyDb = {
  async countFailures(ipHash, since) {
    const res = await rest(`copy_attempts?select=id&ip_hash=eq.${ipHash}&attempted_at=gte.${encodeURIComponent(since.toISOString())}`, {
      headers: { Prefer: 'count=exact', Range: '0-0' },
    });
    return Number(res.headers.get('content-range')?.split('/')[1] ?? 0);
  },
  async recordFailure(ipHash) {
    await rest('copy_attempts', { method: 'POST', body: JSON.stringify({ ip_hash: ipHash }), headers: { Prefer: 'return=minimal' } });
  },
  async list() {
    // The API returns at most 1000 rows per request; the app and invite page have far fewer strings.
    const res = await rest(`copy_strings?select=${COLUMNS}&order=surface,key&limit=1000`);
    return (await res.json()) as CopyRow[];
  },
  async get(surface, key) {
    const res = await rest(`copy_strings?select=${COLUMNS}&surface=eq.${surface}&key=eq.${encodeURIComponent(key)}&limit=1`);
    return ((await res.json()) as CopyRow[])[0] ?? null;
  },
  async update(surface, key, patch) {
    await rest(`copy_strings?surface=eq.${surface}&key=eq.${encodeURIComponent(key)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
      headers: { Prefer: 'return=minimal' },
    });
  },
  async insertMissing(rows) {
    const res = await rest('copy_strings?on_conflict=surface,key', {
      method: 'POST',
      body: JSON.stringify(rows),
      headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    });
    return ((await res.json()) as unknown[]).length;
  },
};

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'content-type, x-editor-passcode',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  try {
    const body = await req.json().catch(() => null);
    const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',').pop()?.trim() ?? 'unknown';
    const result = await handleCopy({ method: req.method, passcode: req.headers.get('x-editor-passcode') ?? '', body, ip }, db, passcode);
    return new Response(JSON.stringify(result.json), { status: result.status, headers });
  } catch (error) {
    // Log why (a status line, never the passcode or any wording), never echo internals to the caller.
    console.error('copy-editor failed:', error instanceof Error ? error.message : 'unknown error');
    return new Response(JSON.stringify({ ok: false, error: 'server_error' }), { status: 500, headers });
  }
});
