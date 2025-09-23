// frontend/src/components/DemographicsQuestionnaire.jsx
import React, { useState, useCallback } from 'react';
import { useSessionStore } from './SessionManager';

const DemographicsQuestionnaire = ({ onComplete }) => {
  const trackInteraction = useSessionStore(state => state.trackInteraction);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState({
    // Demographics
    age: '',
    gender: '',
    education: '',
    occupation: '',
    experience_level: '',
    
    // Technical Background
    programming_experience: '',
    ai_ml_experience: '',
    workflow_tools_used: [],
    technical_role: '',
    
    // Research Context
    participation_motivation: '',
    expectations: '',
    time_availability: '',
    
    // Optional
    country: '',
    first_language: '',
    comments: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps = [
    {
      title: 'Welcome to the Agentic AI Study',
      type: 'intro',
      content: (
        <div className="text-center space-y-6">
          <div className="text-6xl mb-6">🤖</div>
          <h2 className="text-3xl font-bold text-gray-900">
            Research on Agentic AI Workflow Design
          </h2>
          <div className="text-left max-w-2xl mx-auto space-y-4 text-gray-700">
            <p className="text-lg">
              Welcome! You're participating in a research study exploring how people design 
              and interact with agentic AI workflows using visual tools.
            </p>
            
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-3">What you'll do:</h3>
              <ul className="space-y-2 text-blue-800">
                <li>• Explore our visual workflow builder interface</li>
                <li>• Create AI agent workflows for various scenarios</li>
                <li>• Test and iterate on your workflow designs</li>
                <li>• Complete tasks and provide feedback</li>
              </ul>
            </div>
            
            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
              <h3 className="font-semibold text-green-900 mb-3">Study details:</h3>
              <ul className="space-y-2 text-green-800">
                <li>• <strong>Duration:</strong> 30-60 minutes (work at your own pace)</li>
                <li>• <strong>Privacy:</strong> Anonymous - no personal identifiers collected</li>
                <li>• <strong>Data:</strong> Only interaction patterns and workflow designs</li>
                <li>• <strong>Resumable:</strong> Save your progress and continue later</li>
              </ul>
            </div>
            
            <div className="bg-amber-50 rounded-lg p-6 border border-amber-200">
              <h3 className="font-semibold text-amber-900 mb-3">Before we begin:</h3>
              <p className="text-amber-800">
                We'll ask a few quick questions about your background to help us understand 
                our participants better. This helps us analyze how different experience levels 
                approach agentic AI design.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Basic Information',
      type: 'form',
      fields: [
        {
          key: 'age',
          label: 'Age Range',
          type: 'select',
          required: true,
          options: [
            { value: '18-24', label: '18-24' },
            { value: '25-34', label: '25-34' },
            { value: '35-44', label: '35-44' },
            { value: '45-54', label: '45-54' },
            { value: '55-64', label: '55-64' },
            { value: '65+', label: '65+' },
            { value: 'prefer-not-to-say', label: 'Prefer not to say' }
          ]
        },
        {
          key: 'gender',
          label: 'Gender Identity',
          type: 'select',
          required: false,
          options: [
            { value: 'woman', label: 'Woman' },
            { value: 'man', label: 'Man' },
            { value: 'non-binary', label: 'Non-binary' },
            { value: 'other', label: 'Other' },
            { value: 'prefer-not-to-say', label: 'Prefer not to say' }
          ]
        },
        {
          key: 'education',
          label: 'Highest Level of Education',
          type: 'select',
          required: true,
          options: [
            { value: 'high-school', label: 'High school / Secondary education' },
            { value: 'some-college', label: 'Some college / university' },
            { value: 'bachelors', label: "Bachelor's degree" },
            { value: 'masters', label: "Master's degree" },
            { value: 'phd', label: 'PhD / Doctoral degree' },
            { value: 'other', label: 'Other' }
          ]
        },
        {
          key: 'occupation',
          label: 'Current Occupation / Field',
          type: 'text',
          placeholder: 'e.g., Software Engineer, Student, Researcher, etc.',
          required: false
        }
      ]
    },
    {
      title: 'Technical Background',
      type: 'form',
      fields: [
        {
          key: 'programming_experience',
          label: 'Programming Experience',
          type: 'select',
          required: true,
          options: [
            { value: 'none', label: 'No programming experience' },
            { value: 'beginner', label: 'Beginner (< 1 year)' },
            { value: 'intermediate', label: 'Intermediate (1-3 years)' },
            { value: 'advanced', label: 'Advanced (3-7 years)' },
            { value: 'expert', label: 'Expert (7+ years)' }
          ]
        },
        {
          key: 'ai_ml_experience',
          label: 'AI/ML Experience',
          type: 'select',
          required: true,
          options: [
            { value: 'none', label: 'No AI/ML experience' },
            { value: 'beginner', label: 'Beginner - some exposure/learning' },
            { value: 'intermediate', label: 'Intermediate - built some AI/ML projects' },
            { value: 'advanced', label: 'Advanced - professional AI/ML work' },
            { value: 'expert', label: 'Expert - AI/ML specialist/researcher' }
          ]
        },
        {
          key: 'workflow_tools_used',
          label: 'Workflow/Automation Tools Used (select all that apply)',
          type: 'checkbox',
          required: false,
          options: [
            { value: 'zapier', label: 'Zapier' },
            { value: 'ifttt', label: 'IFTTT' },
            { value: 'microsoft-power-automate', label: 'Microsoft Power Automate' },
            { value: 'n8n', label: 'n8n' },
            { value: 'integromat-make', label: 'Integromat/Make' },
            { value: 'github-actions', label: 'GitHub Actions' },
            { value: 'airflow', label: 'Apache Airflow' },
            { value: 'langchain', label: 'LangChain' },
            { value: 'flowise', label: 'Flowise' },
            { value: 'none', label: 'None of these' },
            { value: 'other', label: 'Other (please specify in comments)' }
          ]
        },
        {
          key: 'technical_role',
          label: 'Best Describes Your Technical Role',
          type: 'select',
          required: false,
          options: [
            { value: 'developer', label: 'Software Developer/Engineer' },
            { value: 'data-scientist', label: 'Data Scientist/Analyst' },
            { value: 'researcher', label: 'Academic/Industry Researcher' },
            { value: 'product-manager', label: 'Product Manager' },
            { value: 'designer', label: 'UX/UI Designer' },
            { value: 'student', label: 'Student' },
            { value: 'business-analyst', label: 'Business Analyst' },
            { value: 'consultant', label: 'Consultant' },
            { value: 'other', label: 'Other' },
            { value: 'non-technical', label: 'Non-technical role' }
          ]
        }
      ]
    },
    {
      title: 'Study Context',
      type: 'form',
      fields: [
        {
          key: 'participation_motivation',
          label: 'What motivated you to participate in this study?',
          type: 'textarea',
          placeholder: 'e.g., Interest in AI, research participation, learning about workflow tools...',
          required: false,
          rows: 3
        },
        {
          key: 'expectations',
          label: 'What do you hope to learn or experience?',
          type: 'textarea',
          placeholder: 'Your expectations about the study and workflow builder...',
          required: false,
          rows: 3
        },
        {
          key: 'time_availability',
          label: 'How much time do you have available today?',
          type: 'select',
          required: true,
          options: [
            { value: '15-30min', label: '15-30 minutes' },
            { value: '30-45min', label: '30-45 minutes' },
            { value: '45-60min', label: '45-60 minutes' },
            { value: '60min+', label: 'More than 60 minutes' },
            { value: 'flexible', label: 'Flexible - I can pause and resume' }
          ]
        }
      ]
    },
    {
      title: 'Optional Information',
      type: 'form',
      fields: [
        {
          key: 'country',
          label: 'Country/Region (optional)',
          type: 'text',
          placeholder: 'e.g., United States, Germany, etc.',
          required: false
        },
        {
          key: 'first_language',
          label: 'First Language (optional)',
          type: 'text',
          placeholder: 'e.g., English, Spanish, Mandarin, etc.',
          required: false
        },
        {
          key: 'comments',
          label: 'Additional Comments (optional)',
          type: 'textarea',
          placeholder: 'Any other information you\'d like to share or questions about the study...',
          required: false,
          rows: 4
        }
      ]
    }
  ];

  const handleInputChange = useCallback((key, value) => {
    setResponses(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Clear error for this field
    if (errors[key]) {
      setErrors(prev => ({
        ...prev,
        [key]: null
      }));
    }
  }, [errors]);

  const handleCheckboxChange = useCallback((key, value, checked) => {
    setResponses(prev => {
      const currentValues = prev[key] || [];
      if (checked) {
        return {
          ...prev,
          [key]: [...currentValues, value]
        };
      } else {
        return {
          ...prev,
          [key]: currentValues.filter(v => v !== value)
        };
      }
    });
  }, []);

  const validateStep = useCallback((step) => {
    if (step.type !== 'form') return true;
    
    const stepErrors = {};
    
    step.fields.forEach(field => {
      if (field.required) {
        const value = responses[field.key];
        if (!value || (Array.isArray(value) && value.length === 0)) {
          stepErrors[field.key] = 'This field is required';
        }
      }
    });
    
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  }, [responses]);

  const handleNext = useCallback(() => {
    const currentStepData = steps[currentStep];
    
    if (currentStepData.type === 'form' && !validateStep(currentStepData)) {
      trackInteraction('demographics_validation_error', { 
        step: currentStep,
        errors: Object.keys(errors)
      });
      return;
    }
    
    trackInteraction('demographics_step_completed', { 
      step: currentStep,
      step_title: currentStepData.title
    });
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  }, [currentStep, validateStep, errors, trackInteraction]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      trackInteraction('demographics_step_back', { step: currentStep });
    }
  }, [currentStep, trackInteraction]);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    
    try {
      // Store demographics data in session
      useSessionStore.setState(state => ({
        sessionData: {
          ...state.sessionData,
          demographics: responses,
          demographicsCompleted: true,
          demographicsCompletedAt: new Date().toISOString()
        }
      }));
      
      // Track completion
      trackInteraction('demographics_completed', {
        total_steps: steps.length,
        completion_time_minutes: Math.round((Date.now() - useSessionStore.getState().sessionStartTime) / 60000),
        responses_summary: {
          age: responses.age,
          education: responses.education,
          programming_experience: responses.programming_experience,
          ai_ml_experience: responses.ai_ml_experience,
          time_availability: responses.time_availability
        }
      });
      
      onComplete(responses);
    } catch (error) {
      console.error('Failed to submit demographics:', error);
      trackInteraction('demographics_submission_error', { error: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }, [responses, onComplete, trackInteraction, steps.length]);

  const renderField = useCallback((field) => {
    const value = responses[field.key] || '';
    const error = errors[field.key];
    
    const baseClasses = `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
      error ? 'border-red-300' : 'border-gray-300'
    }`;
    
    switch (field.type) {
      case 'text':
        return (
          <div key={field.key} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => handleInputChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className={baseClasses}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        );
        
      case 'textarea':
        return (
          <div key={field.key} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              value={value}
              onChange={(e) => handleInputChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              rows={field.rows || 3}
              className={baseClasses}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        );
        
      case 'select':
        return (
          <div key={field.key} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              value={value}
              onChange={(e) => handleInputChange(field.key, e.target.value)}
              className={baseClasses}
            >
              <option value="">Please select...</option>
              {field.options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        );
        
      case 'checkbox':
        return (
          <div key={field.key} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {field.options.map(option => {
                const isChecked = (responses[field.key] || []).includes(option.value);
                return (
                  <label key={option.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => handleCheckboxChange(field.key, option.value, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{option.label}</span>
                  </label>
                );
              })}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        );
        
      default:
        return null;
    }
  }, [responses, errors, handleInputChange, handleCheckboxChange]);

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-4xl w-full mx-4 my-8">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(progress)}% complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {currentStepData.title}
          </h1>
          
          {currentStepData.type === 'intro' ? (
            currentStepData.content
          ) : (
            <div className="space-y-6 max-w-2xl mx-auto">
              {currentStepData.fields.map(renderField)}
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              currentStep === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Previous
          </button>
          
          <div className="text-center">
            <p className="text-sm text-gray-500">
              {currentStep === 0 && 'Ready to get started?'}
              {currentStep > 0 && currentStep < steps.length - 1 && 'Continue when ready'}
              {currentStep === steps.length - 1 && 'Almost done!'}
            </p>
          </div>
          
          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              isSubmitting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center space-x-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Submitting...</span>
              </span>
            ) : currentStep === steps.length - 1 ? (
              'Complete & Continue'
            ) : currentStep === 0 ? (
              'Start Questionnaire'
            ) : (
              'Next'
            )}
          </button>
        </div>
        
        {/* Privacy note */}
        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            All responses are anonymous and used solely for research purposes. 
            You can skip any optional questions you prefer not to answer.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DemographicsQuestionnaire;