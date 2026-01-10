'use client';

import { useTranslation } from '@/utils/use-translation';
import type { Locale } from '@/utils/i18n';

const LanguageSelector = () => {
  const { locale, setLocale } = useTranslation();

  const handleLocaleChange = (newLocale: Locale) => {
    if (newLocale !== locale) {
      setLocale(newLocale);
    }
  };

  return (
    <div className="flex items-center gap-1 rounded-xl bg-black/5 p-1">
      <button
        type="button"
        onClick={() => handleLocaleChange('en')}
        aria-pressed={locale === 'en'}
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
          locale === 'en'
            ? 'bg-white text-[#2D2A26] shadow-sm'
            : 'text-[#6B635B] hover:text-[#2D2A26]'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => handleLocaleChange('de')}
        aria-pressed={locale === 'de'}
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
          locale === 'de'
            ? 'bg-white text-[#2D2A26] shadow-sm'
            : 'text-[#6B635B] hover:text-[#2D2A26]'
        }`}
      >
        DE
      </button>
    </div>
  );
};

export default LanguageSelector;
