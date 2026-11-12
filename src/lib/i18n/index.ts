import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager, Platform } from 'react-native';
import { getItem, setItem } from '../kv';
import { requireRestart } from '../restartGate';
import dv from './locales/dv.json';
import en from './locales/en.json';

export const LANGUAGES = ['dv', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'dv';

/** Each language is always shown in its own name and script. */
export const LANGUAGE_NAMES: Record<Language, string> = { dv: 'ދިވެހި', en: 'English' };

const STORAGE_KEY = 'kharadhu.language';
const i18n = createInstance();

export const isRtl = (language: Language): boolean => language === 'dv';
export const isLanguage = (value: unknown): value is Language => (LANGUAGES as readonly unknown[]).includes(value);

/** Dhivehi is the default; only an explicit stored choice changes it (the device language does not). */
export const resolveLanguage = (stored: string | null): Language => (isLanguage(stored) ? stored : DEFAULT_LANGUAGE);

/** Set the native layout direction. Returns true when the app must restart for it to take effect. */
function applyDirection(language: Language): boolean {
  if (Platform.OS === 'web') return false; // web preview follows the root `dir` instead
  const rtl = isRtl(language);
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(rtl);
  return I18nManager.isRTL !== rtl;
}

export async function initI18n(): Promise<Language> {
  const language = resolveLanguage(await getItem(STORAGE_KEY));
  await i18n.use(initReactI18next).init({
    resources: { dv: { translation: dv }, en: { translation: en } },
    lng: language,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
  if (applyDirection(language)) requireRestart(); // e.g. very first launch on a left-to-right phone
  return language;
}

/** Switch language and remember it. Returns whether a restart is needed for the new direction. */
export async function setLanguage(language: Language): Promise<boolean> {
  await i18n.changeLanguage(language);
  await setItem(STORAGE_KEY, language);
  const needsRestart = applyDirection(language);
  if (needsRestart) requireRestart();
  return needsRestart;
}

export { i18n };
