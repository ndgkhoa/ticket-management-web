import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import vi from '~/i18n/locales/vi';
import en from '~/i18n/locales/en';

export const SUPPORTED_LANGUAGES = ['en', 'vi'] as const;
export const FALLBACK_LANGUAGE = 'en';

export const resources = {
  en: { translation: en },
  vi: { translation: vi },
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: FALLBACK_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'language',
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
