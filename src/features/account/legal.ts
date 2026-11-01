/** Version stamped on the consent records: bump it whenever the terms or privacy text changes. */
export const LEGAL_VERSION = '2026-11-01';

export const CONSENT_KINDS = ['terms', 'privacy', 'age_18'] as const;
export type ConsentKind = (typeof CONSENT_KINDS)[number];

/** Sent with sign-up; the database records it with the server's clock (migration 006). */
export const signUpConsentMetadata = () => ({
  consents: Object.fromEntries(CONSENT_KINDS.map((kind) => [kind, LEGAL_VERSION])),
});

/** Public legal pages live on the static site (EXPO_PUBLIC_LEGAL_URL); no link until it is set. */
export function legalUrl(page: 'terms' | 'privacy' | 'delete-account', base = process.env.EXPO_PUBLIC_LEGAL_URL): string | null {
  if (!base) return null;
  return `${base.replace(/\/+$/, '')}/${page}/`;
}
