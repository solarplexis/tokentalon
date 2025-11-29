'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';

type Locale = 'en' | 'es';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
}

interface LocaleProviderProps {
  children: ReactNode;
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [messages, setMessages] = useState<any>(null);

  // Detect browser language and load messages
  useEffect(() => {
    const detectLocale = (): Locale => {
      // 1. Check localStorage first
      const saved = localStorage.getItem('locale');
      if (saved === 'en' || saved === 'es') {
        return saved;
      }

      // 2. Check browser language
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('es')) {
        return 'es';
      }

      // 3. Default to English
      return 'en';
    };

    const initialLocale = detectLocale();
    setLocaleState(initialLocale);
    loadMessages(initialLocale);
  }, []);

  const loadMessages = async (loc: Locale) => {
    try {
      const msgs = await import(`@/messages/${loc}.json`);
      setMessages(msgs.default);
    } catch (error) {
      console.error('Failed to load messages:', error);
      // Fallback to English
      const msgs = await import('@/messages/en.json');
      setMessages(msgs.default);
    }
  };

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
    loadMessages(newLocale);
  };

  // Don't render until messages are loaded
  if (!messages) {
    return <div>Loading...</div>;
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
