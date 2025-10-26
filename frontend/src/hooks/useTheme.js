// frontend/src/hooks/useTheme.js
/**
 * Theme Management Hook
 * 
 * Manages dark mode state with system preference detection
 * and localStorage persistence via Zustand store
 */
import { useEffect, useCallback, useMemo } from 'react';
import { useSessionStore } from '../store/sessionStore';

export const useTheme = () => {
  const theme = useSessionStore(state => state.theme);
  const setTheme = useSessionStore(state => state.setTheme);

  // Get system preference (memoized)
  const systemPreference = useMemo(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  // Update HTML class when theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      const newPreference = e.matches ? 'dark' : 'light';
      
      // If user is following system preference, update theme
      if (!theme || theme === 'system') {
        setTheme(newPreference);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [setTheme]);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // Follow system preference
  const followSystemPreference = useCallback(() => {
    const newPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    setTheme(newPreference);
  }, [setTheme]);

  return {
    theme,
    setTheme,
    toggleTheme,
    followSystemPreference,
    systemPreference,
    isDark: theme === 'dark'
  };
};