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
 */
import React, { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

const WelcomeScreen = ({ onContinue }) => {
  const { t, language, setLanguage } = useTranslation();
  const [hasConsented, setHasConsented] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleContinue = () => {
    if (!hasConsented) return;
    onContinue();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header with Language Selector */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {t('welcome.title', 'Welcome to the User Study')}
              </h1>
              <p className="text-xs text-gray-600">
                TU Darmstadt | Wirtschaftsinformatik
              </p>
            </div>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setLanguage('en')}
              className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                language === 'en'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              🇬🇧 English
            </button>
            <button
              onClick={() => setLanguage('de')}
              className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                language === 'de'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              🇩🇪 Deutsch
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Hero Section */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-12 text-white">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold mb-3">
                {t('welcome.title', 'Welcome to the User Study')}
              </h2>
              <p className="text-xl text-blue-100 mb-6">
                {t('welcome.subtitle', 'Research on Agentic AI Workflow Design')}
              </p>
              <p className="text-blue-50 leading-relaxed">
                {t('welcome.description', 'Help us understand how people interact and collaborate with different AI systems.')}
              </p>
            </div>
          </div>

          {/* Content Sections */}
          <div className="p-8 space-y-6">
            {/* What You'll Do */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-blue-900 text-lg mb-3">
                    {t('welcome.whatYouWillDo.title', 'What to expect:')}
                  </h3>
                  <ul className="space-y-2 text-blue-800">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 flex-shrink-0 mt-0.5">✓</span>
                      <span>{t('welcome.whatYouWillDo.explore', 'Explore two different AI-powered work environments')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 flex-shrink-0 mt-0.5">✓</span>
                      <span>{t('welcome.whatYouWillDo.create', 'Create workflows or work with an AI Assistant')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 flex-shrink-0 mt-0.5">✓</span>
                      <span>{t('welcome.whatYouWillDo.test', 'Test and iterate on your solutions')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 flex-shrink-0 mt-0.5">✓</span>
                      <span>{t('welcome.whatYouWillDo.complete', 'Share your experiences through brief surveys')}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Study Details */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-xl p-5 border border-green-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-green-900">
                      {t('welcome.duration.label', 'Duration')}
                    </div>
                    <div className="text-sm text-green-700">
                      {t('welcome.duration.value', '45-60 minutes')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-xl p-5 border border-purple-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-purple-900">
                      {t('welcome.privacy.label', 'Privacy')}
                    </div>
                    <div className="text-sm text-purple-700">
                      {t('welcome.privacy.value', 'Anonymous & GDPR-compliant')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Privacy Disclaimer */}
            <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-300">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-lg mb-2">
                    {t('welcome.privacyNotice.title', 'Data Privacy Notice')}
                  </h3>
                  <div className="text-sm text-gray-700 space-y-2">
                    <p>
                      {t('welcome.privacyNotice.intro', 'Your participation in this study is completely voluntary and anonymous. We collect the following data:')}
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>
                        {t('welcome.privacyNotice.data1', 'Demographic information (without personal identifiers)')}
                      </li>
                      <li>
                        {t('welcome.privacyNotice.data2', 'Interaction patterns and usage behavior')}
                      </li>
                      <li>
                        {t('welcome.privacyNotice.data3', 'Workflow designs and feedback')}
                      </li>
                    </ul>
                    <p className="mt-3">
                      {t('welcome.privacyNotice.gdpr', 'All data is processed in accordance with GDPR and used solely for research purposes. You can withdraw from the study at any time without providing reasons.')}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPrivacyModal(true)}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium underline"
                  >
                    {t('welcome.privacyNotice.viewFull', 'View full privacy policy')}
                  </button>
                </div>
              </div>
            </div>

            {/* Consent */}
            <div className="bg-yellow-50 rounded-xl p-6 border-2 border-yellow-300">
              <label className="flex items-start gap-4 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={hasConsented}
                  onChange={(e) => setHasConsented(e.target.checked)}
                  className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="text-gray-900 font-medium block mb-1">
                    {t('welcome.consent.title', 'I consent to participate')}
                  </span>
                  <span className="text-sm text-gray-700">
                    {t('welcome.consent.text', 'I have read and understood the study information and privacy notice. I voluntarily participate in this study and know that I can withdraw at any time without providing reasons.')}
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
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl hover:scale-105'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {t('welcome.continue', 'Continue to Study')}
                {hasConsented && (
                  <span className="ml-2">→</span>
                )}
              </button>
            </div>

            {/* Footer Note */}
            <p className="text-center text-xs text-gray-500 mt-6">
              {t('footer.note', 'The study takes approximately 45-60 minutes. Your progress is automatically saved.')}
            </p>
          </div>
        </div>
      </div>

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {t('welcome.privacyModal.title', 'Privacy Policy')}
              </h3>
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm text-gray-700">
              <p>
                {t('welcome.privacyModal.content', 'Detailed information about data protection can be found in our full privacy policy at: ')}
                <a href={t('welcome.privacy.url')} target="_blank" className="text-blue-600 hover:underline">
                  {t('welcome.privacy.url')}
                </a>
              </p>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {t('welcome.privacyModal.close', 'Close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WelcomeScreen;