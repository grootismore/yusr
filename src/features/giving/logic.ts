export const GIVING_KINDS = ['sadaqah', 'zakat', 'fitr', 'fidya', 'kaffarah', 'jariyah'] as const;
export type GivingKind = (typeof GIVING_KINDS)[number];

/** Voluntary giving counts toward the monthly sadaqah goal. Obligations (zakat, fitr, fidya, kaffarah) are tracked but kept apart. */
export const COUNTS_TOWARD_GOAL: readonly GivingKind[] = ['sadaqah', 'jariyah'];

export interface GivingEntry { id: string; expense_id: string; kind: GivingKind; recipient_note: string | null; amount_laari: number; spent_at: string }

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
