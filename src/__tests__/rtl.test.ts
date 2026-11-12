import { I18nManager } from 'react-native';

jest.mock('@/lib/kv', () => {
  const store = new Map<string, string>();
  return { getItem: async (k: string) => store.get(k) ?? null, setItem: async (k: string, v: string) => void store.set(k, v), removeItem: async (k: string) => void store.delete(k) };
});

// Each test loads fresh modules: the restart flag is module state.
async function load(stored?: string, isRTL = false) {
  jest.resetModules();
  const kv = require('@/lib/kv');
  if (stored) await kv.setItem('kharadhu.language', stored);
  const rn = require('react-native');
  Object.defineProperty(rn.I18nManager, 'isRTL', { value: isRTL, configurable: true });
  const force = jest.spyOn(rn.I18nManager, 'forceRTL').mockImplementation(() => {});
  jest.spyOn(rn.I18nManager, 'allowRTL').mockImplementation(() => {});
  return { force, i18nMod: require('@/lib/i18n'), gate: require('@/lib/restartGate') };
}

afterAll(() => Object.defineProperty(I18nManager, 'isRTL', { value: false, configurable: true }));

it('first launch defaults to Dhivehi: forces RTL and asks for a restart when the layout is still LTR', async () => {
  const { force, i18nMod, gate } = await load(undefined, false);
  expect(await i18nMod.initI18n()).toBe('dv');
  expect(i18nMod.i18n.t('tabs.home')).toBe('ހޯމް');
  expect(force).toHaveBeenCalledWith(true);
  expect(gate.restartRequired()).toBe(true);
});

it('no restart when the layout already matches the language', async () => {
  const { force, i18nMod, gate } = await load('dv', true);
  await i18nMod.initI18n();
  expect(force).toHaveBeenCalledWith(true);
  expect(gate.restartRequired()).toBe(false);
});

it('switching to English at runtime forces LTR, remembers the choice and asks for a restart', async () => {
  const { force, i18nMod, gate } = await load('dv', true);
  await i18nMod.initI18n();
  expect(await i18nMod.setLanguage('en')).toBe(true);
  expect(force).toHaveBeenLastCalledWith(false);
  expect(i18nMod.i18n.t('tabs.home')).toBe('Home');
  expect(gate.restartRequired()).toBe(true);
  expect(await require('@/lib/kv').getItem('kharadhu.language')).toBe('en');
});

it('English stored: starts LTR and needs no restart', async () => {
  const { i18nMod, gate } = await load('en', false);
  expect(await i18nMod.initI18n()).toBe('en');
  expect(gate.restartRequired()).toBe(false);
});
