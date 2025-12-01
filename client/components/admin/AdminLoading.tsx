'use client';

import { useTranslations } from 'next-intl';

export function AdminLoading() {
  const t = useTranslations('admin');

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black flex items-center justify-center">
      <div className="text-white text-xl">{t('loadingDashboard')}</div>
    </div>
  );
}
