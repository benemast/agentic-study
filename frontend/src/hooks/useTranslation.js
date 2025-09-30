// frontend/src/hooks/useTranslation.js
import { useState, useEffect, useCallback } from 'react';
import { translations } from '../locales';

// Get language from URL, localStorage, or browser preference
const getInitialLanguage = () => {
  // Check URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get('lang');
  if (urlLang && translations[urlLang]) {
    return urlLang;
  }

  // Check localStorage
  const storedLang = localStorage.getItem('study-language');
  if (storedLang && translations[storedLang]) {
    return storedLang;
  }

  // Check browser language
  const browserLang = navigator.language.split('-')[0]; // Get 'de' from 'de-DE'
  if (translations[browserLang]) {
    return browserLang;
  }

  // Default to English
  return 'en';
};

export const useTranslation = () => {
  const [currentLanguage, setCurrentLanguage] = useState(getInitialLanguage);

  const setLanguage = useCallback((lang) => {
    if (translations[lang]) {
      setCurrentLanguage(lang);
      localStorage.setItem('study-language', lang);
      
      // Update URL parameter
      const url = new URL(window.location);
      url.searchParams.set('lang', lang);
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

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
    availableLanguages: Object.keys(translations)
  };
};