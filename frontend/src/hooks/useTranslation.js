// frontend/src/hooks/useTranslation.js
import { useCallback, useEffect } from 'react';
import { useLanguage } from './useLanguage';
import { translations } from '../config/locales';

export const useTranslation = () => {
  const { currentLanguage, setLanguage, availableLanguages } = useLanguage();

  // Get translation function
  const t = useCallback((key, variables = {}) => {
    const keys = key.split('.');
    let value = translations[currentLanguage];
    
    // Navigate through nested keys
    for (const k of keys) {
      value = value?.[k];
    }
    
    // Fall back to English if translation not found
    if (!value && currentLanguage !== 'en') {
      let englishValue = translations.en;
      for (const k of keys) {
        englishValue = englishValue?.[k];
      }
      value = englishValue;
    }
    
    // Fall back to key if no translation found at all
    if (!value) {
      console.warn(`Translation missing for key: ${key} (language: ${currentLanguage})`);
      return key;
    }
    
    // Replace variables in translation
    if (typeof value === 'string' && Object.keys(variables).length > 0) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
        return variables[variable] || match;
      });
    }
    
    return value;
  }, [currentLanguage]);

  // Update URL when language changes
  useEffect(() => {
    const url = new URL(window.location);
    url.searchParams.set('lang', currentLanguage);
    window.history.replaceState({}, '', url.toString());
  }, [currentLanguage]);

  return {
    t,
    currentLanguage,
    setLanguage,
    availableLanguages
  };
};