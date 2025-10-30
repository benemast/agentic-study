// frontend/src/components/LanguageSwitcher.jsx
import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { availableLanguages } from '../config/locales';

const LanguageSwitcher = ({ 
  variant = 'default',  // 'default', 'compact', 'dropdown'
  className = '',
  showLabels = true
}) => {
  const { currentLanguage, setLanguage } = useTranslation();

  if (variant === 'compact') {
    return (
      <div className={`flex bg-gray-100 rounded-lg p-1 space-x-1 ${className}`}>
        {availableLanguages.map(lang => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code, true)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              currentLanguage === lang.code 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {showLabels ? lang.nativeName : lang.code.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <select
          value={currentLanguage}
          onChange={(e) => setLanguage(e.target.value, true)}
          className="appearance-none bg-white border border-gray-300 rounded px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {availableLanguages.map(lang => (
            <option key={lang.code} value={lang.code}>
              {showLabels ? lang.nativeName : lang.name}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    );
  }

  // Default variant - button group
  return (
    <div className={`flex space-x-2 ${className}`}>
      {availableLanguages.map(lang => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code, true)}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            currentLanguage === lang.code
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {showLabels ? lang.nativeName : lang.code.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;