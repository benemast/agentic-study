// frontend/src/components/study/ScenarioBriefScreen.jsx
import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { useTracking } from '../../hooks/useTracking';
import { useSessionData} from '../../hooks/useSessionData'

const ScenarioBriefScreen = ({ onContinue }) => {
  const { t } = useTranslation();
  const { track } = useTracking();
  const { completeScenarioBrief} = useSessionData();

  const handleContinue = () => {
    track('SCENARIO_BRIEF_COMPLETED');
    onContinue();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">👋</div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('briefing.title')}
          </h1>
        </div>

        {/* Main Content */}
        <div className="space-y-6 text-gray-700 dark:text-gray-300">
          
          <p className="text-lg leading-relaxed">
            {t('briefing.mainContent.intro.first')}
            <strong>{t('briefing.mainContent.intro.strong')}</strong>
            {t('briefing.mainContent.intro.final')}
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border-l-4 border-blue-500">
            <p className="leading-relaxed">
              {t('briefing.mainContent.toolBox.first')}
              <strong>{t('briefing.mainContent.toolBox.strong')}</strong>
              {t('briefing.mainContent.toolBox.final')}
            </p>
            <ul className="mt-4 space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">🧩</span>
                <span><strong>{t('briefing.mainContent.toolBox.workflow.strong')}</strong>{t('briefing.mainContent.toolBox.workflow.text')}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">💬</span>
                <span><strong>{t('briefing.mainContent.toolBox.assistant.strong')}</strong>{t('briefing.mainContent.toolBox.assistant.text')}</span>
              </li>
            </ul>
          </div>

          <p className="leading-relaxed">
              {t('briefing.mainContent.mission.first')}
              <strong>{t('briefing.mainContent.mission.strong')}</strong>
              {t('briefing.mainContent.mission.final')}
          </p>

          <p className="leading-relaxed">
              {t('briefing.mainContent.counterBalance')}
          </p>

          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-6">
            <p className="leading-relaxed">
              {t('briefing.mainContent.colaboration.first')}
              <strong>{t('briefing.mainContent.colaboration.strong')}</strong>
              {t('briefing.mainContent.colaboration.final')}
            </p>
            <p className="mt-3 leading-relaxed">
              {t('briefing.mainContent.colaboration.feedback')}
            </p>
          </div>

          <p className="leading-relaxed">
              {t('briefing.mainContent.tutorial.first')}
              <strong>{t('briefing.mainContent.tutorial.strong')}</strong>
              {t('briefing.mainContent.tutorial.final')}
          </p>

          <p className="text-lg leading-relaxed text-center mt-8">
              {t('briefing.close')}<span className="text-2xl">🌟</span>
          </p>

        </div>

        {/* Continue Button */}
        <div className="flex justify-center mt-10">
          <button
            onClick={handleContinue}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 
                     text-white rounded-xl font-bold text-lg transition-all transform hover:scale-105 
                     shadow-lg hover:shadow-xl"
          >
            {t('briefing.ready')} →
          </button>
        </div>

      </div>
    </div>
  );
};

export default ScenarioBriefScreen;