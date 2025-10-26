// frontend/src/components/study/WelcomeScreen.jsx
/**
 * Professional Welcome Screen for Study
 * 
 * Features:
 * - Data privacy disclaimer
 * - Language selection (using actual useTranslation hook)
 * - Study information
 * - Consent checkbox
 * - Professional design
 * - Dark mode support
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { useLanguage } from '../../hooks/useLanguage';

const WelcomeScreen = ({ onContinue }) => {
  const { t, setLanguage } = useTranslation();
  const { currentLanguage, wasLanguageSelected } = useLanguage();
  const [hasConsented, setHasConsented] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const contactEmail = import.meta.env.VITE_CONTACT_EMAIL;
  const contactName = import.meta.env.VITE_CONTACT_NAME;

  // Check if language was already selected
  useEffect(() => {
    if (!wasLanguageSelected) {
      setShowLanguageModal(true);
    }
  }, []);
  
  const handleLanguageSelect = (language) => {
    setLanguage(language, true);
    setShowLanguageModal(false);
  };

  const handleContinue = () => {
    if (!hasConsented) return;
    onContinue();
  };

  return (
    <div className="h-full bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-blue-950">
      {/* Language Selection Modal */}
      {showLanguageModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-4xl w-full shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-4">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">
                Select Your Language
              </h2>
              <p className="text-blue-100">
                Choose your preferred language to continue
              </p>
            </div>

            {/* Language Selection - Split Layout */}
            <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
              {/* English Option */}
              <button
                onClick={() => handleLanguageSelect('en')}
                className="group p-10 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300 text-left"
              >
                <div className="flex flex-col items-center text-center space-y-6">
                  {/* English Flag (US/UK Split) */}
                  <div className="relative w-32 h-24 rounded-lg overflow-hidden shadow-lg ring-2 ring-gray-200 dark:ring-gray-700 group-hover:ring-4 group-hover:ring-blue-500 transition-all duration-300 transform group-hover:scale-110">
                    <svg viewBox="0 0 60 30" className="w-full h-full">
                      {/* UK Flag (Top Left Triangle) */}
                      <defs>
                        <clipPath id="ukClip">
                          <polygon points="0,0 60,0 0,30" />
                        </clipPath>
                      </defs>
                      <g clipPath="url(#ukClip)">
                        {/* Blue background */}
                        <rect width="60" height="30" fill="#012169"/>
                        {/* White diagonals */}
                        <path d="M0,0 L60,30 M60,0 L0,30" stroke="white" strokeWidth="6"/>
                        {/* Red diagonals */}
                        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4"/>
                        {/* White cross */}
                        <path d="M30,0 L30,30 M0,15 L60,15" stroke="white" strokeWidth="10"/>
                        {/* Red cross */}
                        <path d="M30,0 L30,30 M0,15 L60,15" stroke="#C8102E" strokeWidth="6"/>
                      </g>
                      
                      {/* US Flag (Bottom Right Triangle) */}
                      <defs>
                        <clipPath id="usClip">
                          <polygon points="60,0 60,30 0,30" />
                        </clipPath>
                      </defs>
                      <g clipPath="url(#usClip)">
                        {/* Stripes */}
                        <rect width="60" height="2.31" y="0" fill="#B22234"/>
                        <rect width="60" height="2.31" y="2.31" fill="white"/>
                        <rect width="60" height="2.31" y="4.62" fill="#B22234"/>
                        <rect width="60" height="2.31" y="6.93" fill="white"/>
                        <rect width="60" height="2.31" y="9.24" fill="#B22234"/>
                        <rect width="60" height="2.31" y="11.55" fill="white"/>
                        <rect width="60" height="2.31" y="13.86" fill="#B22234"/>
                        <rect width="60" height="2.31" y="16.17" fill="white"/>
                        <rect width="60" height="2.31" y="18.48" fill="#B22234"/>
                        <rect width="60" height="2.31" y="20.79" fill="white"/>
                        <rect width="60" height="2.31" y="23.1" fill="#B22234"/>
                        <rect width="60" height="2.31" y="25.41" fill="white"/>
                        <rect width="60" height="2.31" y="27.72" fill="#B22234"/>
                        {/* Blue canton */}
                        <rect width="24" height="12.6" fill="#3C3B6E"/>
                      </g>
                      
                      {/* Diagonal split line */}
                      <line x1="0" y1="30" x2="60" y2="0" stroke="#1f2937" strokeWidth="0.5" className="dark:stroke-gray-600"/>
                    </svg>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      English
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Continue in English
                    </p>
                  </div>

                  <div className="pt-4">
                    <div className="px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg group-hover:shadow-xl group-hover:from-blue-700 group-hover:to-indigo-700 transition-all duration-300 transform group-hover:scale-105">
                      Select English →
                    </div>
                  </div>
                </div>
              </button>

              {/* German Option */}
              <button
                onClick={() => handleLanguageSelect('de')}
                className="group p-10 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300 text-left"
              >
                <div className="flex flex-col items-center text-center space-y-6">
                  {/* German Flag */}
                  <div className="relative w-32 h-24 rounded-lg overflow-hidden shadow-lg ring-2 ring-gray-200 dark:ring-gray-700 group-hover:ring-4 group-hover:ring-blue-500 transition-all duration-300 transform group-hover:scale-110">
                    <svg viewBox="0 0 5 3" className="w-full h-full">
                      <rect width="5" height="1" y="0" fill="#000000"/>
                      <rect width="5" height="1" y="1" fill="#DD0000"/>
                      <rect width="5" height="1" y="2" fill="#FFCE00"/>
                    </svg>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Deutsch
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Auf Deutsch fortfahren
                    </p>
                  </div>

                  <div className="pt-4">
                    <div className="px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg group-hover:shadow-xl group-hover:from-blue-700 group-hover:to-indigo-700 transition-all duration-300 transform group-hover:scale-105">
                      Deutsch wählen →
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Footer Note */}
            <div className="bg-gray-50 dark:bg-gray-900/50 px-8 py-4 text-center border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Your language preference will be saved for this study session.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                During the study you can change the language using the element in the top right.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 dark:bg-blue-500 rounded-2xl mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('welcome.title')}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {t('base.university.chair')} @ {t('base.university.name')}
          </p>
        </div>

        <div className="space-y-6">
          {/* Study Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t('welcome.studyInfo.title')}
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p className="text-gray-800 dark:text-gray-200">{t('welcome.studyInfo.description')}</p>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  {t('welcome.studyInfo.whatYouWillDo.title')}
                </h3>
                <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                  <li className="flex items-start">
                    <span className="text-blue-600 dark:text-blue-400 mr-2">✓</span>
                    <span>{t('welcome.studyInfo.whatYouWillDo.step1')}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 dark:text-blue-400 mr-2">✓</span>
                    <span>{t('welcome.studyInfo.whatYouWillDo.step2')}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 dark:text-blue-400 mr-2">✓</span>
                    <span>{t('welcome.studyInfo.whatYouWillDo.step3')}</span>
                  </li>
                </ul>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span><strong>{t('welcome.studyInfo.duration.label')}:</strong> {t('welcome.studyInfo.duration.time')}</span>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {t('welcome.studyInfo.contactInfo.title')}
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>{t('welcome.studyInfo.contactInfo.description')}</p>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2 border border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('base.university.name')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('base.university.chair')}
                </p>
                <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-600">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{contactName}</p>
                  <a 
                    href={`mailto:${contactEmail}`}
                    className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                    <span className="underline">{contactEmail}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {t('welcome.privacyNotice.title')}
            </h2>
            
            <div className="space-y-5 text-gray-700 dark:text-gray-300">
              {/* Main Privacy Text */}
              <div className="text-base leading-relaxed space-y-4">
                <p className="text-gray-800 dark:text-gray-200">
                  {t('welcome.privacyNotice.mainText')}
                </p>
                <p className="text-gray-800 dark:text-gray-200">
                  {t('welcome.privacyNotice.researchPurpose')}
                </p>
              </div>

              {/* Key Points Summary */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-5 border-2 border-green-200 dark:border-green-800 shadow-sm">
                <h3 className="font-bold text-green-900 dark:text-green-300 mb-4 text-base">
                  {t('welcome.privacyNotice.keyPoints.title')}
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm leading-relaxed text-green-900 dark:text-green-100 font-medium">
                      {t('welcome.privacyNotice.keyPoints.anonymous')}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm leading-relaxed text-green-900 dark:text-green-100 font-medium">
                      {t('welcome.privacyNotice.keyPoints.gdprCompliant')}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm leading-relaxed text-green-900 dark:text-green-100 font-medium">
                      {t('welcome.privacyNotice.keyPoints.voluntary')}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm leading-relaxed text-green-900 dark:text-green-100 font-medium">
                      {t('welcome.privacyNotice.keyPoints.retention')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Detailed Information Link */}
              <div className="pt-2">
                <button
                  onClick={() => setShowPrivacyModal(true)}
                  className="text-base text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold inline-flex items-center gap-2 transition-colors group"
                >
                  <span className="underline">{t('welcome.privacyNotice.viewFullPolicy')}</span>
                  <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Consent */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-6 border-2 border-yellow-300 dark:border-yellow-700">
            <label className="flex items-start gap-4 cursor-pointer group">
              <input
                type="checkbox"
                checked={hasConsented}
                onChange={(e) => setHasConsented(e.target.checked)}
                className="mt-1 w-5 h-5 text-blue-600 dark:text-blue-500 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
              />
              <div className="flex-1">
                <span className="text-gray-900 dark:text-gray-100 font-medium block mb-1">
                  {t('welcome.consent.title')}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('welcome.consent.text')}
                </span>
              </div>
            </label>
          </div>

          {/* Continue Button */}
          <div className="flex justify-center pt-4">
            <button
              onClick={handleContinue}
              disabled={!hasConsented}
              className={`px-8 py-4 rounded-xl font-bold text-lg transition-all transform ${
                hasConsented
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 shadow-lg hover:shadow-xl hover:scale-105'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              {t('welcome.continue')}
              {hasConsented && (
                <span className="ml-2">→</span>
              )}
            </button>
          </div>

          {/* Footer Note */}
          <p className="text-center text-xs text-gray-500 dark:text-gray-500 mt-6">
            {t('welcome.studyInfo.duration.note')}
          </p>
        </div>
      </div>

      {/* Privacy Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {t('welcome.privacyModal.title')}
              </h2>
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="overflow-y-auto px-8 py-6 max-h-[calc(85vh-140px)]">
              <div className="prose dark:prose-invert max-w-none text-sm space-y-6">
                {/* Main Section */}
                <div>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {t('welcome.privacyModal.content.mainText')}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">
                    {t('welcome.privacyModal.content.researchPurpose')}
                  </p>
                </div>

                {/* Additional Information Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    {t('welcome.privacyModal.sections.additionalInfo.title')}
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                        {t('welcome.privacyModal.sections.retention.title')}
                      </h4>
                      <p className="text-gray-700 dark:text-gray-300">
                        {t('welcome.privacyModal.sections.retention.content')}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                        {t('welcome.privacyModal.sections.categories.title')}
                      </h4>
                      <p className="text-gray-700 dark:text-gray-300">
                        {t('welcome.privacyModal.sections.categories.content')}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                        {t('welcome.privacyModal.sections.legalBasis.title')}
                      </h4>
                      <p className="text-gray-700 dark:text-gray-300">
                        {t('welcome.privacyModal.sections.legalBasis.content')}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                        {t('welcome.privacyModal.sections.recipients.title')}
                      </h4>
                      <p className="text-gray-700 dark:text-gray-300">
                        {t('welcome.privacyModal.sections.recipients.content')}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                        {t('welcome.privacyModal.sections.dataTransfer.title')}
                      </h4>
                      <p className="text-gray-700 dark:text-gray-300">
                        {t('welcome.privacyModal.sections.dataTransfer.content')}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                        {t('welcome.privacyModal.sections.confidentiality.title')}
                      </h4>
                      <p className="text-gray-700 dark:text-gray-300">
                        {t('welcome.privacyModal.sections.confidentiality.content')}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                        {t('welcome.privacyModal.sections.rights.title')}
                      </h4>
                      <p className="text-gray-700 dark:text-gray-300">
                        {t('welcome.privacyModal.sections.rights.content')}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                        {t('welcome.privacyModal.sections.withdrawal.title')}
                      </h4>
                      <p className="text-gray-700 dark:text-gray-300">
                        {t('welcome.privacyModal.sections.withdrawal.content')}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                        {t('welcome.privacyModal.sections.authority.title')}
                      </h4>
                      <p className="text-gray-700 dark:text-gray-300">
                        {t('welcome.privacyModal.sections.authority.content')}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                        {t('welcome.privacyModal.sections.dpo.title')}
                      </h4>
                      <p className="text-gray-700 dark:text-gray-300">
                        {t('welcome.privacyModal.sections.dpo.content')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* TU Darmstadt Link */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('welcome.privacyModal.tuLink.label')}:{' '}
                    <a 
                      href={t('welcome.privacy.url')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
                    >
                      {t('welcome.privacyModal.tuLink.text')}
                    </a>
                  </p>
                </div>
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-8 py-4 flex justify-end">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="px-6 py-2 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
              >
                {t('common.navigation.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WelcomeScreen;