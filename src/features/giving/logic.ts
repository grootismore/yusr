export const GIVING_KINDS = ['sadaqah', 'zakat', 'fitr', 'fidya', 'kaffarah', 'jariyah'] as const;
export type GivingKind = (typeof GIVING_KINDS)[number];

/** Voluntary giving counts toward the monthly sadaqah goal. Obligations (zakat, fitr, fidya, kaffarah) are tracked but kept apart. */
export const COUNTS_TOWARD_GOAL: readonly GivingKind[] = ['sadaqah', 'jariyah'];

export interface GivingEntry { id: string; expense_id: string; kind: GivingKind; recipient_note: string | null; amount_laari: number; spent_at: string; commitment_id?: string | null }

/** A standing monthly gift. It stays until the person ends it (ended_on set). Nothing is paid automatically. */
export interface GivingCommitment { id: string; recipient: string; note: string | null; amount_laari: number; kind: 'sadaqah' | 'jariyah'; due_day: number; started_on: string; ended_on: string | null }

export const activeCommitments = (all: readonly GivingCommitment[]): GivingCommitment[] => all.filter((c) => !c.ended_on);
export const commitmentTotal = (all: readonly GivingCommitment[]): number => activeCommitments(all).reduce((s, c) => s + c.amount_laari, 0);
/** `thisMonth` entries are this month's giving; a commitment is paid once an entry points at it. */
export const isPaid = (c: GivingCommitment, thisMonth: readonly GivingEntry[]): boolean => thisMonth.some((e) => e.commitment_id === c.id);
/** The private note stored on the giving entry: who it went to, and the commitment's own note. */
export const commitmentNote = (c: GivingCommitment): string => (c.note ? `${c.recipient} · ${c.note}` : c.recipient).slice(0, 200);

export function monthGiving(entries: readonly GivingEntry[]): { goalCounted: number; obligations: number; total: number } {
  let goalCounted = 0, obligations = 0;
  for (const e of entries) {
    if (COUNTS_TOWARD_GOAL.includes(e.kind)) goalCounted += e.amount_laari;
    else obligations += e.amount_laari;
  }
  return { goalCounted, obligations, total: goalCounted + obligations };
}

/** Progress toward the goal, as a whole percent that can pass 100 (giving more is never an error). */
export const goalPercent = (given: number, goal: number): number => Math.floor((given * 100) / goal);

/** Reminder dates for a zakat date: a week before and the day itself, only those still ahead of `now`. */
export function reminderDates(zakatIso: string, now: Date): Date[] {
  const [y, m, d] = zakatIso.split('-').map(Number);
  return [new Date(y, m - 1, d - 7, 9), new Date(y, m - 1, d, 9)].filter((at) => at.getTime() > now.getTime());
}
