// frontend/src/components/study/SurveyQuestionnaire.jsx
/**
 * Post-Task Survey Component
 * 
 * Measures:
 * - Perceived agency and control
 * - User understanding and trust
 * - Cognitive effort (NASA-TLX)
 * - User experience
 * 
 * Features:
 * - Multi-section survey with progress tracking
 * - Likert scales and NASA-TLX sliders
 * - Dark mode support
 * - Language switcher
 * - Open-ended feedback
 */
import React, { useState } from 'react';
import { useTracking } from '../../hooks/useTracking';
import { useTranslation } from '../../hooks/useTranslation';

// ============================================================
// QUESTION DEFINITIONS
// ============================================================
const AGENCY_QUESTIONS = [
  {
    id: 'control',
    questionKey: 'survey.agency.control',
    category: 'agency'
  },
  {
    id: 'autonomy',
    questionKey: 'survey.agency.autonomy',
    category: 'agency'
  },
  {
    id: 'influence',
    questionKey: 'survey.agency.influence',
    category: 'agency'
  },
  {
    id: 'decision_making',
    questionKey: 'survey.agency.decisionMaking',
    category: 'agency'
  }
];

const UNDERSTANDING_QUESTIONS = [
  {
    id: 'process_clarity',
    questionKey: 'survey.understanding.processClarity',
    category: 'understanding'
  },
  {
    id: 'steps_clear',
    questionKey: 'survey.understanding.stepsClear',
    category: 'understanding'
  },
  {
    id: 'predictability',
    questionKey: 'survey.understanding.predictability',
    category: 'understanding'
  }
];

const TRUST_QUESTIONS = [
  {
    id: 'trust_results',
    questionKey: 'survey.trust.results',
    category: 'trust'
  },
  {
    id: 'trust_process',
    questionKey: 'survey.trust.process',
    category: 'trust'
  },
  {
    id: 'confidence',
    questionKey: 'survey.trust.confidence',
    category: 'trust'
  }
];

const NASA_TLX_QUESTIONS = [
  {
    id: 'mental_demand',
    questionKey: 'survey.nasaTlx.mentalDemand',
    category: 'cognitive_load',
    lowKey: 'survey.nasaTlx.veryLow',
    highKey: 'survey.nasaTlx.veryHigh'
  },
  {
    id: 'temporal_demand',
    questionKey: 'survey.nasaTlx.temporalDemand',
    category: 'cognitive_load',
    lowKey: 'survey.nasaTlx.veryLow',
    highKey: 'survey.nasaTlx.veryHigh'
  },
  {
    id: 'effort',
    questionKey: 'survey.nasaTlx.effort',
    category: 'cognitive_load',
    lowKey: 'survey.nasaTlx.veryLow',
    highKey: 'survey.nasaTlx.veryHigh'
  },
  {
    id: 'frustration',
    questionKey: 'survey.nasaTlx.frustration',
    category: 'cognitive_load',
    lowKey: 'survey.nasaTlx.veryLow',
    highKey: 'survey.nasaTlx.veryHigh'
  }
];

const EXPERIENCE_QUESTIONS = [
  {
    id: 'ease_of_use',
    questionKey: 'survey.experience.easeOfUse',
    category: 'experience'
  },
  {
    id: 'efficiency',
    questionKey: 'survey.experience.efficiency',
    category: 'experience'
  },
  {
    id: 'satisfaction',
    questionKey: 'survey.experience.satisfaction',
    category: 'experience'
  }
];

// ============================================================
// LIKERT SCALE COMPONENT
// ============================================================
const LikertScale = ({ value, onChange, questionId }) => {
  const { t } = useTranslation();
  
  const options = [
    { value: 1, labelKey: 'survey.likert.stronglyDisagree' },
    { value: 2, labelKey: 'survey.likert.disagree' },
    { value: 3, labelKey: 'survey.likert.neutral' },
    { value: 4, labelKey: 'survey.likert.agree' },
    { value: 5, labelKey: 'survey.likert.stronglyAgree' }
  ];

  return (
    <div className="flex gap-2 justify-between">
      {options.map((option) => (
        <label
          key={option.value}
          className="flex-1 cursor-pointer"
        >
          <input
            type="radio"
            name={questionId}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          <div
            className={`
              p-3 rounded-lg border-2 text-center transition-all
              ${value === option.value
                ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-300' 
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800'
              }
            `}
          >
            <div className="text-2xl mb-1 font-bold">{option.value}</div>
            <div className="text-xs font-medium">{t(option.labelKey)}</div>
          </div>
        </label>
      ))}
    </div>
  );
};

