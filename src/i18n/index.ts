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

/**
 * i18next — not a Zustand field — owns the selected language.
 *
 * The previous setup persisted `language` in the preferences store but never
 * called `changeLanguage` when that store rehydrated, so a reload restored the
 * stored value while i18next silently stayed on its hardcoded `lng`. Making
 * i18next the single source of truth removes the desync rather than patching it:
 * the detector reads the language from localStorage on init and writes it back on
 * every change.
 */
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: FALLBACK_LANGUAGE,
    // Without this, a browser reporting e.g. `fr` would resolve to a missing
    // bundle instead of falling back to `en`.
    supportedLngs: SUPPORTED_LANGUAGES,
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'language',
    },
    interpolation: {
      // React escapes interpolated values already.
      escapeValue: false,
    },
  });

export default i18n;
