import type { FALLBACK_LANGUAGE, resources } from '~/i18n';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: (typeof resources)[typeof FALLBACK_LANGUAGE];
  }
}
