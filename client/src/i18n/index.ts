import { createI18n } from 'vue-i18n';
import zhCN from './locales/zh-CN';
import enUS from './locales/en-US';

export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

const STORAGE_KEY = 'knowhub_locale';
const DEFAULT_LOCALE: AppLocale = 'zh-CN';

function isLocale(value: string): value is AppLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

function detectInitialLocale(): AppLocale {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE;
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved && isLocale(saved)) {
    return saved;
  }

  const browser = (window.navigator.language || '').toLowerCase();
  return browser.startsWith('zh') ? 'zh-CN' : 'en-US';
}

const initialLocale = detectInitialLocale();

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
});

export function setI18nLocale(locale: AppLocale) {
  i18n.global.locale.value = locale;

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.setAttribute('lang', locale);
  }
}

setI18nLocale(initialLocale);
