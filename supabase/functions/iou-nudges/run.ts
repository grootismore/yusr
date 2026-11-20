// The email nudges for IOUs, as plain logic so it can be tested without Deno or a database.
export interface Candidate {
  id: string;
  to: string;
  title: string | null;
  amount_laari: number;
  paid_laari: number;
  due_on: string;
  makerName: string | null;
  /** Dates (YYYY-MM-DD) a nudge already went out for this IOU. */
  sent: string[];
}
export interface Deps {
  today: string;
  candidates(): Promise<Candidate[]>;
  send(c: Candidate, text: { subject: string; body: string }): Promise<void>;
  log(iouId: string, date: string): Promise<void>;
}

/** Nudge from 2 days before the due date, at most every 3 days, six times in all, and never once it is paid. */
export const FIRST_DAYS_BEFORE = 2;
export const EVERY_DAYS = 3;
export const MAX_NUDGES = 6;

const days = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

export function shouldNudge(c: Candidate, today: string): boolean {
  if (c.amount_laari - c.paid_laari <= 0) return false;
  if (days(today, c.due_on) > FIRST_DAYS_BEFORE) return false;
  if (c.sent.length >= MAX_NUDGES) return false;
  const last = [...c.sent].sort().pop();
  return !last || days(last, today) >= EVERY_DAYS;
}

const mvr = (laari: number) => `MVR ${(laari / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function message(c: Candidate): { subject: string; body: string } {
  const who = c.makerName ?? 'Someone you know';
  const what = c.title ? `${c.title} (${mvr(c.amount_laari - c.paid_laari)})` : mvr(c.amount_laari - c.paid_laari);
  return {
    subject: 'A gentle reminder about an IOU',
    body: `${who} asked Kharadhu to send you a gentle reminder about ${what}, due ${c.due_on}.\n\nIf it is already sorted, you can ignore this. Thank you!`,
  };
}

export async function runNudges(deps: Deps): Promise<{ sent: number; failed: number }> {
  let sent = 0, failed = 0;
  for (const c of await deps.candidates()) {
    if (!shouldNudge(c, deps.today)) continue;
    try {
      await deps.send(c, message(c));
      // Logged after the send: a failure to log risks one extra email, never a silent missed one.
      await deps.log(c.id, deps.today);
      sent += 1;
    } catch { failed += 1; }
  }
  return { sent, failed };
}
