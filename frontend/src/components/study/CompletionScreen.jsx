// frontend/src/components/study/CompletionScreen.jsx
/**
 * Study Completion Screen
 * 
 * Thanks participant and provides study summary
 * Matches welcome screen design for consistency
 */

import React, { useEffect } from 'react';
import { PartyPopper } from 'lucide-react';
import { useTracking } from '../../hooks/useTracking';
import { useSession } from '../../hooks/useSession';
import { useTranslation } from '../../hooks/useTranslation';
import StudyFooter from './StudyFooter';

const CompletionScreen = () => {
  const { sessionId, studyConfig } = useSession();
  const { track } = useTracking();
  const { t } = useTranslation();


  useEffect(() => {
    track('study_completed', {
      sessionId,
      group: studyConfig?.group
    });
  }, [sessionId, studyConfig, track]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border border-gray-200 dark:border-gray-700">
          
          {/* Header with Success Icon */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
              <svg className="w-12 h-12 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center justify-center gap-2">
              <PartyPopper className="w-8 h-8 text-green-600 dark:text-green-400 scale-x-[-1]" />
              {t('completion.title')}
              <PartyPopper className="w-8 h-8 text-green-600 dark:text-green-400" />
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {t('completion.subtitle')}
            </p>
          </div>

          {/* Thank You Message */}
          <div className="mb-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-gray-700 dark:text-gray-300 text-center leading-relaxed">
              {t('completion.thankYou')}
            </p>
          </div>

          {/* Study Summary - What was completed */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('completion.summary.title')}
            </h2>
            
            <div className="space-y-3">
              {/* Demographics */}
              <div className="flex items-start p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {t('completion.summary.demographics')}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('completion.summary.demographicsDesc')}
                  </p>
                </div>
              </div>

              {/* Task 1 */}
              <div className="flex items-start p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {t('completion.summary.task1')} - {studyConfig?.task1?.condition === 'workflow_builder' 
                      ? t('completion.summary.workflowBuilder') 
                      : t('completion.summary.aiAssistant')}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('completion.summary.task1Desc')}
                  </p>
                </div>
              </div>

              {/* Survey 1 */}
              <div className="flex items-start p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {t('completion.summary.survey1')}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('completion.summary.survey1Desc')}
                  </p>
                </div>
              </div>

              {/* Task 2 */}
              <div className="flex items-start p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {t('completion.summary.task2')} - {studyConfig?.task2?.condition === 'workflow_builder' 
                      ? t('completion.summary.workflowBuilder') 
                      : t('completion.summary.aiAssistant')}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('completion.summary.task2Desc')}
                  </p>
                </div>
              </div>

              {/* Survey 2 */}
              <div className="flex items-start p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {t('completion.summary.survey2')}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('completion.summary.survey2Desc')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {t('completion.contact.title')}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              {t('completion.contact.message')}
            </p>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <a 
                href={`mailto:${t('completion.contact.email')}`}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t('completion.contact.email')}
              </a>
            </div>
          </div>

          {/* Final Message */}
          <div className="mt-6 text-center text-gray-500 dark:text-gray-400 text-sm">
            {t('completion.footer')}
          </div>
        </div>
      </div>

      {/* Study Footer */}
      <StudyFooter />
    </div>
  );
};

export default CompletionScreen;