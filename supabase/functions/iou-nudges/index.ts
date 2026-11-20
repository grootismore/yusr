// Edge Function: email nudges for IOUs (Deno). Called on a schedule by whatever you set up; NOTHING in this repo
// schedules it. Secrets (supabase secrets set): RESEND_API_KEY, RESEND_FROM (a verified sender, e.g.
// "Kharadhu <no-reply@your-domain>"), IOU_CRON_SECRET (a long random string the caller sends as x-cron-secret).
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by the platform.
import { runNudges, type Candidate, type Deps } from './run.ts';

const url = Deno.env.get('SUPABASE_URL') ?? '';
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const H = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...H, ...init.headers } });
  if (!r.ok) throw new Error(`database ${r.status}`);
  return init.method === 'POST' ? (undefined as T) : await r.json();
}
const ids = (xs: string[]) => `in.(${xs.join(',')})`;

// Maldives time (UTC+5), read on every call: a running instance can live past midnight.
const todayStr = () => new Date(Date.now() + 5 * 3_600_000).toISOString().slice(0, 10);

const deps: Deps = {
  get today() { return todayStr(); },
  async candidates() {
    const soon = new Date(Date.parse(`${todayStr()}T00:00:00Z`) + 2 * 86_400_000).toISOString().slice(0, 10);
    const rows = await rest<{ id: string; user_id: string; person_email: string; title: string | null; amount_laari: number; due_on: string }[]>(
      `ious?select=id,user_id,person_email,title,amount_laari,due_on&nudge=eq.both&direction=eq.lent&person_email=not.is.null&due_on=lte.${soon}&limit=500`);
    if (!rows.length) return [];
    const iouIds = rows.map((r) => r.id);
    const [pays, sent, names] = await Promise.all([
      rest<{ iou_id: string; amount_laari: number }[]>(`iou_payments?select=iou_id,amount_laari&iou_id=${ids(iouIds)}`),
      rest<{ iou_id: string; sent_on: string }[]>(`iou_nudges?select=iou_id,sent_on&iou_id=${ids(iouIds)}`),
      rest<{ user_id: string; display_name: string }[]>(`household_members?select=user_id,display_name&user_id=${ids([...new Set(rows.map((r) => r.user_id))])}`),
    ]);
    return rows.map((r): Candidate => ({
      id: r.id, to: r.person_email, title: r.title, amount_laari: r.amount_laari, due_on: r.due_on,
      paid_laari: pays.filter((p) => p.iou_id === r.id).reduce((s, p) => s + p.amount_laari, 0),
      makerName: names.find((n) => n.user_id === r.user_id)?.display_name ?? null,
      sent: sent.filter((n) => n.iou_id === r.id).map((n) => n.sent_on),
    }));
  },
  async send(c, m) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json', 'Idempotency-Key': `iou-${c.id}-${todayStr()}` },
      body: JSON.stringify({ from: Deno.env.get('RESEND_FROM'), to: [c.to], subject: m.subject, text: m.body }),
    });
    if (!r.ok) throw new Error(`resend ${r.status}`);
  },
  async log(iouId, date) {
    await rest('iou_nudges', { method: 'POST', body: JSON.stringify({ iou_id: iouId, sent_on: date }), headers: { Prefer: 'return=minimal' } });
  },
};

Deno.serve(async (req) => {
  const secret = Deno.env.get('IOU_CRON_SECRET');
  // No secret configured = the endpoint stays closed.
  if (req.method !== 'POST' || !secret || req.headers.get('x-cron-secret') !== secret) return new Response('forbidden', { status: 403 });
  // Email not set up yet: do nothing, and say so, rather than trying every IOU and failing.
  if (!Deno.env.get('RESEND_API_KEY') || !Deno.env.get('RESEND_FROM')) return Response.json({ skipped: 'email is not set up' });
  try {
    return Response.json(await runNudges(deps));
  } catch (e) {
    console.error('iou-nudges failed:', e instanceof Error ? e.message : 'unknown');
    return Response.json({ error: 'failed' }, { status: 500 });
  }
});
