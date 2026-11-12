// Pure logic for the invite-accept endpoint. No Deno or Node APIs beyond WebCrypto, so the
// same file runs in the Edge Function and in the Jest tests.

export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/; // 32 random bytes, base64url, no padding
export const MAX_ATTEMPTS_PER_HOUR = 20;

export type InviteAction = 'check' | 'accept' | 'decline';

export async function sha256Hex(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function parseBody(body: unknown): { token: string; action: InviteAction } | null {
  if (typeof body !== 'object' || body === null) return null;
  const { token, action } = body as Record<string, unknown>;
  if (typeof token !== 'string' || !TOKEN_PATTERN.test(token)) return null;
  if (action !== 'check' && action !== 'accept' && action !== 'decline') return null;
  return { token, action };
}

export interface ContactRow {
  id: string;
  status: 'invited' | 'accepted' | 'revoked';
  invite_expires_at: string;
  inviter_name: string | null;
}

export type Verdict = 'ok' | 'invalid' | 'expired' | 'used';

/** An invite can be used once, before it expires, while it is still only "invited". */
export function judge(row: ContactRow | null, now: Date): Verdict {
  if (!row) return 'invalid';
  if (row.status !== 'invited') return 'used';
  if (new Date(row.invite_expires_at).getTime() <= now.getTime()) return 'expired';
  return 'ok';
}
