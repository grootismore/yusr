/** What Kharadhu Plus unlocks, and what stays free. The database enforces the same numbers; this is for showing the prompt in time. */
export const FREE = { scans: 10, recurring: 6, splitGroups: 2, householdPeople: 2, historyMonths: 6 } as const;
export const PLUS_SCANS = 100;

export type PlusFeature = 'scans' | 'photos' | 'export' | 'household' | 'history' | 'split' | 'recurring';

export const scanLimit = (plus: boolean): number => (plus ? PLUS_SCANS : FREE.scans);
export const recurringNeedsPlus = (activeOwn: number, plus: boolean): boolean => !plus && activeOwn >= FREE.recurring;
export const splitNeedsPlus = (activeGroups: number, plus: boolean): boolean => !plus && activeGroups >= FREE.splitGroups;
export const householdNeedsPlus = (people: number, plus: boolean): boolean => !plus && people >= FREE.householdPeople;

/** Months between two YYYY-MM-01 months. */
const monthsApart = (a: string, b: string): number => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7));
/** Reports show this month and the five before it for free; older months are Plus. */
export const historyNeedsPlus = (month: string, thisMonth: string, plus: boolean): boolean => !plus && monthsApart(month, thisMonth) >= FREE.historyMonths;
