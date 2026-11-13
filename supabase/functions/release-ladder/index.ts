// Edge Function: the release ladder (Deno). Called on a schedule by whatever you set up; NOTHING in this repo
// schedules it, and with release_config.enabled = false it does nothing. Secrets (supabase secrets set):
//   RESEND_API_KEY, RESEND_FROM (a verified sender, e.g. "Kharadhu <no-reply@your-domain>"),
//   RELEASE_CRON_SECRET (a long random string the caller sends), APP_URL (where the app/web is hosted).
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by the platform.
import { runLadder, type Deps } from './run.ts';

const url = Deno.env.get('SUPABASE_URL') ?? '';
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const H = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

async function rest(path: string, init: RequestInit = {}): Promise<Response> {
  return await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...H, ...init.headers } });
}
async function json<T>(path: string): Promise<T> {
  const r = await rest(path);
  if (!r.ok) throw new Error(`database ${r.status}`);
  return await r.json();
}

const deps: Deps = {
  appUrl: Deno.env.get('APP_URL') ?? '',
  async enabled() {
    const rows = await json<{ enabled: boolean }[]>('release_config?select=enabled&id=eq.1');
    return rows[0]?.enabled === true;
  },
  listOpen: (now) => json(`release_checkins?select=user_id,state,last_active_at,quiet_at,second_checkin_at,contacts_asked_at,away_until&state=neq.released&or=(state.neq.active,last_active_at.lt.${encodeURIComponent(new Date(now.getTime() - 30 * 86_400_000).toISOString())})&limit=1000`),
  contacts: (u) => json(`trusted_contacts?select=id,name,email,status,inviter_name&user_id=eq.${u}`),
  confirmations: (u) => json(`release_confirmations?select=contact_id,answer,answered_at,withdrawn_at&user_id=eq.${u}`),
  async setState(u, to) {
    const r = await rest(`release_checkins?user_id=eq.${u}`, { method: 'PATCH', body: JSON.stringify({ state: to }), headers: { Prefer: 'return=minimal' } });
    if (r.ok) return 'ok';
    const body = await r.json().catch(() => ({}));
    if (body?.code === '23514') return 'refused'; // the database's guard said no
    throw new Error(`database ${r.status}`);
  },
  async log(u, event, meta) {
    await rest('rpc/log_release_event', { method: 'POST', body: JSON.stringify({ p_user: u, p_event: event, p_meta: meta }) });
  },
  async ownerEmail(u) {
    const r = await fetch(`${url}/auth/v1/admin/users/${u}`, { headers: H });
    return r.ok ? ((await r.json()).email ?? null) : null;
  },
  async send(e) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json', 'Idempotency-Key': e.key },
      body: JSON.stringify({ from: Deno.env.get('RESEND_FROM'), to: [e.to], subject: e.subject, text: e.text, html: e.html }),
    });
    if (!r.ok) throw new Error(`resend ${r.status}`);
  },
};

Deno.serve(async (req) => {
  const secret = Deno.env.get('RELEASE_CRON_SECRET');
  // Constant-ish check; the secret is long and random. No secret configured = the endpoint stays closed.
  if (req.method !== 'POST' || !secret || req.headers.get('x-cron-secret') !== secret) return new Response('forbidden', { status: 403 });
  try {
    return Response.json(await runLadder(deps));
  } catch (e) {
    console.error('release-ladder failed:', e instanceof Error ? e.message : 'unknown');
    return Response.json({ error: 'failed' }, { status: 500 });
  }
});
