import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import { getLocales } from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import dv from './locales/dv.json';
import en from './locales/en.json';

export const LANGUAGES = ['en', 'dv'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Each language is always shown in its own name and script. */
export const LANGUAGE_NAMES: Record<Language, string> = { en: 'English', dv: 'ދިވެހި' };

const i18n = createInstance();

const STORAGE_KEY = 'yusr.language';

export const isRtl = (language: Language): boolean => language === 'dv';

function isLanguage(value: unknown): value is Language {
  return (LANGUAGES as readonly unknown[]).includes(value);
}

/** Stored choice wins; otherwise Dhivehi if it is the device's first language; otherwise English. */
export function resolveLanguage(
  stored: string | null,
  deviceLanguageCodes: readonly (string | null)[],
): Language {
  if (isLanguage(stored)) return stored;
  return deviceLanguageCodes[0] === 'dv' ? 'dv' : 'en';
}

/** Returns true when the app must be restarted for the layout direction to change. */
function applyDirection(language: Language): boolean {
  const rtl = isRtl(language);
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(rtl);
  return I18nManager.isRTL !== rtl;
}

export async function initI18n(): Promise<void> {
  const stored = await SecureStore.getItemAsync(STORAGE_KEY).catch(() => null);
  const language = resolveLanguage(
    stored,
    getLocales().map((locale) => locale.languageCode),
  );
  await i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, dv: { translation: dv } },
    lng: language,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
  applyDirection(language);
}

/** Switch language, remember it, and report whether a restart is needed for RTL/LTR. */
export async function setLanguage(language: Language): Promise<boolean> {
  await i18n.changeLanguage(language);
  await SecureStore.setItemAsync(STORAGE_KEY, language).catch(() => undefined);
  return applyDirection(language);
}

export { i18n };
