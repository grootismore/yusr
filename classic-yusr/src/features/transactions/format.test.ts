import { bpsToPercentText, parseNonNegativeAmount, parsePercentToBps, parsePositiveAmount, toInputText } from './format';

describe('amount parsing for forms', () => {
  it('parsePositiveAmount accepts only amounts above zero', () => {
    expect(parsePositiveAmount('12.50')).toBe(1250);
    for (const bad of ['', '0', '0.00', '-5', 'abc', '1.234']) expect(parsePositiveAmount(bad)).toBeNull();
  });
  it('parseNonNegativeAmount treats empty as zero and rejects negatives and junk', () => {
    expect(parseNonNegativeAmount('')).toBe(0);
    expect(parseNonNegativeAmount('  ')).toBe(0);
    expect(parseNonNegativeAmount('0')).toBe(0);
    expect(parseNonNegativeAmount('1,250.5')).toBe(125050);
    for (const bad of ['-1', 'abc', '1.234', '1e3']) expect(parseNonNegativeAmount(bad)).toBeNull();
  });
  it('round-trips an amount through the edit field', () => {
    for (const laari of [1, 100, 125050, 99999999]) expect(parsePositiveAmount(toInputText(laari))).toBe(laari);
  });
});

describe('percent <-> basis points', () => {
  it.each([
    ['12.5', 1250], ['12', 1200], ['0', 0], ['0.05', 5], ['6.25', 625], ['1000', 100000], [' 7 ', 700],
  ])('%j is %d bps', (text, bps) => {
    expect(parsePercentToBps(text)).toBe(bps);
  });
  it.each(['', 'abc', '12.345', '1001', '-5', '12.', '.5', '1e2'])('rejects %j', (text) => {
    expect(parsePercentToBps(text)).toBeNull();
  });
  it('formats basis points back to editable text', () => {
    expect(bpsToPercentText(1250)).toBe('12.5');
    expect(bpsToPercentText(600)).toBe('6');
    expect(bpsToPercentText(1205)).toBe('12.05');
    expect(bpsToPercentText(5)).toBe('0.05');
    for (const bps of [0, 5, 100, 625, 1250, 100000]) expect(parsePercentToBps(bpsToPercentText(bps))).toBe(bps);
  });
});
