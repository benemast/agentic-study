// frontend/src/components/study/CompletionScreen.jsx
/**
 * Study Completion Screen
 * 
 * Thanks participant and provides study completion code
 * With dark mode support
 */
import React, { useState, useEffect } from 'react';
import { useSession } from '../../hooks/useSession';
import { useTracking } from '../../hooks/useTracking';
import { useTranslation } from '../../hooks/useTranslation';

const CompletionScreen = ({ studyConfig }) => {
  const { sessionId } = useSession();
  const { track } = useTracking();
  const { t } = useTranslation();
  const [completionCode, setCompletionCode] = useState('');

  useEffect(() => {
    // Generate completion code
    const code = generateCompletionCode(sessionId);
    setCompletionCode(code);
    
    track('STUDY_COMPLETED', {
      group: studyConfig?.group,
      completionCode: code
    });
  }, [sessionId, studyConfig, track]);

  const generateCompletionCode = (sessionId) => {
    // Generate a unique completion code based on session ID
    const hash = sessionId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    return `STUDY-${Math.abs(hash).toString(36).toUpperCase().slice(0, 8)}`;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(completionCode);
    track('COMPLETION_CODE_COPIED', { code: completionCode });
  };

  return (
    <div className="h-full bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-blue-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
        {/* Success Icon */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
            <svg className="w-12 h-12 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('completion.title')} 🎉
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {t('completion.thankYou')}
          </p>
        </div>
        
        {/* Study Summary */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-6 border border-blue-200 dark:border-blue-800">
          <h2 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">
            {t('completion.summary.title')}:
          </h2>
          <ul className="space-y-2 text-blue-800 dark:text-blue-200">
            <li className="flex items-start">
              <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
              <span>{t('completion.summary.demographics')}</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
              <span>
                {t('completion.summary.task1')} {studyConfig?.task1?.condition === 'workflow_builder' ? t('completion.summary.workflowBuilder') : t('completion.summary.aiAssistant')}
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
              <span>{t('completion.summary.survey1')}</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
              <span>
                {t('completion.summary.task2')} {studyConfig?.task2?.condition === 'workflow_builder' ? t('completion.summary.workflowBuilder') : t('completion.summary.aiAssistant')}
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
              <span>{t('completion.summary.survey2')}</span>
            </li>
          </ul>
        </div>

        {/* Completion Code */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-lg p-6 text-white mb-6">
          <h2 className="font-semibold mb-2">{t('completion.code.title')}:</h2>
          <div className="flex items-center justify-between bg-white/20 dark:bg-black/20 rounded p-3">
            <code className="text-2xl font-mono font-bold">{completionCode}</code>
            <button
              onClick={handleCopyCode}
              className="ml-4 px-4 py-2 bg-white/30 dark:bg-white/20 hover:bg-white/40 dark:hover:bg-white/30 rounded transition-colors"
              title={t('completion.code.copy')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-white/80 dark:text-white/70 mt-2">
            {t('completion.code.instruction')}
          </p>
        </div>

        {/* Next Steps */}
        <div className="text-center text-gray-600 dark:text-gray-400 space-y-2">
          <p className="font-medium">{t('completion.nextSteps.title')}</p>
          <p className="text-sm">{t('completion.nextSteps.instruction')}</p>
        </div>

        {/* Thank You Message */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            {t('completion.feedback.title')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {t('base.university.chair')} @ {t('base.university.name')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompletionScreen;