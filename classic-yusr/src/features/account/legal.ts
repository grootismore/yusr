/** Version stamped on the consent records: bump it whenever the terms or privacy text changes. */
export const LEGAL_VERSION = '2026-11-03';

export const CONSENT_KINDS = ['terms', 'privacy', 'age_18'] as const;
export type ConsentKind = (typeof CONSENT_KINDS)[number];

/** Sent with sign-up; the database records it with the server's clock (migration 006). */
export const signUpConsentMetadata = () => ({
  consents: Object.fromEntries(CONSENT_KINDS.map((kind) => [kind, LEGAL_VERSION])),
});

/** What a consent record looks like to the app. */
export interface ConsentRecord {
  kind: string;
  version: string;
}

/**
 * The consents a person still has to give: terms or privacy never accepted, or accepted at an
 * older version than the one now published. The age confirmation is given once and stays valid.
 */
export function consentsNeeded(records: readonly ConsentRecord[], version = LEGAL_VERSION): ConsentKind[] {
  return CONSENT_KINDS.filter((kind) =>
    kind === 'age_18' ? !records.some((r) => r.kind === kind) : !records.some((r) => r.kind === kind && r.version >= version),
  );
}

/** Where the public legal pages are hosted; EXPO_PUBLIC_LEGAL_URL overrides it (an empty value turns the links off). */
export const DEFAULT_LEGAL_URL = 'https://yusrmv.netlify.app';

/** Public legal pages live on the static site; no link when the address is empty. */
export function legalUrl(page: 'terms' | 'privacy' | 'delete-account', base = process.env.EXPO_PUBLIC_LEGAL_URL ?? DEFAULT_LEGAL_URL): string | null {
  if (!base) return null;
  return `${base.replace(/\/+$/, '')}/${page}/`;
}
