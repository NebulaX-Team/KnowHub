import { computed } from 'vue';
import { i18n, setI18nLocale, type AppLocale } from '@/i18n';

export function useLocale() {
  const locale = computed<AppLocale>({
    get: () => i18n.global.locale.value as AppLocale,
    set: (value) => setI18nLocale(value),
  });

  const toggleLocale = () => {
    locale.value = locale.value === 'zh-CN' ? 'en-US' : 'zh-CN';
  };

  return {
    locale,
    setLocale: (value: AppLocale) => {
      locale.value = value;
    },
    toggleLocale,
  };
}

