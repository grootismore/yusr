export const COMMITMENT_TYPES = ['sadaqah', 'zakat', 'fitr', 'fidya', 'kaffarah', 'jariyah'] as const;
export type CommitmentType = (typeof COMMITMENT_TYPES)[number];

export const SCHEDULES = ['once', 'weekly_friday', 'monthly', 'ramadan', 'dhul_hijjah'] as const;
export type Schedule = (typeof SCHEDULES)[number];

export interface Commitment {
  id: string;
  user_id: string;
  type: CommitmentType;
  amount_laari: number;
  schedule: Schedule;
  /** Required for `once`. */
  due_on: string | null;
  /** Required for `monthly`. */
  day_of_month: number | null;
  recipient_note: string | null;
  reminder_enabled: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
