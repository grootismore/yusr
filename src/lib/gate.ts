import { useConsents } from '@/data/hooks';
import { missingConsents } from '@/features/legal/consent';
import { useAuth } from './auth';
import { useFlag } from './flags';
import { WEB_LIMITED } from './platform';
import { PREVIEW } from './supabase';

/**
 * What stands between a person and the app: still checking, must agree to the terms, or the first-run setup question.
 * One place, used by the root layout (which screens exist) and by the fallback screen (which one to show).
 */
export function useGate() {
  const { signedIn, loading } = useAuth();
  const consents = useConsents(signedIn && !PREVIEW);
  const setupDone = useFlag('setupDone');
  const waiting = loading || (signedIn && !PREVIEW && consents.isLoading);
  // Everyone must have agreed to the current Terms, Privacy Policy and 18+ before using the app. If the check
  // itself fails (for example offline) we do not lock out someone who already agreed.
  const needsConsent = signedIn && !PREVIEW && consents.isSuccess && missingConsents(consents.data).length > 0;
  // First run on a phone, after agreeing to the terms: one optional setup question before the app.
  const needsSetup = signedIn && !needsConsent && !WEB_LIMITED && (!PREVIEW || process.env.EXPO_PUBLIC_PREVIEW_SETUP === '1') && setupDone === false;
  return { signedIn, waiting, needsConsent, needsSetup };
}

// Redirect-loop guard. If the app asks to be sent somewhere more than a few times in a few seconds, something is bouncing
// it back; the caller then shows a plain screen with a button instead of redirecting again.
const recent: number[] = [];
export function redirectAllowed(now: number = Date.now()): boolean {
  while (recent.length && now - recent[0] > 5000) recent.shift();
  if (recent.length >= 3) return false;
  recent.push(now);
  return true;
}
export const resetRedirectGuard = (): void => { recent.length = 0; };
