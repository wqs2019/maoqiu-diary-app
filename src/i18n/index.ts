import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enUS from './locales/en-US';
import zhCN from './locales/zh-CN';

const resources = {
  'zh-CN': {
    translation: zhCN,
  },
  'en-US': {
    translation: enUS,
  },
};

const getDeviceLanguage = () => {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale || 'zh-CN';

  if (locale.toLowerCase().startsWith('zh')) {
    return 'zh-CN';
  }

  return 'en-US';
};

i18n.use(initReactI18next).init({
  resources,
  lng: getDeviceLanguage(),
  fallbackLng: 'zh-CN',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
