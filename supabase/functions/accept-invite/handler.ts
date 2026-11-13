import { type ContactRow, judge, MAX_ATTEMPTS_PER_HOUR, parseBody, sha256Hex } from './invite.ts';

/** Everything the handler needs from the outside world, so it can be tested without a database. */
export interface InviteDb {
  countAttempts(ipHash: string, since: Date): Promise<number>;
  recordAttempt(ipHash: string): Promise<void>;
  findByTokenHash(hash: string): Promise<ContactRow | null>;
  setStatus(id: string, status: 'accepted' | 'revoked'): Promise<void>;
}

export interface InviteRequest {
  method: string;
  body: unknown;
  ip: string;
}

export interface InviteResponse {
  status: number;
  json: Record<string, unknown>;
}

const reply = (status: number, json: Record<string, unknown>): InviteResponse => ({ status, json });

/**
 * Public endpoint behind the invite link. The token in the link is the only credential: it is
 * 256 bits of randomness, only its SHA-256 hash is stored, it expires after 7 days and it is
 * spent the moment it is used. Attempts are throttled per IP. Nothing about the owner is
 * revealed beyond the name they chose to show.
 */
export async function handleInvite(req: InviteRequest, db: InviteDb, now: () => Date = () => new Date()): Promise<InviteResponse> {
  if (req.method !== 'POST') return reply(405, { ok: false, error: 'method_not_allowed' });

  const ipHash = await sha256Hex(`ip:${req.ip}`);
  const hourAgo = new Date(now().getTime() - 60 * 60 * 1000);
  if ((await db.countAttempts(ipHash, hourAgo)) >= MAX_ATTEMPTS_PER_HOUR) {
    return reply(429, { ok: false, error: 'too_many_attempts' });
  }
  await db.recordAttempt(ipHash);

  const parsed = parseBody(req.body);
  if (!parsed) return reply(400, { ok: false, error: 'invalid' });

  const row = await db.findByTokenHash(await sha256Hex(parsed.token));
  const verdict = judge(row, now());
  if (verdict !== 'ok' || !row) return reply(verdict === 'invalid' ? 404 : 410, { ok: false, error: verdict });

  if (parsed.action === 'check') return reply(200, { ok: true, inviter_name: row.inviter_name });
  await db.setStatus(row.id, parsed.action === 'accept' ? 'accepted' : 'revoked');
  return reply(200, { ok: true, state: parsed.action === 'accept' ? 'accepted' : 'declined' });
}
