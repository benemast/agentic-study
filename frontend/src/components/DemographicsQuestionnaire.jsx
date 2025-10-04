// frontend/src/components/DemographicsQuestionnaire.jsx
import React, { useState, useCallback } from 'react';
import { useTranslation } from '../hooks/useTranslation';

import { useSession } from '../hooks/useSession';
import { useTracking } from '../hooks/useTracking';
import { demographicsAPI } from '../config/api';
import { 
  DEMOGRAPHICS_CONFIG, 
  ERROR_MESSAGES, 
  SUCCESS_MESSAGES,
  TRACKING_EVENTS 
} from '../config/constants';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const DemographicsQuestionnaire = ({ onComplete }) => {
  
const { sessionId } = useSession();
  const { track, trackError } = useTracking();
  
  const [responses, setResponses] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  
  const { t, currentLanguage, setLanguage } = useTranslation(); 

  // Check if field of study should be shown
  const shouldShowFieldOfStudy = ['bachelors', 'masters', 'phd'].includes(responses.education);

  // Track demographics start
  useEffect(() => {
    track(TRACKING_EVENTS.DEMOGRAPHICS_STARTED);
  }, [track]);

  // Validate required fields
  const validateForm = () => {
    const newErrors = {};
    
    DEMOGRAPHICS_CONFIG.REQUIRED_FIELDS.forEach(field => {
      if (!responses[field] || responses[field].trim() === '') {
        newErrors[field] = 'This field is required';
      }
    });
    
    // Age validation
    if (responses.age) {
      const age = parseInt(responses.age);
      if (isNaN(age) || age < DEMOGRAPHICS_CONFIG.MIN_AGE || age > DEMOGRAPHICS_CONFIG.MAX_AGE) {
        newErrors.age = `Age must be between ${DEMOGRAPHICS_CONFIG.MIN_AGE} and ${DEMOGRAPHICS_CONFIG.MAX_AGE}`;
      }
    }
    
    // Text length validation
    Object.keys(responses).forEach(key => {
      if (typeof responses[key] === 'string' && responses[key].length > DEMOGRAPHICS_CONFIG.MAX_TEXT_LENGTH) {
        newErrors[key] = `Maximum ${DEMOGRAPHICS_CONFIG.MAX_TEXT_LENGTH} characters allowed`;
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setSubmitError('Please fix the errors before submitting');
      return;
    }
    
    if (!sessionId) {
      setSubmitError(ERROR_MESSAGES.SESSION_EXPIRED);
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Track submission attempt
      track('demographics_submission_attempted', {
        fieldsCompleted: Object.keys(responses).length
      });
      
      // Prepare data
      const demographicsData = {
        session_id: sessionId,
        ...responses,
        language_used: currentLanguage, // Track which language was used
        raw_response: responses,
        completed_at: new Date().toISOString()
      };
      
      // Submit using API client
      const result = await demographicsAPI.create(demographicsData);
      
      console.log('Demographics submitted:', result);
      
      // Track successful completion
      track(TRACKING_EVENTS.DEMOGRAPHICS_COMPLETED, {
        fieldsCompleted: Object.keys(responses).length,
        completionTime: Date.now()
      });
      
      // Show success message
      alert(SUCCESS_MESSAGES.SUBMITTED);
      
      // Call completion callback
      if (onComplete) {
        onComplete(result);
      }
      
    } catch (error) {
      console.error('Demographics submission error:', error);
      
      let errorMessage = ERROR_MESSAGES.API_ERROR;
      
      if (error.status === 409) {
        errorMessage = 'Demographics already submitted for this session';
      } else if (error.status === 400) {
        errorMessage = 'Invalid demographics data. Please check your responses.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setSubmitError(errorMessage);
      trackError('demographics_submit_failed', error.message, {
        status: error.status,
        fieldsCompleted: Object.keys(responses).length
      });
      
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setResponses(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleNext = () => {
    // Validate current step before proceeding
    const currentFields = steps[currentStep].fields || [];
    const hasErrors = currentFields.some(field => {
      if (DEMOGRAPHICS_CONFIG.REQUIRED_FIELDS.includes(field.name)) {
        return !responses[field.name];
      }
      return false;
    });
    
    if (hasErrors) {
      setSubmitError('Please complete all required fields before continuing');
      return;
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      setSubmitError(null);
      
      // Track step completion
      track('demographics_step_completed', {
        step: currentStep,
        stepName: steps[currentStep].title
      });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setSubmitError(null);
    }
  };

const steps = [
    {
      title: t('demographics.welcome.title'),
      type: 'intro',
      content: (
        <div className="text-center space-y-6">
          <div className="text-6xl mb-6">🤖</div>
          <h2 className="text-3xl font-bold text-gray-900">
            {t('demographics.welcome.subtitle')}
          </h2>
          
          {/* Language Selector */}
          <div className="flex justify-center mb-6">
            <div className="bg-gray-100 rounded-lg p-1 flex space-x-1">
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  currentLanguage === 'en' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage('de')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  currentLanguage === 'de' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Deutsch
              </button>
            </div>
          </div>
          
          <div className="text-left max-w-2xl mx-auto space-y-4 text-gray-700">
            <p className="text-lg">
              {t('demographics.welcome.description')}
            </p>
            
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-3">{t('demographics.welcome.whatYouWillDo.title')}</h3>
              <ul className="space-y-2 text-blue-800">
                <li>• {t('demographics.welcome.whatYouWillDo.explore')}</li>
                <li>• {t('demographics.welcome.whatYouWillDo.create')}</li>
                <li>• {t('demographics.welcome.whatYouWillDo.test')}</li>
                <li>• {t('demographics.welcome.whatYouWillDo.complete')}</li>
              </ul>
            </div>
            
            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
              <h3 className="font-semibold text-green-900 mb-3">{t('demographics.welcome.studyDetails.title')}</h3>
              <ul className="space-y-2 text-green-800">
                <li>• <strong>{t('demographics.welcome.studyDetails.duration.label')}</strong> {t('demographics.welcome.studyDetails.duration.value')}</li>
                <li>• <strong>{t('demographics.welcome.studyDetails.privacy.label')}</strong> {t('demographics.welcome.studyDetails.privacy.value')}</li>
                <li>• <strong>{t('demographics.welcome.studyDetails.data.label')}</strong> {t('demographics.welcome.studyDetails.data.value')}</li>
                <li>• <strong>{t('demographics.welcome.studyDetails.resumable.label')}</strong> {t('demographics.welcome.studyDetails.resumable.value')}</li>
              </ul>
            </div>
            
            <div className="bg-amber-50 rounded-lg p-6 border border-amber-200">
              <h3 className="font-semibold text-amber-900 mb-3">{t('demographics.welcome.beforeWeBegin.title')}</h3>
              <p className="text-amber-800">
                {t('demographics.welcome.beforeWeBegin.description')}
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: t('demographics.basicInfo.title'),
      type: 'form',
      fields: [
        {
          key: 'age',
          label: t('demographics.basicInfo.age.label'),
          type: 'select',
          required: true,
          options: [
            { value: '18-24', label: '18-24' },
            { value: '25-34', label: '25-34' },
            { value: '35-44', label: '35-44' },
            { value: '45-54', label: '45-54' },
            { value: '55-64', label: '55-64' },
            { value: '65+', label: '65+' },
            { value: 'prefer-not-to-say', label: t('demographics.basicInfo.age.preferNotToSay') }
          ]
        },
        {
          key: 'gender',
          label: t('demographics.basicInfo.gender.label'),
          type: 'select',
          required: false,
          options: [
            { value: 'woman', label: t('demographics.basicInfo.gender.woman') },
            { value: 'man', label: t('demographics.basicInfo.gender.man') },
            { value: 'non-binary', label: t('demographics.basicInfo.gender.nonBinary') },
            { value: 'other', label: t('demographics.basicInfo.gender.other') },
            { value: 'prefer-not-to-say', label: t('demographics.basicInfo.gender.preferNotToSay') }
          ]
        },
        {
          key: 'education',
          label: t('demographics.basicInfo.education.label'),
          type: 'select',
          required: true,
          options: [
            { value: 'high-school', label: t('demographics.basicInfo.education.highSchool') },
            { value: 'some-college', label: t('demographics.basicInfo.education.someCollege') },
            { value: 'bachelors', label: t('demographics.basicInfo.education.bachelors') },
            { value: 'masters', label: t('demographics.basicInfo.education.masters') },
            { value: 'phd', label: t('demographics.basicInfo.education.phd') },
            { value: 'other', label: t('demographics.basicInfo.education.other') }
          ]
        },
        // Conditional field of study
        ...(shouldShowFieldOfStudy ? [{
          key: 'field_of_study',
          label: t('demographics.basicInfo.fieldOfStudy.label'),
          type: 'text',
          placeholder: t('demographics.basicInfo.fieldOfStudy.placeholder'),
          required: true
        }] : []),
        {
          key: 'occupation',
          label: t('demographics.basicInfo.occupation.label'),
          type: 'text',
          placeholder: t('demographics.basicInfo.occupation.placeholder'),
          required: false
        }
      ]
    },
    {
      title: t('demographics.technicalBackground.title'),
      type: 'form',
      fields: [
        {
          key: 'programming_experience',
          label: t('demographics.technicalBackground.programming.label'),
          type: 'select',
          required: true,
          options: [
            { value: 'none', label: t('demographics.technicalBackground.programming.none') },
            { value: 'beginner', label: t('demographics.technicalBackground.programming.beginner') },
            { value: 'intermediate', label: t('demographics.technicalBackground.programming.intermediate') },
            { value: 'advanced', label: t('demographics.technicalBackground.programming.advanced') },
            { value: 'expert', label: t('demographics.technicalBackground.programming.expert') }
          ]
        },
        {
          key: 'ai_ml_experience',
          label: t('demographics.technicalBackground.aiMl.label'),
          type: 'select',
          required: true,
          options: [
            { value: 'none', label: t('demographics.technicalBackground.aiMl.none') },
            { value: 'beginner', label: t('demographics.technicalBackground.aiMl.beginner') },
            { value: 'intermediate', label: t('demographics.technicalBackground.aiMl.intermediate') },
            { value: 'advanced', label: t('demographics.technicalBackground.aiMl.advanced') },
            { value: 'expert', label: t('demographics.technicalBackground.aiMl.expert') }
          ]
        },
        {
          key: 'workflow_tools_used',
          label: t('demographics.technicalBackground.workflowTools.label'),
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
            { value: 'none', label: t('demographics.technicalBackground.workflowTools.none') },
            { value: 'other', label: t('demographics.technicalBackground.workflowTools.other') }
          ]
        },
        {
          key: 'technical_role',
          label: t('demographics.technicalBackground.technicalRole.label'),
          type: 'select',
          required: false,
          options: [
            { value: 'developer', label: t('demographics.technicalBackground.technicalRole.developer') },
            { value: 'data-scientist', label: t('demographics.technicalBackground.technicalRole.dataScientist') },
            { value: 'researcher', label: t('demographics.technicalBackground.technicalRole.researcher') },
            { value: 'product-manager', label: t('demographics.technicalBackground.technicalRole.productManager') },
            { value: 'designer', label: t('demographics.technicalBackground.technicalRole.designer') },
            { value: 'student', label: t('demographics.technicalBackground.technicalRole.student') },
            { value: 'business-analyst', label: t('demographics.technicalBackground.technicalRole.businessAnalyst') },
            { value: 'consultant', label: t('demographics.technicalBackground.technicalRole.consultant') },
            { value: 'other', label: t('demographics.technicalBackground.technicalRole.other') },
            { value: 'non-technical', label: t('demographics.technicalBackground.technicalRole.nonTechnical') }
          ]
        }
      ]
    },
    {
      title: t('demographics.studyContext.title'),
      type: 'form',
      fields: [
        {
          key: 'participation_motivation',
          label: t('demographics.studyContext.motivation.label'),
          type: 'textarea',
          placeholder: t('demographics.studyContext.motivation.placeholder'),
          required: false,
          rows: 3
        },
        {
          key: 'expectations',
          label: t('demographics.studyContext.expectations.label'),
          type: 'textarea',
          placeholder: t('demographics.studyContext.expectations.placeholder'),
          required: false,
          rows: 3
        },
        {
          key: 'time_availability',
          label: t('demographics.studyContext.timeAvailability.label'),
          type: 'select',
          required: true,
          options: [
            { value: '15-30min', label: t('demographics.studyContext.timeAvailability.short') },
            { value: '30-45min', label: t('demographics.studyContext.timeAvailability.medium') },
            { value: '45-60min', label: t('demographics.studyContext.timeAvailability.long') },
            { value: '60min+', label: t('demographics.studyContext.timeAvailability.veryLong') },
            { value: 'flexible', label: t('demographics.studyContext.timeAvailability.flexible') }
          ]
        }
      ]
    },
    {
      title: t('demographics.optionalInfo.title'),
      type: 'form',
      fields: [
        {
          key: 'country',
          label: t('demographics.optionalInfo.country.label'),
          type: 'text',
          placeholder: t('demographics.optionalInfo.country.placeholder'),
          required: false
        },
        {
          key: 'first_language',
          label: t('demographics.optionalInfo.firstLanguage.label'),
          type: 'text',
          placeholder: t('demographics.optionalInfo.firstLanguage.placeholder'),
          required: false
        },
        {
          key: 'comments',
          label: t('demographics.optionalInfo.comments.label'),
          type: 'textarea',
          placeholder: t('demographics.optionalInfo.comments.placeholder'),
          required: false,
          rows: 4
        }
      ]
    }
  ];


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
          stepErrors[field.key] = t('common.validation.required');
        }
      }
    });
    
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  }, [responses, t]);


  
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
              <option value="">{t('common.form.pleaseSelect')}</option>
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
  }, [responses, errors, handleInputChange, handleCheckboxChange, t]);

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLastStep = currentStep === steps.length - 1;

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
              {Math.round(progress)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Error Banner */}
        {submitError && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-500">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
              <button
                onClick={() => setSubmitError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Step content */}
        <form onSubmit={isLastStep ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              {currentStepData.title}
            </h1>
            
            <div className="space-y-6 max-w-2xl mx-auto">
              {/* Your existing field rendering logic */}
              {currentStepData.fields?.map(field => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.label}
                    {DEMOGRAPHICS_CONFIG.REQUIRED_FIELDS.includes(field.name) && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>
                  
                  {field.type === 'select' ? (
                    <select
                      value={responses[field.name] || ''}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required={DEMOGRAPHICS_CONFIG.REQUIRED_FIELDS.includes(field.name)}
                    >
                      <option value="">Select...</option>
                      {field.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      value={responses[field.name] || ''}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={4}
                      maxLength={DEMOGRAPHICS_CONFIG.MAX_TEXT_LENGTH}
                      placeholder={field.placeholder}
                    />
                  ) : (
                    <input
                      type={field.type || 'text'}
                      value={responses[field.name] || ''}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder={field.placeholder}
                      maxLength={field.type === 'text' ? DEMOGRAPHICS_CONFIG.MAX_TEXT_LENGTH : undefined}
                    />
                  )}
                  
                  {errors[field.name] && (
                    <p className="text-sm text-red-600 mt-1">{errors[field.name]}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between items-center">
            <button
              type="button"
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
                {currentStep === 0 && 'Ready to start?'}
                {currentStep > 0 && currentStep < steps.length - 1 && 'Continue when ready'}
                {currentStep === steps.length - 1 && 'Almost done!'}
              </p>
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : isLastStep
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Submitting...
                </span>
              ) : isLastStep ? (
                'Submit'
              ) : (
                'Next'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DemographicsQuestionnaire;