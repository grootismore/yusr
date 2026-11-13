import { buildSplit, checkConversion, conversionGain, holdings, lineMvr, paydayValue } from '@/features/foreign/logic';

const kept = [
  { currency: 'USD', amount_minor: 50_000, mvr_laari: 771_000 }, // $500 at 15.42
  { currency: 'USD', amount_minor: 50_000, mvr_laari: 775_000 }, // $500 at 15.50
  { currency: 'EUR', amount_minor: 10_000, mvr_laari: 170_000 },
];

describe('holdings', () => {
  it('adds up what was kept per currency', () => {
    const h = holdings(kept, []);
    expect(h.map((x) => [x.currency, x.minor])).toEqual([['USD', 100_000], ['EUR', 10_000]]);
  });
  it('subtracts what was exchanged and drops empty currencies', () => {
    const h = holdings(kept, [{ currency: 'USD', amount_minor: 30_000 }, { currency: 'EUR', amount_minor: 10_000 }]);
    expect(h.map((x) => [x.currency, x.minor])).toEqual([['USD', 70_000]]);
  });
  it('nothing kept means nothing held', () => expect(holdings([], [{ currency: 'USD', amount_minor: 100 }])).toEqual([]));
});

describe('gain or loss on an exchange', () => {
  const usd = holdings(kept, [])[0];
  it('values money at the average payday rate', () => expect(paydayValue(usd, 100_000)).toBe(1_546_000));
  it('a better rate than payday is a gain', () => expect(conversionGain(usd, 100_000, 1_560_000)).toBe(14_000));
  it('a worse rate is a loss', () => expect(conversionGain(usd, 50_000, 760_000)).toBe(-13_000));
});

describe('checkConversion', () => {
  const usd = { minor: 100_000 };
  it('accepts an amount within what is held', () => expect(checkConversion(usd, '300', '4,626.00')).toEqual({ ok: true, minor: 30_000, mvr: 462_600 }));
  it('refuses more than is held', () => expect(checkConversion(usd, '1001', '100')).toEqual({ ok: false, error: 'tooMuch' }));
  it('refuses a missing MVR amount', () => expect(checkConversion(usd, '10', '')).toEqual({ ok: false, error: 'mvr' }));
  it('refuses a zero or bad amount', () => { expect(checkConversion(usd, '0', '5')).toEqual({ ok: false, error: 'amount' }); expect(checkConversion(usd, 'abc', '5')).toEqual({ ok: false, error: 'amount' }); });
});

describe('split payday', () => {
  it('makes one income row per filled line', () => {
    const r = buildSplit([{ currency: 'MVR', amount: '8000', rate: '', keep: false }, { currency: 'USD', amount: '500', rate: '15.42', keep: true }, { currency: 'EUR', amount: '', rate: '', keep: false }]);
    expect(r.rows).toEqual([
      { amount_laari: 800_000, currency: 'MVR', fx_rate_to_mvr: '1', keep_in_currency: false },
      { amount_laari: 50_000, currency: 'USD', fx_rate_to_mvr: '15.42', keep_in_currency: true },
    ]);
  });
  it('MVR is never "kept"', () => expect(buildSplit([{ currency: 'MVR', amount: '10', rate: '', keep: true }]).rows[0].keep_in_currency).toBe(false));
  it('reports a foreign line without a rate', () => {
    const r = buildSplit([{ currency: 'USD', amount: '500', rate: '', keep: false }]);
    expect(r.rows).toEqual([]); expect(r.errors[0].rate).toBe(true);
  });
  it('reports a bad amount', () => expect(buildSplit([{ currency: 'MVR', amount: '1.234', rate: '', keep: false }]).errors[0].amount).toBe(true));
  it('previews a line in MVR', () => { expect(lineMvr({ currency: 'USD', amount: '500', rate: '15.42', keep: false })).toBe(771_000); expect(lineMvr({ currency: 'USD', amount: '500', rate: '', keep: false })).toBeNull(); });
});
