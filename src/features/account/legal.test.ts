import { CONSENT_KINDS, LEGAL_VERSION, legalUrl, signUpConsentMetadata } from './legal';

describe('legal', () => {
  it('stamps every required consent with the current version', () => {
    expect(signUpConsentMetadata()).toEqual({ consents: { terms: LEGAL_VERSION, privacy: LEGAL_VERSION, age_18: LEGAL_VERSION } });
    expect(CONSENT_KINDS).toHaveLength(3);
  });

  it('builds page links and tolerates a trailing slash', () => {
    expect(legalUrl('privacy', 'https://example.test')).toBe('https://example.test/privacy/');
    expect(legalUrl('terms', 'https://example.test///')).toBe('https://example.test/terms/');
  });

  it('gives no link until the site is configured', () => {
    expect(legalUrl('terms', '')).toBeNull();
    expect(legalUrl('terms', undefined)).toBeNull();
  });
});
