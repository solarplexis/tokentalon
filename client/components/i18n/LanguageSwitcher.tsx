'use client';

import { useLocale } from '@/lib/i18n/LocaleProvider';

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as 'en' | 'es')}
      className="bg-purple-800/50 text-white border border-purple-500/50 rounded px-3 py-2 text-sm backdrop-blur-sm hover:bg-purple-700/50 transition-colors cursor-pointer"
    >
      <option value="en">🇺🇸 English</option>
      <option value="es">🇪🇸 Español</option>
    </select>
  );
}
