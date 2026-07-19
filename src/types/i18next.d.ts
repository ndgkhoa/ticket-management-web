import type { FALLBACK_LANGUAGE, resources } from '~/i18n';

/**
 * Makes `t()` keys type-checked against the English bundle.
 *
 * `en` is the reference locale: it is the fallback, so it is the one bundle
 * guaranteed to contain every key. A typo like `t('Common.Logn')` — or the
 * `vi.Common.E` / `en.Common.En` divergence this repo shipped with — becomes a
 * compile error instead of a string that renders as its own key at runtime.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: (typeof resources)[typeof FALLBACK_LANGUAGE];
  }
}
