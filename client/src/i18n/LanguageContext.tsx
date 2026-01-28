import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Language, TranslationKey, t } from './translations';

const LANGUAGE_STORAGE_KEY = 'oref-language';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('he');

  // Load language from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'he' || saved === 'en') {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  }, []);

  const translate = useCallback((key: TranslationKey) => {
    return t(key, language);
  }, [language]);

  const isRTL = language === 'he';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translate, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
