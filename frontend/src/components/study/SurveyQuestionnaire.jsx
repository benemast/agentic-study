// frontend/src/components/study/SurveyQuestionnaire.jsx
/**
 * Post-Task Survey Component
 * 
 * Measures:
 * - Perceived agency and control (Likert scales)
 * - User understanding and trust
 * - Cognitive effort (NASA-TLX)
 * - User experience
 */
import React, { useState } from 'react';
import { useTracking } from '../../hooks/useTracking';

const AGENCY_QUESTIONS = [
  {
    id: 'control',
    question: 'I felt in control of the task completion process.',
    category: 'agency'
  },
  {
    id: 'autonomy',
    question: 'I had enough autonomy to complete the task my way.',
    category: 'agency'
  },
  {
    id: 'influence',
    question: 'I could influence how the task was executed.',
    category: 'agency'
  },
  {
    id: 'decision_making',
    question: 'I was actively involved in decision-making throughout the task.',
    category: 'agency'
  }
];

const UNDERSTANDING_QUESTIONS = [
  {
    id: 'process_clarity',
    question: 'I understood how the system was processing my task.',
    category: 'understanding'
  },
  {
    id: 'steps_clear',
    question: 'The steps taken to complete the task were clear to me.',
    category: 'understanding'
  },
  {
    id: 'predictability',
    question: 'I could predict what the system would do next.',
    category: 'understanding'
  }
];

const TRUST_QUESTIONS = [
  {
    id: 'trust_results',
    question: 'I trust the results produced by the system.',
    category: 'trust'
  },
  {
    id: 'trust_process',
    question: 'I trust that the system processed the data correctly.',
    category: 'trust'
  },
  {
    id: 'confidence',
    question: 'I am confident in the quality of the output.',
    category: 'trust'
  }
];

const NASA_TLX_QUESTIONS = [
  {
    id: 'mental_demand',
    question: 'Mental Demand: How mentally demanding was the task?',
    category: 'cognitive_load',
    low: 'Very Low',
    high: 'Very High'
  },
  {
    id: 'temporal_demand',
    question: 'Temporal Demand: How hurried or rushed was the pace of the task?',
    category: 'cognitive_load',
    low: 'Very Low',
    high: 'Very High'
  },
  {
    id: 'effort',
    question: 'Effort: How hard did you have to work to accomplish your level of performance?',
    category: 'cognitive_load',
    low: 'Very Low',
    high: 'Very High'
  },
  {
    id: 'frustration',
    question: 'Frustration: How insecure, discouraged, irritated, stressed, and annoyed were you?',
    category: 'cognitive_load',
    low: 'Very Low',
    high: 'Very High'
  }
];

const EXPERIENCE_QUESTIONS = [
  {
    id: 'ease_of_use',
    question: 'The interface was easy to use.',
    category: 'experience'
  },
  {
    id: 'efficiency',
    question: 'I was able to complete the task efficiently.',
    category: 'experience'
  },
  {
    id: 'satisfaction',
    question: 'I am satisfied with how I completed the task.',
    category: 'experience'
  }
];

const LikertScale = ({ value, onChange, questionId }) => {
  const options = [
    { value: 1, label: 'Strongly Disagree' },
    { value: 2, label: 'Disagree' },
    { value: 3, label: 'Neutral' },
    { value: 4, label: 'Agree' },
    { value: 5, label: 'Strongly Agree' }
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
                ? 'border-blue-600 bg-blue-50 text-blue-900'
                : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }
            `}
          >
            <div className="text-2xl mb-1">{option.value}</div>
            <div className="text-xs font-medium">{option.label}</div>
          </div>
        </label>
      ))}
    </div>
  );
};

const NASAScale = ({ value, onChange, questionId, low, high }) => {
  return (
    <div className="space-y-2">
      <input
        type="range"
        min="1"
        max="21"
        value={value || 11}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
      <div className="flex justify-between text-xs text-gray-600">
        <span>{low}</span>
        <span className="font-semibold text-gray-900">{value || 11}/21</span>
        <span>{high}</span>
      </div>
    </div>
  );
};

const SurveyQuestionnaire = ({ taskNumber, condition, onComplete }) => {
  const { track } = useTracking();
  const [responses, setResponses] = useState({});
  const [openEnded, setOpenEnded] = useState({
    positive: '',
    negative: '',
    improvements: ''
  });
  const [currentSection, setCurrentSection] = useState(0);

  const sections = [
    { title: 'Agency & Control', questions: AGENCY_QUESTIONS },
    { title: 'Understanding', questions: UNDERSTANDING_QUESTIONS },
    { title: 'Trust', questions: TRUST_QUESTIONS },
    { title: 'Cognitive Load (NASA-TLX)', questions: NASA_TLX_QUESTIONS },
    { title: 'User Experience', questions: EXPERIENCE_QUESTIONS },
    { title: 'Open-Ended Feedback', questions: [] }
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
      // Open-ended section is optional
      return true;
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What did you find most helpful or positive about this approach?
            </label>
            <textarea
              value={openEnded.positive}
              onChange={(e) => handleOpenEndedChange('positive', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Share your thoughts..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What challenges or frustrations did you encounter?
            </label>
            <textarea
              value={openEnded.negative}
              onChange={(e) => handleOpenEndedChange('negative', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Share your thoughts..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What improvements would you suggest?
            </label>
            <textarea
              value={openEnded.improvements}
              onChange={(e) => handleOpenEndedChange('improvements', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Share your thoughts..."
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
            <p className="font-medium text-gray-900">
              {question.question}
            </p>
            
            {question.category === 'cognitive_load' ? (
              <NASAScale
                value={responses[question.id]}
                onChange={(value) => handleResponse(question.id, value)}
                questionId={question.id}
                low={question.low}
                high={question.high}
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
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Task {taskNumber} Feedback Survey
          </h1>
          <p className="text-gray-600">
            Please share your experience with the {condition === 'workflow_builder' ? 'Workflow Builder' : 'AI Assistant'}.
            Your feedback helps us understand how people interact with these systems.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Section {currentSection + 1} of {sections.length}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(((currentSection + 1) / sections.length) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentSection + 1) / sections.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Survey Section */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {sections[currentSection].title}
          </h2>

          {renderSection()}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handlePrevious}
              disabled={currentSection === 0}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                currentSection === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Previous
            </button>

            {currentSection === sections.length - 1 ? (
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Submit Survey
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!isCurrentSectionComplete()}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  isCurrentSectionComplete()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyQuestionnaire;