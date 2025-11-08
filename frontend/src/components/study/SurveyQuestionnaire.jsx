// frontend/src/components/study/SurveyQuestionnaire.jsx
/**
 * Post-Task Survey Component - REFACTORED
 * 
 * Improvements based on survey research best practices:
 * 1. NASA-TLX (Raw) moved to front - measures cognitive load first
 * 2. Consolidated sections - organized by research hypotheses
 * 3. 7-point Likert scales - aligned with research standards
 * 4. Consistent visual sizing - all scale options same width
 * 5. Streamlined questions - 17 quantitative + 3 open-ended (25 total)
 * 
 * Structure:
 * Section 1: Cognitive Workload (NASA-TLX Raw - 5 dimensions)
 * Section 2: Control, Agency & Engagement (5 items)
 * Section 3: Understanding & Explainability (5 items)
 * Section 4: Task Performance & Outcomes (7 items)
 * Section 5: Open-Ended Feedback (3 questions - optional)
 */
import React, { useState } from 'react';
import { useTracking } from '../../hooks/useTracking';
import { useTranslation } from '../../hooks/useTranslation';
import { surveyAPI } from '../../services/api';
import { useSessionStore } from '../../store/sessionStore';

// ============================================================
// QUESTION DEFINITIONS
// ============================================================

// Section 1: NASA-TLX Raw (5 core dimensions)
// Based on Hart & Staveland (1988) - validated for HCI research
// Note: Physical Demand omitted as not relevant for this task type
const NASA_TLX_QUESTIONS = [
  {
    id: 'mental_demand',
    questionKey: 'survey.nasaTlx.mentalDemand',
    descriptionKey: 'survey.nasaTlx.mentalDemandDesc',
    category: 'cognitive_load',
    lowKey: 'survey.nasaTlx.veryLow',
    highKey: 'survey.nasaTlx.veryHigh'
  },
  {
    id: 'temporal_demand',
    questionKey: 'survey.nasaTlx.temporalDemand',
    descriptionKey: 'survey.nasaTlx.temporalDemandDesc',
    category: 'cognitive_load',
    lowKey: 'survey.nasaTlx.veryLow',
    highKey: 'survey.nasaTlx.veryHigh'
  },
  {
    id: 'performance',
    questionKey: 'survey.nasaTlx.performance',
    descriptionKey: 'survey.nasaTlx.performanceDesc',
    category: 'cognitive_load',
    lowKey: 'survey.nasaTlx.perfect',
    highKey: 'survey.nasaTlx.failure'
  },
  {
    id: 'effort',
    questionKey: 'survey.nasaTlx.effort',
    descriptionKey: 'survey.nasaTlx.effortDesc',
    category: 'cognitive_load',
    lowKey: 'survey.nasaTlx.veryLow',
    highKey: 'survey.nasaTlx.veryHigh'
  },
  {
    id: 'frustration',
    questionKey: 'survey.nasaTlx.frustration',
    descriptionKey: 'survey.nasaTlx.frustrationDesc',
    category: 'cognitive_load',
    lowKey: 'survey.nasaTlx.veryLow',
    highKey: 'survey.nasaTlx.veryHigh'
  }
];

// Section 2: Control, Agency & Engagement (5 items)
// Tests H1a, H1b, H1d
const CONTROL_ENGAGEMENT_QUESTIONS = [
  // Agency & Control (2 items) - H1a
  {
    id: 'control_task',
    questionKey: 'survey.section2.controlTask',
    category: 'ux'
  },
  {
    id: 'agency_decisions',
    questionKey: 'survey.section2.agencyDecisions',
    category: 'ux'
  },
  
  // Engagement (1 item) - H1b
  {
    id: 'engagement',
    questionKey: 'survey.section2.engagement',
    category: 'ux'
  },
  
  // Confidence in Results (2 items) - H1d
  {
    id: 'confidence_quality',
    questionKey: 'survey.section2.confidenceQuality',
    category: 'ux'
  },
  {
    id: 'trust_results',
    questionKey: 'survey.section2.trustResults',
    category: 'ux'
  }
];

