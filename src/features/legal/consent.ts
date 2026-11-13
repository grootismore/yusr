export const CONSENT_KINDS = ['terms', 'privacy', 'age_18'] as const;
export type ConsentKind = (typeof CONSENT_KINDS)[number];

/**
 * The version of the Terms and Privacy Policy the app asks people to agree to (a date). Bump it
 * whenever either text changes: everyone is then asked again before they can carry on.
 */
export const LEGAL_VERSION = '2026-11-15';

/** Which consents are still missing for `version` (an older version does not count). */
export function missingConsents(rows: readonly { kind: string; version: string }[], version: string = LEGAL_VERSION): ConsentKind[] {
  return CONSENT_KINDS.filter((k) => !rows.some((r) => r.kind === k && r.version === version));
}
