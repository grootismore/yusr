import { CONSENT_KINDS, consentsNeeded, DEFAULT_LEGAL_URL, LEGAL_VERSION, legalUrl, signUpConsentMetadata } from './legal';

describe('legal', () => {
  it('stamps every required consent with the current version', () => {
    expect(signUpConsentMetadata()).toEqual({ consents: { terms: LEGAL_VERSION, privacy: LEGAL_VERSION, age_18: LEGAL_VERSION } });
    expect(CONSENT_KINDS).toHaveLength(3);
  });

  it('builds page links and tolerates a trailing slash', () => {
    expect(legalUrl('privacy', 'https://example.test')).toBe('https://example.test/privacy/');
    expect(legalUrl('terms', 'https://example.test///')).toBe('https://example.test/terms/');
  });

  it('turns the links off with an empty address and otherwise points at the hosted site', () => {
    expect(legalUrl('terms', '')).toBeNull();
    expect(legalUrl('privacy', undefined)).toBe(`${DEFAULT_LEGAL_URL}/privacy/`);
  });

  it('asks again only when a newer version is published', () => {
    const all = CONSENT_KINDS.map((kind) => ({ kind, version: LEGAL_VERSION }));
    expect(consentsNeeded(all)).toEqual([]); // up to date
    expect(consentsNeeded([])).toEqual(['terms', 'privacy', 'age_18']); // never accepted
    const old = CONSENT_KINDS.map((kind) => ({ kind, version: '2026-01-01' }));
    expect(consentsNeeded(old)).toEqual(['terms', 'privacy']); // the age confirmation stays valid
    expect(consentsNeeded(old, '2026-01-01')).toEqual([]);
    expect(consentsNeeded([{ kind: 'terms', version: LEGAL_VERSION }, { kind: 'age_18', version: '2026-01-01' }])).toEqual(['privacy']);
  });
});
