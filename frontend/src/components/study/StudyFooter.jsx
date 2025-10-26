// frontend/src/components/common/AppFooter.jsx
/**
 * Unified Application Footer
 * 
 * Minimal, single-line footer used throughout the entire app.
 * Contains all information from StudyApp footer but in a compact format.
 * 
 * Features:
 * - Copyright with university info
 * - Contact email
 * - Legal links (Impressum & Privacy)
 * - Multi-language support
 * - Compact single-line design
 */

import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { interpolateComponents } from '../../utils/translationHelpers';

const StudyFooter = () => {
  const { t, currentLanguage } = useTranslation();
  const contactEmail = import.meta.env.VITE_CONTACT_EMAIL;
  const currentYear = new Date().getFullYear();

  // Get URLs based on language
  const privacyUrl = t('welcome.privacy.url');
  const legalUrl = t('footer.legalNote.url');

  return (
    <footer className="w-full bg-gray-800 dark:bg-gray-950 text-gray-300 dark:text-gray-400 py-4 flex-shrink-0 border-t border-gray-700 dark:border-gray-800">
  <div className="w-full px-6">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-center sm:text-left items-center">
      
      {/* LEFT: Copyright */}
      <div className="flex items-center justify-center sm:justify-start">
        <span className="text-gray-400 dark:text-gray-500">
          © {currentYear} {t('base.university.chair')} @ {t('base.university.name')}
        </span>
      </div>

      {/* CENTER: Contact Email */}
      {contactEmail && (
        <div className="flex items-center justify-center">
          {interpolateComponents(
            t('footer.contact'),
            {
              EMAIL: (
                <a 
                  href={`mailto:${contactEmail}`}
                  className="text-blue-400 dark:text-blue-400 hover:text-blue-300 dark:hover:text-blue-300 underline"
                >
                  {contactEmail}
                </a>
              )
            }
          )}
        </div>
      )}

      {/* RIGHT: Legal Links */}
      <div className="flex items-center justify-center sm:justify-end gap-3">
        <a
          href={legalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-300 dark:text-gray-400 hover:text-white dark:hover:text-gray-200 transition-colors whitespace-nowrap"
        >
          {t('footer.legalNote.label')}
        </a>
        
        <span className="text-gray-600 dark:text-gray-700">|</span>
        <a
        
          href={privacyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-300 dark:text-gray-400 hover:text-white dark:hover:text-gray-200 transition-colors whitespace-nowrap"
        >
          {t('welcome.privacyModal.title')}
        </a>
      </div>
    </div>
  </div>
</footer>
  );
};

export default StudyFooter;