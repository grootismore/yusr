import { tabOrder } from './tabOrder';

const tabs = ['home', 'transactions', 'debts', 'giving', 'more'];

describe('tabOrder', () => {
  it('reverses only on an iPhone in a right-to-left app when the phone itself is left-to-right', () => {
    expect(tabOrder(tabs, { ios: true, appRtl: true, systemRtl: false })).toEqual([...tabs].reverse());
  });
  it('leaves the order alone everywhere else', () => {
    expect(tabOrder(tabs, { ios: true, appRtl: false, systemRtl: false })).toEqual(tabs); // English
    expect(tabOrder(tabs, { ios: true, appRtl: true, systemRtl: true })).toEqual(tabs); // the phone mirrors the bar itself
    expect(tabOrder(tabs, { ios: false, appRtl: true, systemRtl: false })).toEqual(tabs); // Android
  });
});
