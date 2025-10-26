// frontend/src/hooks/useLanguage.js
/**
 * Hook for language management
 * Provides interface to language state in session store
 */
import { useSessionStore } from '../store/sessionStore';

export const useLanguage = () => {
  const currentLanguage = useSessionStore(state => state.currentLanguage);
  const initialLanguageSource = useSessionStore(state => state.initialLanguageSource);
  const wasLanguageSelected = useSessionStore(state => state.wasLanguageSelected);
  const setLanguage = useSessionStore(state => state.setLanguage);
  const availableLanguages = useSessionStore(state => state.availableLanguages);

  return {
    currentLanguage,
    initialLanguageSource,
    wasLanguageSelected,
    setLanguage,
    availableLanguages,
  };
};

export default useLanguage;