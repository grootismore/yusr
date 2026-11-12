import { logoHeaderOptions } from './HeaderLogo';

describe('header logo', () => {
  it('drops the iOS 26 glass capsule for the logo and still works as a plain left item elsewhere', () => {
    const [item] = logoHeaderOptions.unstable_headerLeftItems();
    expect(item).toMatchObject({ type: 'custom', hidesSharedBackground: true });
    expect(logoHeaderOptions.headerLeft()).toBeTruthy();
  });
});
