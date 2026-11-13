export const REGISTER_KINDS = ['debt', 'receivable', 'giving', 'trust', 'wish'] as const;
export type RegisterKind = (typeof REGISTER_KINDS)[number];
export interface RegisterItem { id: string; kind: RegisterKind; title: string; counterparty: string | null; amount_laari: number | null }
export interface TrustedContact { id: string; name: string; email: string; status: 'invited' | 'accepted' | 'revoked'; inviter_name: string | null; invite_expires_at: string }
export type LadderState = 'active' | 'quiet' | 'second_checkin' | 'contacts_asked' | 'released';
export interface Checkin { state: LadderState; away_until: string | null; last_active_at: string }
export interface AuditEntry { id: string; actor: 'user' | 'contact' | 'system'; event: string; meta: Record<string, unknown>; created_at: string }
export interface ContactCase { owner_id: string; inviter_name: string | null; state: LadderState; my_answer: 'fine' | 'passed' | null }
export interface ContactRegister {
  items: { kind: RegisterKind; title: string; counterparty: string | null; amount_laari: number | null; details: string | null }[];
  debts: { lender: string; kind: string; balance_laari: number }[];
}
export const AWAY_CHOICES = [7, 14, 30, 60, 90] as const;
