export const MIN_PASSWORD = 8;

/** A plain, forgiving check that something looks like an email address (the server does the real check). */
export const isEmail = (s: string): boolean => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.trim());

export interface PasswordCheck { longEnough: boolean; mixed: boolean }

/** Only length is required. "Mixed" (a letter and a digit) is a gentle tip, never a blocker. */
export function checkPassword(pw: string): PasswordCheck {
  return { longEnough: pw.length >= MIN_PASSWORD, mixed: /[A-Za-zހ-ޱ]/.test(pw) && /\d/.test(pw) };
}
