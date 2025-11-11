// frontend/src/StudyApp.jsx
/**
 * Main Study Flow Component
 * 
 * Manages the complete study sequence:
 * 1. Welcome → 2. Demographics → 3. Task 1 → 4. Survey 1 
 * → 5. Task 2 → 6. Survey 2 → 7. Completion
 * 
 */
import React, { useState, useEffect } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { HelpCircle } from 'lucide-react';

// Study Components
import WelcomeScreen from './components/study/WelcomeScreen';
import DemographicsQuestionnaire from './components/study/DemographicsQuestionnaire';
import ScenarioBriefScreen from './components/study/ScenarioBriefScreen';
import TaskScreen from './components/study/TaskScreen';
import SurveyQuestionnaire from './components/study/SurveyQuestionnaire';
import CompletionScreen from './components/study/CompletionScreen';
import StudyFooter from './components/study/StudyFooter';
import LanguageSwitcher from './components/LanguageSwitcher';
import ThemeSwitcher from './components/ThemeSwitcher';

// Hooks
import { useSession } from './hooks/useSession';
import { useSessionData } from './hooks/useSessionData';
import { useTracking } from './hooks/useTracking';
import { useTranslation } from './hooks/useTranslation';
import { useTheme } from './hooks/useTheme';

//Helpers
import { interpolateComponents } from './utils/translationHelpers';

// Config
import { STUDY_CONFIG } from './config/constants';

const StudyApp = () => {
  const { sessionId } = useSession();
  const { 
    studyConfig,
    currentStep,
    initializeStudyConfig,
    completeWelcome,
    completeDemographics,
    completeScenarioBrief,
    completeTask1,
    completeSurvey1,
    completeTask2,
    completeSurvey2,
    completeStudy,
    isStudyInitialized
  } = useSessionData();
  const { trackViewChange, track } = useTracking();
  const { t } = useTranslation();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);

  // Initialize study configuration on mount
  useEffect(() => {
    if (sessionId && !isStudyInitialized) {
      try {
        setLoading(true);
        const config = initializeStudyConfig();
        
        track('study_initialized', { 
          group: config.group,
          participantNumber: config.participantNumber 
        });
      } catch (error) {
        console.error('Failed to initialize study config:', error);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [sessionId, isStudyInitialized, initializeStudyConfig, track]);

  /**
   * Handle welcome screen completion
   */
  const handleWelcomeComplete = () => {
    completeWelcome();
    trackViewChange('demographics');
  };

  /**
   * Handle demographics completion
   */
  const handleDemographicsComplete = (data) => {
    completeDemographics(data);
    trackViewChange('task_1');
  };
  /**
   * Handle scenario brief completion
   */
  const handleScenarioBriefComplete = () => {
    track('SCENARIO_BRIEF_COMPLETED');
    completeScenarioBrief(); // New function in useSessionData
  };

  /**
   * Handle task 1 completion
   */
  const handleTask1Complete = () => {
    completeTask1();
    trackViewChange('survey_1');
  };

  /**
   * Handle survey 1 completion
   */
  const handleSurvey1Complete = (surveyData) => {
    completeSurvey1(surveyData);
    trackViewChange('task_2');
  };

  /**
   * Handle task 2 completion
   */
  const handleTask2Complete = () => {
    completeTask2();
    trackViewChange('survey_2');
  };

  /**
   * Handle survey 2 completion
   */
  const handleSurvey2Complete = (surveyData) => {
    completeSurvey2(surveyData);
    completeStudy();
    trackViewChange('completion');
  };

  // Determine if footer should be shown (not on full-screen task views)
  const showFooter = ![STUDY_CONFIG.STEPS.TASK_1, STUDY_CONFIG.STEPS.TASK_2].includes(currentStep);

  useEffect(() => {
    if (sessionId && isStudyInitialized && studyConfig) {
      setLoading(false);
    }
  }, [sessionId, isStudyInitialized, studyConfig]);

  // Loading state
  if (loading || !sessionId || !studyConfig) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl text-gray-600 dark:text-gray-400">{t('base.studyConfig.init', 'Initialisiere Studie...')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!studyConfig) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {t('base.studyConfig.error.label', 'Konfigurationsfehler')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('base.studyConfig.error.label', 'Die Studienkonfiguration konnte nicht geladen werden. Bitte laden Sie die Seite neu.')}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              {t('base.studyConfig.error.label', 'Seite neu laden')}
              Seite neu laden
            </button>
          </div>
        </div>
        <StudyFooter />
      </div>
    );
  }

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case STUDY_CONFIG.STEPS.WELCOME:
        return (
          <WelcomeScreen 
            onContinue={handleWelcomeComplete}
          />
        );

      case STUDY_CONFIG.STEPS.DEMOGRAPHICS:
        return (
          <DemographicsQuestionnaire 
            onComplete={handleDemographicsComplete}
          />
        );

      case STUDY_CONFIG.STEPS.SCENARIO_BRIEF:
        return (
          <ScenarioBriefScreen 
            onContinue={handleScenarioBriefComplete}
          />
        );

      case STUDY_CONFIG.STEPS.TASK_1:
        return (
          <ReactFlowProvider>
            <TaskScreen
              taskConfig={studyConfig.task1}
              taskNumber={1}
              onComplete={handleTask1Complete}
            />
          </ReactFlowProvider>
        );

      case STUDY_CONFIG.STEPS.SURVEY_1:
        return (
          <SurveyQuestionnaire
            taskNumber={1}
            condition={studyConfig.task1.condition}
            onComplete={handleSurvey1Complete}
          />
        );

      case STUDY_CONFIG.STEPS.TASK_2:
        return (
          <ReactFlowProvider>
            <TaskScreen
              taskConfig={studyConfig.task2}
              taskNumber={2}
              onComplete={handleTask2Complete}
            />
          </ReactFlowProvider>
        );

      case STUDY_CONFIG.STEPS.SURVEY_2:
        return (
          <SurveyQuestionnaire
            taskNumber={2}
            condition={studyConfig.task2.condition}
            onComplete={handleSurvey2Complete}
          />
        );

      case STUDY_CONFIG.STEPS.COMPLETION:
        return (
          <CompletionScreen
            studyConfig={studyConfig}
          />
        );

      default:
        return (
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <div className="text-center">
              <HelpCircle className="w-24 h-24 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-xl text-gray-600 dark:text-gray-400">Unknown step: {currentStep}</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div data-tour="study-app-container" className="study-app flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header/Navigation */}
      <header className="flex-shrink-0">
        {/* Your header content */}
      </header>

      {/* Fixed Controls Bar - Language and Theme Switchers */}
      {/* Only show on non-task screens */}
      {showFooter && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
          <LanguageSwitcher 
            variant="compact" 
            showLabels={false}
            className="bg-white dark:bg-gray-800 shadow-lg"
          />
          <ThemeSwitcher 
            variant="icon-only"
            className="bg-white dark:bg-gray-800 shadow-lg"
          />
        </div>
      )}

      {/* Main Content - flex-1 ensures it takes remaining space */}
      <div className="flex-1 flex flex-col">
        {renderCurrentStep()}
      </div>

      {/* Footer - sticks to bottom */}
      <footer className="mt-auto">
        {/* Footer (conditionally shown) */}
        {showFooter && <StudyFooter />}
      </footer>
    </div>
  );
};

export default StudyApp;