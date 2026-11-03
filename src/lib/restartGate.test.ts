/* eslint-disable @typescript-eslint/no-require-imports */
describe('restart gate', () => {
  it('is closed at first and opens as soon as a layout change needs a restart', () => {
    jest.isolateModules(() => {
      const { requireRestart, restartRequired } = require('./restartGate') as typeof import('./restartGate');
      expect(restartRequired()).toBe(false);
      requireRestart();
      expect(restartRequired()).toBe(true);
    });
  });

  it('is opened by switching to a language with the other layout direction, not by the same direction', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('expo-secure-store', () => ({ getItemAsync: jest.fn(async () => null), setItemAsync: jest.fn(async () => undefined) }));
      const { initI18n, setLanguage } = require('./i18n') as typeof import('./i18n');
      const { restartRequired } = require('./restartGate') as typeof import('./restartGate');
      await initI18n();
      expect(restartRequired()).toBe(false);
      expect(await setLanguage('en')).toBe(false); // already left to right
      expect(restartRequired()).toBe(false);
      expect(await setLanguage('dv')).toBe(true); // right to left needs a restart
      expect(restartRequired()).toBe(true);
    });
  });
});
