// Edge Function: public invite-accept endpoint (verify_jwt = false in config.toml; the invite
// token is the credential). It uses the service role from the function's own environment,
// which Supabase injects, so the key never leaves the server. Plain fetch to the database's
// REST API: no client library, so nothing extra to download or trust on a public endpoint.
import { handleInvite, type InviteDb } from './handler.ts';

const url = Deno.env.get('SUPABASE_URL') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const allowedOrigin = Deno.env.get('INVITE_ALLOWED_ORIGIN') ?? '*';

async function rest(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...init.headers },
  });
  if (!res.ok) throw new Error(`database request failed (${res.status})`);
  return res;
}

const db: InviteDb = {
  async countAttempts(ipHash, since) {
    const res = await rest(
      `invite_attempts?select=id&ip_hash=eq.${ipHash}&attempted_at=gte.${encodeURIComponent(since.toISOString())}`,
      { headers: { Prefer: 'count=exact', Range: '0-0' } },
    );
    return Number(res.headers.get('content-range')?.split('/')[1] ?? 0);
  },
  async recordAttempt(ipHash) {
    await rest('invite_attempts', { method: 'POST', body: JSON.stringify({ ip_hash: ipHash }), headers: { Prefer: 'return=minimal' } });
  },
  async findByTokenHash(hash) {
    const res = await rest(`trusted_contacts?select=id,status,invite_expires_at,inviter_name&invite_token_hash=eq.${hash}&limit=1`);
    const rows = await res.json();
    return rows[0] ?? null;
  },
  async setStatus(id, status) {
    await rest(`trusted_contacts?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ status }), headers: { Prefer: 'return=minimal' } });
  },
};

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  try {
    const body = await req.json().catch(() => null);
    // Prefer the CDN's own header; otherwise the LAST forwarded address, which the platform's proxy
    // appended (the first can be supplied by the caller).
    const ip =
      req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',').pop()?.trim() ?? 'unknown';
    const result = await handleInvite({ method: req.method, body, ip }, db);
    return new Response(JSON.stringify(result.json), { status: result.status, headers });
  } catch (error) {
    // Log why (a status line like "database request failed (403)", never the token or any data),
    // but never echo internals back to a public caller.
    console.error('accept-invite failed:', error instanceof Error ? error.message : 'unknown error');
    return new Response(JSON.stringify({ ok: false, error: 'server_error' }), { status: 500, headers });
  }
});