// ============================================================
// NASA-TLX SCALE COMPONENT
// ============================================================
const NASAScale = ({ value, onChange, questionId, lowKey, highKey }) => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-2">
      <input
        type="range"
        min="1"
        max="21"
        value={value || 11}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
      />
      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
        <span>{t(lowKey)}</span>
        <span className="font-semibold text-gray-900 dark:text-gray-100">{value || 11}/21</span>
        <span>{t(highKey)}</span>
      </div>
    </div>
  );
};

// ============================================================
// MAIN SURVEY COMPONENT
// ============================================================
const SurveyQuestionnaire = ({ taskNumber, condition, onComplete }) => {
  const { track } = useTracking();
  const { t } = useTranslation();
  const [responses, setResponses] = useState({});
  const [openEnded, setOpenEnded] = useState({
    positive: '',
    negative: '',
    improvements: ''
  });
  const [currentSection, setCurrentSection] = useState(0);

  const sections = [
    { titleKey: 'survey.sections.agency', questions: AGENCY_QUESTIONS },
    { titleKey: 'survey.sections.understanding', questions: UNDERSTANDING_QUESTIONS },
    { titleKey: 'survey.sections.trust', questions: TRUST_QUESTIONS },
    { titleKey: 'survey.sections.cognitiveLoad', questions: NASA_TLX_QUESTIONS },
    { titleKey: 'survey.sections.experience', questions: EXPERIENCE_QUESTIONS },
    { titleKey: 'survey.sections.feedback', questions: [] }
  ];

  const handleResponse = (questionId, value) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleOpenEndedChange = (field, value) => {
    setOpenEnded(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isCurrentSectionComplete = () => {
    const section = sections[currentSection];
    
    if (currentSection === sections.length - 1) {
      return true; // Open-ended is optional
    }
    
    return section.questions.every(q => responses[q.id] !== undefined);
  };

  const handleNext = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(prev => prev + 1);
      track('SURVEY_SECTION_COMPLETED', { 
        section: currentSection, 
        taskNumber,
        condition 
      });
    }
  };

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    const surveyData = {
      taskNumber,
      condition,
      responses,
      openEnded,
      completedAt: new Date().toISOString()
    };

    track('SURVEY_COMPLETED', { 
      taskNumber, 
      condition,
      responseCount: Object.keys(responses).length 
    });

    onComplete(surveyData);
  };

  const renderSection = () => {
    const section = sections[currentSection];

    if (currentSection === sections.length - 1) {
      // Open-ended feedback section
      return (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('survey.openEnded.positive')}
            </label>
            <textarea
              value={openEnded.positive}
              onChange={(e) => handleOpenEndedChange('positive', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              placeholder={t('survey.openEnded.placeholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('survey.openEnded.negative')}
            </label>
            <textarea
              value={openEnded.negative}
              onChange={(e) => handleOpenEndedChange('negative', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              placeholder={t('survey.openEnded.placeholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('survey.openEnded.improvements')}
            </label>
            <textarea
              value={openEnded.improvements}
              onChange={(e) => handleOpenEndedChange('improvements', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              placeholder={t('survey.openEnded.placeholder')}
            />
          </div>
        </div>
      );
    }

    // Likert or NASA-TLX questions
    return (
      <div className="space-y-8">
        {section.questions.map((question) => (
          <div key={question.id} className="space-y-3">
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {t(question.questionKey)}
            </p>
            
            {question.category === 'cognitive_load' ? (
              <NASAScale
                value={responses[question.id]}
                onChange={(value) => handleResponse(question.id, value)}
                questionId={question.id}
                lowKey={question.lowKey}
                highKey={question.highKey}
              />
            ) : (
              <LikertScale
                value={responses[question.id]}
                onChange={(value) => handleResponse(question.id, value)}
                questionId={question.id}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 py-12 relative">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('survey.title', { number: taskNumber })}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('survey.description', { 
              condition: condition === 'workflow_builder' 
                ? t('survey.conditionWorkflow') 
                : t('survey.conditionAI')
            })}
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('survey.progress.section')} {currentSection + 1} {t('survey.progress.of')} {sections.length}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-500">
              {Math.round(((currentSection + 1) / sections.length) * 100)}% {t('survey.progress.complete')}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentSection + 1) / sections.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Survey Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            {t(sections[currentSection].titleKey)}
          </h2>

          {renderSection()}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handlePrevious}
              disabled={currentSection === 0}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                currentSection === 0
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t('common.navigation.previous')}
            </button>

            {currentSection === sections.length - 1 ? (
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg font-medium hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
              >
                {t('survey.submit')}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!isCurrentSectionComplete()}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  isCurrentSectionComplete()
                    ? 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                }`}
              >
                {t('common.navigation.next')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyQuestionnaire;