// frontend/src/components/DemographicsQuestionnaire.jsx
import React, { useState, useCallback } from 'react';
import { useSessionStore } from './SessionManager';
import { useTranslation } from '../hooks/useTranslation';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const DemographicsQuestionnaire = ({ onComplete }) => {
  const { trackInteraction, sessionId } = useSessionStore();
  const { t, currentLanguage, setLanguage } = useTranslation();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState({
    // Demographics
    age: '',
    gender: '',
    education: '',
    field_of_study: '', // New field
    occupation: '',
    
    // Technical Background
    programming_experience: '',
    ai_ml_experience: '',
    workflow_tools_used: [],
    technical_role: '',
    
    // Study Context
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

  // Check if field of study should be shown
  const shouldShowFieldOfStudy = ['bachelors', 'masters', 'phd'].includes(responses.education);

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
    
    // Clear field of study if education level changes to non-degree
    if (key === 'education' && !['bachelors', 'masters', 'phd'].includes(value)) {
      setResponses(prev => ({
        ...prev,
        field_of_study: ''
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
          stepErrors[field.key] = t('common.validation.required');
        }
      }
    });
    
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  }, [responses, t]);

  const handleNext = useCallback(() => {
    const currentStepData = steps[currentStep];
    
    if (currentStepData.type === 'form' && !validateStep(currentStepData)) {
      trackInteraction('demographics_validation_error', { 
        step: currentStep,
        errors: Object.keys(errors),
        language: currentLanguage
      });
      return;
    }
    
    trackInteraction('demographics_step_completed', { 
      step: currentStep,
      step_title: currentStepData.title,
      language: currentLanguage
    });
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  }, [currentStep, validateStep, errors, trackInteraction, currentLanguage]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      trackInteraction('demographics_step_back', { step: currentStep, language: currentLanguage });
    }
  }, [currentStep, trackInteraction, currentLanguage]);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    
    try {
      // Prepare data for API
      const demographicsData = {
        session_id: sessionId,
        ...responses,
        language_used: currentLanguage, // Track which language was used
        raw_response: responses
      };
      
      // Submit to backend API
      const response = await fetch(`${API_BASE_URL}/demographics/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(demographicsData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Demographics submitted successfully:', result);
      
      // Store demographics data in session store
      useSessionStore.setState(state => ({
        sessionData: {
          ...state.sessionData,
          demographics: responses,
          demographicsCompleted: true,
          demographicsCompletedFor: sessionId,
          demographicsCompletedAt: new Date().toISOString()
        }
      }));
      
      // Track completion
      trackInteraction('demographics_completed', {
        total_steps: steps.length,
        completion_time_minutes: Math.round((Date.now() - useSessionStore.getState().sessionStartTime) / 60000),
        language: currentLanguage,
        responses_summary: {
          age: responses.age,
          education: responses.education,
          field_of_study: responses.field_of_study,
          programming_experience: responses.programming_experience,
          ai_ml_experience: responses.ai_ml_experience,
          time_availability: responses.time_availability
        }
      });

      //set session tabel entry has_demographics to true
      const updateResponse = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ has_demographics: true })
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({}));
        console.error('Failed to update session:', errorData);
        throw new Error(errorData.detail || `HTTP error! status: ${updateResponse.status}`);
      }
      
      console.log('Session updated with has_demographics');

      onComplete(responses);
    } catch (error) {
      console.error('Failed to submit demographics:', error);
      trackInteraction('demographics_submission_error', { error: error.message, language: currentLanguage });
      
      // Still allow continuation if API fails (for offline capability)
      useSessionStore.setState(state => ({
        sessionData: {
          ...state.sessionData,
          demographics: responses,
          demographicsCompleted: true,
          demographicsCompletedFor: sessionId,
          demographicsCompletedAt: new Date().toISOString(),
          demographicsSubmissionError: error.message
        }
      }));
      
      console.warn('Demographics saved locally, will retry sync later');
      onComplete(responses);
    } finally {
      setIsSubmitting(false);
    }
  }, [responses, onComplete, trackInteraction, steps.length, sessionId, currentLanguage]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-4xl w-full mx-4 my-8">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              {t('demographics.progress.step', { current: currentStep + 1, total: steps.length })}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(progress)}% {t('demographics.progress.complete')}
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
            {t('common.navigation.previous')}
          </button>
          
          <div className="text-center">
            <p className="text-sm text-gray-500">
              {currentStep === 0 && t('demographics.navigation.readyToStart')}
              {currentStep > 0 && currentStep < steps.length - 1 && t('demographics.navigation.continueWhenReady')}
              {currentStep === steps.length - 1 && t('demographics.navigation.almostDone')}
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
                <span>{t('demographics.navigation.submitting')}</span>
              </span>
            ) : currentStep === steps.length - 1 ? (
              t('demographics.navigation.completeAndContinue')
            ) : currentStep === 0 ? (
              t('demographics.navigation.startQuestionnaire')
            ) : (
              t('common.navigation.next')
            )}
          </button>
        </div>
        
        {/* Privacy note */}
        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            {t('demographics.privacyNote')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DemographicsQuestionnaire;