// Section 3: Understanding & Explainability (5 items)
// Tests H3, H4
const UNDERSTANDING_QUESTIONS = [
  {
    id: 'process_transparency',
    questionKey: 'survey.section3.processTransparency',
    category: 'ux'
  },
  {
    id: 'predictability',
    questionKey: 'survey.section3.predictability',
    category: 'ux'
  },
  {
    id: 'understood_choices',
    questionKey: 'survey.section3.understoodChoices',
    category: 'ux'
  },
  {
    id: 'understood_reasoning',
    questionKey: 'survey.section3.understoodReasoning',
    category: 'ux'
  },
  {
    id: 'could_explain',
    questionKey: 'survey.section3.couldExplain',
    category: 'ux'
  }
];

// Section 4: Task Performance & Outcomes (7 items)
// Tests H2 (perceived), Efficiency, Effectiveness
const PERFORMANCE_QUESTIONS = [
  // Efficiency (2 items)
  {
    id: 'ease_of_use',
    questionKey: 'survey.section4.easeOfUse',
    category: 'ux'
  },
  {
    id: 'efficiency',
    questionKey: 'survey.section4.efficiency',
    category: 'ux'
  },
  
  // Effectiveness (4 items)
  {
    id: 'found_insights',
    questionKey: 'survey.section4.foundInsights',
    category: 'ux'
  },
  {
    id: 'explored_thoroughly',
    questionKey: 'survey.section4.exploredThoroughly',
    category: 'ux'
  },
  {
    id: 'discovered_insights',
    questionKey: 'survey.section4.discoveredInsights',
    category: 'ux'
  },
  {
    id: 'accurate_reliable',
    questionKey: 'survey.section4.accurateReliable',
    category: 'ux'
  },
  
  // Recommendation (1 item)
  {
    id: 'recommend',
    questionKey: 'survey.section4.recommend',
    category: 'ux'
  }
];

