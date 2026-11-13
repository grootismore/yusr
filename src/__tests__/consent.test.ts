import { CONSENT_KINDS, LEGAL_VERSION, missingConsents } from '@/features/legal/consent';

describe('consents', () => {
  it('everything is missing for a new person', () => expect(missingConsents([])).toEqual([...CONSENT_KINDS]));
  it('nothing is missing once all three are accepted for the current version', () => {
    expect(missingConsents(CONSENT_KINDS.map((kind) => ({ kind, version: LEGAL_VERSION })))).toEqual([]);
  });
  it('an older version does not count: a new version asks again', () => {
    const old = CONSENT_KINDS.map((kind) => ({ kind, version: '2020-01-01' }));
    expect(missingConsents(old)).toEqual([...CONSENT_KINDS]);
    expect(missingConsents([...old, { kind: 'terms', version: LEGAL_VERSION }])).toEqual(['privacy', 'age_18']);
  });
  it('the version is a date, as the database requires', () => expect(LEGAL_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/));
});
