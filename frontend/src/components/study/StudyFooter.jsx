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
    <footer className="bg-gray-800 text-gray-300 py-3 px-6 text-xs flex-shrink-0">
      <div className="max-w-7xl mx-auto">
        {/* Single line layout with all information */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          
          {/* LEFT: Copyright */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400">
              © {currentYear} {t('base.university.chair')} @ {t('base.university.name')}
            </span>
          </div>

          {/* CENTER: Contact Email */}
          {contactEmail && (
            <div className="flex items-center gap-2">
                {interpolateComponents(
                    t('footer.contact'),
                    {
                        EMAIL: (
                            <a 
                            href={`mailto:${contactEmail}`}
                            className="text-blue-400 hover:text-blue-300 underline"
                            >
                            {contactEmail}
                            </a>
                        )
                    }
                )}
            </div>
          )}

          {/* RIGHT: Legal Links */}
          <div className="flex items-center gap-3">
            <a
              href={legalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition-colors"
              title="Legal information"
            >
              {t('footer.legalNote.label')}
            </a>
            
            <span className="text-gray-600">|</span>
            
            <a
              href={privacyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition-colors"
              title="Data privacy policy"
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