// ============================================================
// 7-POINT LIKERT SCALE COMPONENT
// ============================================================
const LikertScale7 = ({ value, onChange, questionId }) => {
  const { t } = useTranslation();
  
  const options = [
    { value: 1, labelKey: 'survey.likert7.stronglyDisagree', shortKey: 'survey.likert7.short.stronglyDisagree' },
    { value: 2, labelKey: 'survey.likert7.disagree', shortKey: 'survey.likert7.short.disagree' },
    { value: 3, labelKey: 'survey.likert7.somewhatDisagree', shortKey: 'survey.likert7.short.somewhatDisagree' },
    { value: 4, labelKey: 'survey.likert7.neutral', shortKey: 'survey.likert7.short.neutral' },
    { value: 5, labelKey: 'survey.likert7.somewhatAgree', shortKey: 'survey.likert7.short.somewhatAgree' },
    { value: 6, labelKey: 'survey.likert7.agree', shortKey: 'survey.likert7.short.agree' },
    { value: 7, labelKey: 'survey.likert7.stronglyAgree', shortKey: 'survey.likert7.short.stronglyAgree' }
  ];

  return (
    <div className="space-y-3">
      {/* Scale buttons - all same height in row, auto-adjusting */}
      <div className="grid grid-cols-7 gap-2 auto-rows-fr">
        {options.map((option) => (
          <label
            key={option.value}
            className="cursor-pointer flex"
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
                w-full flex flex-col items-center rounded-lg border-2 text-center transition-all px-2 py-2
                ${value === option.value
                  ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-300 shadow-lg scale-105' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-gray-700/50 hover:shadow-md text-gray-700 dark:text-gray-300 bg-gray-50/50 dark:bg-gray-800/80'
                }
              `}
            >
              {/* Number - always at same height across all buttons */}
              <div className="text-xl font-bold mb-2 flex-shrink-0">{option.value}</div>
              
              {/* Text - grows as needed, wider for better readability */}
              <div className="w-full flex-1 flex items-center justify-center text-xs font-medium leading-tight whitespace-pre-line break-words">
                {t(option.shortKey)}
              </div>
            </div>
          </label>
        ))}
      </div>
      
      {/* Labels below - full text with proper alignment */}
      <div className="grid grid-cols-3 text-xs text-gray-500 dark:text-gray-400 px-1">
        <span className="text-left">{t(options[0].labelKey)}</span>
        <span className="text-center">{t(options[3].labelKey)}</span>
        <span className="text-right">{t(options[6].labelKey)}</span>
      </div>
    </div>
  );
};

// ============================================================
// NASA-TLX SCALE COMPONENT (0-100, displayed as 21 steps)
// ============================================================
const NASAScale = ({ value, onChange, questionId, lowKey, highKey, descriptionKey }) => {
  const { t } = useTranslation();
  
  // NASA-TLX uses 0-100 scale in increments of 5
  // Initialize to null to show it's unanswered, or use the provided value
  const displayValue = value !== undefined ? value : 50; // Default to middle
  const isAnswered = value !== undefined;
  
  return (
    <div className="space-y-4">
      {/* Description */}
      {descriptionKey && (
        <p className="text-sm text-gray-600 dark:text-gray-400 italic">
          {t(descriptionKey)}
        </p>
      )}
      
      {/* Slider with visual feedback */}
      <div className="relative pt-8"> {/* Added padding-top to create space */}
        {/* Unanswered indicator - positioned above with proper spacing */}
        {!isAnswered && (
          <div className="absolute top-0 left-0 right-0 flex items-center justify-center gap-2 text-sm text-blue-600 dark:text-blue-400">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="font-medium text-xs">{t('survey.nasaTlx.pleaseRate')}</span>
          </div>
        )}
        
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={displayValue}
          onChange={(e) => onChange(parseInt(e.target.value))}
          onClick={(e) => {
            // Allow clicking to confirm middle value if not yet answered
            if (!isAnswered) {
              onChange(parseInt(e.target.value));
            }
          }}
          className={`
            w-full h-3 rounded-lg appearance-none cursor-pointer transition-all
            ${isAnswered 
              ? 'bg-gray-200 dark:bg-gray-700 accent-blue-600 dark:accent-blue-500' 
              : 'bg-gray-200 dark:bg-gray-700 accent-blue-500 dark:accent-blue-400 opacity-70'
            }
          `}
        />
        
        {/* Tick marks */}
        <div className="absolute w-full flex justify-between px-1 mt-1 pointer-events-none">
          {[0, 25, 50, 75, 100].map(tick => (
            <div 
              key={tick} 
              className="text-xs text-gray-400 dark:text-gray-500"
            >
              |
            </div>
          ))}
        </div>
      </div>
      
      {/* Value display and labels */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center text-sm gap-4">
        <span className="text-gray-600 dark:text-gray-400 font-medium text-left">{t(lowKey)}</span>
        <span className={`
          font-bold text-lg px-4 py-1 rounded transition-all
          ${isAnswered 
            ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' 
            : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600'
          }
        `}>
          {displayValue}
        </span>
        <span className="text-gray-600 dark:text-gray-400 font-medium text-right">{t(highKey)}</span>
      </div>
      
      {/* Helpful hint for first interaction - very subtle */}
      {!isAnswered && (
        <p className="text-xs text-gray-500 dark:text-gray-500 text-center italic">
          {t('survey.nasaTlx.dragOrClick')}
        </p>
      )}
    </div>
  );
};

// ============================================================
// MAIN SURVEY COMPONENT
// ============================================================
const SurveyQuestionnaire = ({ taskNumber, condition, onComplete }) => {
  const { track } = useTracking();
  const { t, language } = useTranslation();
  const { participantId, sessionId } = useSessionStore();
  
  const [responses, setResponses] = useState({});
  const [openEnded, setOpenEnded] = useState({
    positive: '',
    negative: '',
    improvements: ''
  });
  const [currentSection, setCurrentSection] = useState(0);
  const [surveyStartTime] = useState(new Date().toISOString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Define sections - NASA-TLX, Control & Engagement, Understanding, Performance, Feedback
  const sections = [
    { 
      titleKey: 'survey.sections.cognitiveWorkload', 
      descriptionKey: 'survey.sections.cognitiveWorkloadDesc',
      questions: NASA_TLX_QUESTIONS // 5 dimensions
    },
    { 
      titleKey: 'survey.sections.controlEngagement', 
      descriptionKey: 'survey.sections.controlEngagementDesc',
      questions: CONTROL_ENGAGEMENT_QUESTIONS // 6 items
    },
    { 
      titleKey: 'survey.sections.understanding', 
      descriptionKey: 'survey.sections.understandingDesc',
      questions: UNDERSTANDING_QUESTIONS // 6 items
    },
    { 
      titleKey: 'survey.sections.performance', 
      descriptionKey: 'survey.sections.performanceDesc',
      questions: PERFORMANCE_QUESTIONS // 8 items
    },
    { 
      titleKey: 'survey.sections.feedback',
      descriptionKey: 'survey.sections.feedbackDesc',
      questions: [] // Open-ended
    }
  ];

  // Calculate total questions and current progress
  const totalQuestions = sections.reduce((sum, section) => sum + section.questions.length, 0) + 3; // +3 for open-ended
  const answeredQuestions = Object.keys(responses).length + (openEnded.positive || openEnded.negative || openEnded.improvements ? 1 : 0);
  
  // Calculate questions up to current section
  const questionsBeforeCurrentSection = sections.slice(0, currentSection).reduce((sum, section) => sum + section.questions.length, 0);
  const questionsInCurrentSection = sections[currentSection].questions.length || 3; // 3 for open-ended section
  const answeredInCurrentSection = sections[currentSection].questions.filter(q => responses[q.id] !== undefined).length;
  const currentQuestionNumber = questionsBeforeCurrentSection + answeredInCurrentSection + 1;
  const progressPercentage = (answeredQuestions / totalQuestions) * 100;

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
    
    // Open-ended feedback is optional
    if (currentSection === sections.length - 1) {
      return true;
    }
    
    // All questions must be answered
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
      
      // Scroll to top of next section
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    // Clear any previous errors
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      // Validate survey data
      const validation = surveyAPI.validate(responses, openEnded);
      if (!validation.isValid) {
        console.error('[Survey] Validation failed:', validation.errors);
        setSubmitError('Please complete all required questions before submitting.');
        setIsSubmitting(false);
        return;
      }

      // Format data for API
      const formattedData = surveyAPI.formatForSubmission({
        participantId,
        sessionId,
        taskNumber,
        condition,
        startedAt: surveyStartTime,
        completedAt: new Date().toISOString(),
        responses,
        openEnded,
        language: language || 'en'
      });

      console.log('[Survey] Submitting survey:', {
        participantId,
        taskNumber,
        condition,
        responseCount: Object.keys(responses).length
      });

      // Submit to backend
      const result = await surveyAPI.submit(formattedData);

      console.log('[Survey] Submission successful:', {
        survey_id: result.survey_id,
        duration: result.duration_seconds
      });

      // Track completion
      track('SURVEY_COMPLETED', { 
        taskNumber, 
        condition,
        surveyId: result.survey_id,
        responseCount: Object.keys(responses).length,
        openEndedProvided: Object.values(openEnded).filter(v => v?.trim()).length,
        durationSeconds: result.duration_seconds
      });

      // Call onComplete callback
      onComplete({
        success: true,
        surveyId: result.survey_id,
        taskNumber,
        condition,
        responses,
        openEnded,
        completedAt: formattedData.completed_at,
        durationSeconds: result.duration_seconds
      });

    } catch (error) {
      console.error('[Survey] Submission failed:', error);
      
      // Set user-friendly error message
      let errorMessage = 'Failed to submit survey. ';
      if (error.message.includes('already submitted')) {
        errorMessage += 'You have already submitted a survey for this task.';
      } else if (error.message.includes('Session not found')) {
        errorMessage += 'Your session could not be found. Please refresh the page.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage += 'Network error. Please check your connection and try again.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      setSubmitError(errorMessage);
      
      // Track submission failure
      track('SURVEY_SUBMISSION_FAILED', {
        taskNumber,
        condition,
        error: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSection = () => {
    const section = sections[currentSection];

    // Open-ended feedback section
    if (currentSection === sections.length - 1) {
      return (
        <div className="space-y-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {t('survey.openEnded.optional')}
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('survey.openEnded.positive')}
            </label>
            <textarea
              value={openEnded.positive}
              onChange={(e) => handleOpenEndedChange('positive', e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
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
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
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
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
              placeholder={t('survey.openEnded.placeholder')}
            />
          </div>
        </div>
      );
    }

    // Quantitative questions (NASA-TLX or Likert)
    return (
      <div className="space-y-10">
        {section.questions.map((question, index) => (
          <div key={question.id} className="space-y-4">
            {/* Question number and text */}
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-sm">
                {index + 1}
              </span>
              <p className="font-medium text-gray-900 dark:text-gray-100 pt-1">
                {t(question.questionKey)}
              </p>
            </div>
            
            {/* Scale */}
            <div className="pl-11">
              {question.category === 'cognitive_load' ? (
                <NASAScale
                  value={responses[question.id]}
                  onChange={(value) => handleResponse(question.id, value)}
                  questionId={question.id}
                  lowKey={question.lowKey}
                  highKey={question.highKey}
                  descriptionKey={question.descriptionKey}
                />
              ) : (
                <LikertScale7
                  value={responses[question.id]}
                  onChange={(value) => handleResponse(question.id, value)}
                  questionId={question.id}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 py-12 relative overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 pb-8"> {/* Changed from max-w-5xl to max-w-6xl */}
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
              {t('survey.progress.question')} {answeredQuestions} {t('survey.progress.of')} {totalQuestions}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-500">
              {Math.round(progressPercentage)}% {t('survey.progress.complete')}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          
          {/* Section indicator below progress bar */}
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-500 text-center">
            {t('survey.progress.section')} {currentSection + 1} {t('survey.progress.of')} {sections.length}
          </div>
        </div>

        {/* Survey Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 border border-gray-200 dark:border-gray-700">
          {/* Section Header */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {t(sections[currentSection].titleKey)}
            </h2>
            {sections[currentSection].descriptionKey && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t(sections[currentSection].descriptionKey)}
              </p>
            )}
            
            {/* NASA-TLX specific instruction */}
            {currentSection === 0 && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-blue-900 dark:text-blue-200">
                    {t('survey.nasaTlx.instruction')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Section Content */}
          {renderSection()}

          {/* Navigation */}
          <div className="flex justify-between mt-10 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handlePrevious}
              disabled={currentSection === 0}
              className={`px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                currentSection === 0
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span>←</span>
              {t('common.navigation.previous')}
            </button>

            {currentSection === sections.length - 1 ? (
              <div className="flex flex-col items-end gap-2">
                {submitError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-800 dark:text-red-200 max-w-md">
                    {submitError}
                  </div>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`px-8 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    isSubmitting
                      ? 'bg-gray-400 dark:bg-gray-600 text-gray-200 cursor-not-allowed'
                      : 'bg-green-600 dark:bg-green-500 text-white hover:bg-green-700 dark:hover:bg-green-600'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {t('survey.submitting')}
                    </>
                  ) : (
                    <>
                      {t('survey.submit')}
                      <span>✓</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <button
                onClick={handleNext}
                disabled={!isCurrentSectionComplete()}
                className={`px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  isCurrentSectionComplete()
                    ? 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                }`}
              >
                {t('common.navigation.next')}
                <span>→</span>
              </button>
            )}
          </div>
        </div>

        {/* Required questions note */}
        {currentSection < sections.length - 1 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('survey.allQuestionsRequired')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyQuestionnaire;