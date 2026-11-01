import { formatMVR } from '@/lib/money';
import { currentBalance } from '@/features/debts/logic';
import type { Debt, Receivable } from '@/features/debts/types';
import type { Commitment } from '@/features/giving/types';
import type { Transaction } from '@/features/transactions/types';

export const SECTIONS = ['debts', 'receivables', 'giving', 'note'] as const;
export type Section = (typeof SECTIONS)[number];

export interface RegisterDebt {
  lender: string;
  balance: number;
  referenceNo: string;
  notes: string;
}

export interface Register {
  debts: RegisterDebt[];
  receivables: { debtor: string; amount: number }[];
  giving: { type: Commitment['type']; amount: number; schedule: Commitment['schedule'] }[];
  note: string;
}

/**
 * What a trusted person would need: debts still owed, money owed to the owner, pending giving
 * and the instruction note. Mirrors the server's get_register_for_contact. The private
 * recipient note on giving is left out on purpose.
 */
export function buildRegister(input: {
  debts: readonly Debt[];
  transactions: readonly Transaction[];
  receivables: readonly Receivable[];
  commitments: readonly Commitment[];
  secrets: ReadonlyMap<string, { reference_no: string; notes: string }>;
  note: string;
}): Register {
  return {
    debts: input.debts
      .filter((d) => d.deleted_at === null)
      .map((d) => ({ debt: d, balance: currentBalance(d, input.transactions) }))
      .filter(({ balance }) => balance > 0)
      .map(({ debt, balance }) => ({
        lender: debt.lender,
        balance,
        referenceNo: input.secrets.get(debt.id)?.reference_no ?? '',
        notes: input.secrets.get(debt.id)?.notes ?? '',
      }))
      .sort((a, b) => a.lender.localeCompare(b.lender)),
    receivables: input.receivables
      .filter((r) => r.deleted_at === null)
      .map((r) => ({ debtor: r.debtor, amount: r.amount_laari }))
      .sort((a, b) => a.debtor.localeCompare(b.debtor)),
    giving: input.commitments
      .filter((c) => c.deleted_at === null && c.active)
      .map((c) => ({ type: c.type, amount: c.amount_laari, schedule: c.schedule }))
      .sort((a, b) => a.type.localeCompare(b.type)),
    note: input.note,
  };
}

export interface ShareLabels {
  title: string;
  debts: string;
  receivables: string;
  giving: string;
  note: string;
  reference: string;
  contactFirst: string;
  type: (type: Commitment['type']) => string;
  schedule: (schedule: Commitment['schedule']) => string;
  footer: string;
}

/** The plain text that leaves the app when the owner shares. Only the chosen sections are included. */
export function registerToText(register: Register, include: ReadonlySet<Section>, labels: ShareLabels): string {
  const lines: string[] = [labels.title];
  if (include.has('debts') && register.debts.length > 0) {
    lines.push('', labels.debts);
    for (const d of register.debts) {
      lines.push(`- ${d.lender}: ${formatMVR(d.balance)}`);
      if (d.referenceNo) lines.push(`  ${labels.reference}: ${d.referenceNo}`);
      if (d.notes) lines.push(`  ${labels.contactFirst}: ${d.notes}`);
    }
  }
  if (include.has('receivables') && register.receivables.length > 0) {
    lines.push('', labels.receivables);
    for (const r of register.receivables) lines.push(`- ${r.debtor}: ${formatMVR(r.amount)}`);
  }
  if (include.has('giving') && register.giving.length > 0) {
    lines.push('', labels.giving);
    for (const g of register.giving) lines.push(`- ${labels.type(g.type)} (${labels.schedule(g.schedule)}): ${formatMVR(g.amount)}`);
  }
  if (include.has('note') && register.note.trim() !== '') lines.push('', labels.note, register.note.trim());
  lines.push('', labels.footer);
  return lines.join('\n');
}

export interface Readiness {
  debtsAdded: boolean;
  contactInvited: boolean;
  noteWritten: boolean;
  /** How many of the three are done. */
  done: number;
}

/** PRD §6: a plain, reassuring checklist. */
export function readiness(input: { debtCount: number; contactCount: number; hasNote: boolean }): Readiness {
  const debtsAdded = input.debtCount > 0;
  const contactInvited = input.contactCount > 0;
  const noteWritten = input.hasNote;
  return { debtsAdded, contactInvited, noteWritten, done: [debtsAdded, contactInvited, noteWritten].filter(Boolean).length };
}
