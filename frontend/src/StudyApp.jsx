// frontend/src/StudyApp.jsx
/**
 * Main Study Flow Component
 * 
 * Manages the complete study sequence:
 * 1. Welcome → 2. Demographics → 3. Task 1 → 4. Survey 1 
 * → 5. Task 2 → 6. Survey 2 → 7. Completion
 * 
 * Features:
 * - Welcome screen with consent
 * - Automatic counterbalancing (4 groups)
 * - State persistence across page reloads
 * - Progress tracking
 * - Footer with legal links
 */
import React, { useState, useEffect } from 'react';
import { ReactFlowProvider } from 'reactflow';

// Study Components
import WelcomeScreen from './components/study/WelcomeScreen';
import DemographicsQuestionnaire from './components/study/DemographicsQuestionnaire';
import TaskScreen from './components/study/TaskScreen';
import SurveyQuestionnaire from './components/study/SurveyQuestionnaire';
import CompletionScreen from './components/study/CompletionScreen';

// Hooks
import { useSession } from './hooks/useSession';
import { useSessionData } from './hooks/useSessionData';
import { useTracking } from './hooks/useTracking';
import { useTranslation } from './hooks/useTranslation';

//Helpers
import { interpolateComponents } from './utils/translationHelpers';

// Config
import { STUDY_CONFIG } from './config/constants';

const StudyFooter = () => {
  const contactEmail = import.meta.env.VITE_CONTACT_EMAIL;
  const { t } = useTranslation();
  const currentYear = "2025" //new Date.UTC.year
  
  return (
    <footer className="bg-gray-900 text-gray-300 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left: Copyright */}
          <div className="text-sm text-center md:text-left">
            <p className="font-medium text-white mb-1 text-center">
              © {currentYear}{' '}{t('base.university.chair')}<br></br>
              @ {t('base.university.name')}
            </p>
          </div>

          {/* Center: Contact */}
          <div className="text-sm text-center">
            <p className="text-gray-400">
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
            </p>
          </div>

          {/* Right: Links */}
          <div className="flex items-center gap-6 text-sm">
            <a
              href="/impressum"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition-colors"
            >
              {t('footer.legalNote.label')}
            </a>
            <span className="text-gray-600">•</span>
            <a
              href={t('welcome.privacy.url')}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition-colors"
            >
              {t('welcome.privacyModal.title')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

const StudyApp = () => {
  const { sessionId } = useSession();
  const { 
    studyConfig,
    currentStep,
    initializeStudyConfig,
    completeWelcome,
    completeDemographics,
    completeTask1,
    completeSurvey1,
    completeTask2,
    completeSurvey2,
    completeStudy,
    isStudyInitialized
  } = useSessionData();
  const { trackViewChange, track } = useTracking();

  const [loading, setLoading] = useState(true);

  // Initialize study configuration on mount
  useEffect(() => {
    if (sessionId && !isStudyInitialized) {
      try {
        setLoading(true);
        const config = initializeStudyConfig();
        
        track('STUDY_INITIALIZED', { 
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl text-gray-600">Initialisiere Studie...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!studyConfig) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Konfigurationsfehler
            </h2>
            <p className="text-gray-600 mb-4">
              Die Studienkonfiguration konnte nicht geladen werden. Bitte laden Sie die Seite neu.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
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
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">❓</div>
              <p className="text-xl text-gray-600">Unknown step: {currentStep}</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="study-app min-h-screen flex flex-col">
      {/* Debug info (only in development) */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white text-xs p-3 rounded-lg shadow-lg z-50 font-mono">
          <div className="space-y-1">
            <div><strong>Group:</strong> {studyConfig.group}</div>
            <div><strong>Step:</strong> {currentStep}</div>
            <div><strong>Session:</strong> {sessionId?.slice(0, 8)}...</div>
            <div className="pt-2 mt-2 border-t border-gray-700">
              <a href="/admin" className="text-blue-400 hover:underline">
                → Admin Interface
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1">
        {renderCurrentStep()}
      </div>

      {/* Footer (conditionally shown) */}
      {showFooter && <StudyFooter />}
    </div>
  );
};

export default StudyApp;