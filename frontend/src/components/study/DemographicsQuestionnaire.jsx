// frontend/src/components/study/DemographicsQuestionnaire.jsx
import React, { useEffect, useCallback } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { useSession } from '../../hooks/useSession';
import { useSessionData } from '../../hooks/useSessionData';
import { useTracking } from '../../hooks/useTracking';
import { demographicsAPI } from '../../config/api';
import { 
  DEMOGRAPHICS_CONFIG, 
  ERROR_MESSAGES, 
  TRACKING_EVENTS 
} from '../../config/constants';

const DemographicsQuestionnaire = ({ onComplete }) => {
  const { t, currentLanguage } = useTranslation();
  const { sessionId } = useSession();
  const { track, trackError } = useTracking();
  
  // Get demographics state from SessionStore
  const {
    demographicsData,
    demographicsStep,
    demographicsError,
    setDemographicsField,
    setDemographicsStep,
    setDemographicsError,
    completeDemographics
  } = useSessionData();

  // Track field-level errors for highlighting
  const [fieldErrors, setFieldErrors] = React.useState({});

  // Track demographics start on mount
  useEffect(() => {
    track(TRACKING_EVENTS.DEMOGRAPHICS_STARTED);
  }, [track]);

  // Safety check: reset demographicsStep if out of bounds
  useEffect(() => {
    if (demographicsStep < 0 || demographicsStep >= 3) {
      console.warn(`Demographics step ${demographicsStep} is out of bounds, resetting to 0`);
      setDemographicsStep(0);
    }
  }, [demographicsStep, setDemographicsStep]);

  // Conditional field visibility
  const shouldShowFieldOfStudy = ['bachelors', 'masters', 'phd'].includes(
    demographicsData.education
  );

  // Handle input change
  const handleChange = useCallback((field, value) => {
    setDemographicsField(field, value);
    
    // Clear error for this specific field when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    // Clear general error when user starts typing
    if (demographicsError) {
      setDemographicsError(null);
    }
  }, [setDemographicsField, fieldErrors, demographicsError, setDemographicsError]);

  // Handle checkbox array changes (for workflow_tools_used)
  const handleCheckboxChange = useCallback((field, value, checked) => {
    const currentValues = demographicsData[field] || [];
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter(v => v !== value);
    setDemographicsField(field, newValues);
    
    // Clear error for this field
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [demographicsData, setDemographicsField, fieldErrors]);

  // Validate current step
  const validateStep = useCallback((stepIndex) => {
    const step = steps[stepIndex];
    if (!step.fields) return true;

    const stepErrors = {};
    
    step.fields.forEach(field => {
      if (field.required) {
        const value = demographicsData[field.key];
        if (!value || (Array.isArray(value) && value.length === 0) || 
            (typeof value === 'string' && value.trim() === '')) {
          stepErrors[field.key] = t('common.validation.required');
        }
      }
      
      // Conditional required: field_of_study if bachelors/masters/phd
      if (field.key === 'field_of_study' && shouldShowFieldOfStudy && field.required) {
        if (!demographicsData.field_of_study || demographicsData.field_of_study.trim() === '') {
          stepErrors.field_of_study = t('common.validation.required');
        }
      }
    });

    if (Object.keys(stepErrors).length > 0) {
      setFieldErrors(stepErrors);
      setDemographicsError(t('common.validation.pleaseFillRequired'));
      return false;
    }

    // Clear errors if validation passes
    setFieldErrors({});
    return true;
  }, [demographicsData, shouldShowFieldOfStudy, setDemographicsError, t]);

  // Navigate to next step
  const handleNext = useCallback(() => {
    if (!validateStep(demographicsStep)) {
      return;
    }

    if (demographicsStep < steps.length - 1) {
      setDemographicsStep(demographicsStep + 1);
      track('demographics_step_completed', {
        step: demographicsStep,
        stepName: steps[demographicsStep].title
      });
    }
  }, [demographicsStep, validateStep, setDemographicsStep, track]);

  // Navigate to previous step
  const handlePrevious = useCallback(() => {
    if (demographicsStep > 0) {
      setDemographicsStep(demographicsStep - 1);
      setDemographicsError(null);
    }
  }, [demographicsStep, setDemographicsStep, setDemographicsError]);

  // Submit demographics
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!validateStep(demographicsStep)) {
      return;
    }

    if (!sessionId) {
      setDemographicsError(ERROR_MESSAGES.SESSION_EXPIRED);
      return;
    }

    try {
      // Prepare data for submission - only include fields that have values
      const cleanedData = Object.entries(demographicsData).reduce((acc, [key, value]) => {
        // Include the field if it has a value (not empty string, not empty array)
        if (value !== '' && value !== null && value !== undefined) {
          if (Array.isArray(value) && value.length === 0) {
            // Skip empty arrays
            return acc;
          }
          acc[key] = value;
        }
        return acc;
      }, {});

      const submissionData = {
        session_id: sessionId,
        ...cleanedData,
        // Ensure workflow_tools_used is always an array (PostgreSQL text[] expects array, not JSON string)
        workflow_tools_used: Array.isArray(cleanedData.workflow_tools_used) 
          ? cleanedData.workflow_tools_used 
          : (cleanedData.workflow_tools_used ? [cleanedData.workflow_tools_used] : []),
        // Backend might expect these fields even if empty
        participation_motivation: cleanedData.participation_motivation || null,
        expectations: cleanedData.expectations || null,
        time_availability: cleanedData.time_availability || null,
        language_used: currentLanguage,
        raw_response: demographicsData,
        completed_at: new Date().toISOString()
      };

      console.log('Submitting demographics:', submissionData);
      console.log('workflow_tools_used type:', typeof submissionData.workflow_tools_used, 'isArray:', Array.isArray(submissionData.workflow_tools_used));


      // Submit to backend
      const result = await demographicsAPI.create(submissionData);

      console.log('✅ Demographics submitted:', result);

      // Complete demographics in store (triggers sync)
      await completeDemographics(demographicsData);

      // Track completion
      track(TRACKING_EVENTS.DEMOGRAPHICS_COMPLETED, {
        fieldsCompleted: Object.keys(cleanedData).length,
        language: currentLanguage
      });

      // Call parent callback
      if (onComplete) {
        onComplete(result);
      }

    } catch (error) {
      console.error('❌ Demographics submission failed:', error);
      console.error('Error details:', error.response?.data || error.message);
      console.error('Error status:', error.status);

      let errorMessage = ERROR_MESSAGES.API_ERROR;
      if (error.status === 409) {
        errorMessage = 'Demographics already submitted';
      } else if (error.status === 400) {
        errorMessage = 'Invalid data. Please check your responses.';
      } else if (error.status === 500) {
        errorMessage = 'Server error. Please try again or contact support.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setDemographicsError(errorMessage);
      trackError('demographics_submit_failed', error.message, {
        status: error.status,
        fieldsCompleted: Object.keys(demographicsData).length,
        errorDetails: error.response?.data || error.message
      });
    }
  }, [
    demographicsStep,
    demographicsData,
    sessionId,
    currentLanguage,
    validateStep,
    completeDemographics,
    track,
    trackError,
    setDemographicsError,
    onComplete
  ]);

  // Define questionnaire steps
  const steps = [
    // Step 1: Basic Information
    {
      title: t('demographics.basicInfo.title'),
      description: t('demographics.basicInfo.description'),
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
          key: 'country',
          label: t('demographics.basicInfo.country.label'),
          type: 'text',
          required: false,
          placeholder: t('demographics.basicInfo.country.placeholder')
        },
        {
          key: 'first_language',
          label: t('demographics.basicInfo.firstLanguage.label'),
          type: 'text',
          required: false,
          placeholder: t('demographics.basicInfo.firstLanguage.placeholder')
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
        ...(shouldShowFieldOfStudy ? [{
          key: 'field_of_study',
          label: t('demographics.basicInfo.fieldOfStudy.label'),
          type: 'text',
          required: true,
          placeholder: t('demographics.basicInfo.fieldOfStudy.placeholder')
        }] : []),
        {
          key: 'occupation',
          label: t('demographics.basicInfo.occupation.label'),
          type: 'text',
          required: false,
          placeholder: t('demographics.basicInfo.occupation.placeholder')
        }
      ]
    },

    // Step 2: Technical Background
    {
      title: t('demographics.technicalBackground.title'),
      description: t('demographics.technicalBackground.description'),
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
            { value: 'make', label: 'Make (Integromat)' },
            { value: 'n8n', label: 'n8n' },
            { value: 'node-red', label: 'Node-RED' },
            { value: 'airflow', label: 'Apache Airflow' },
            { value: 'prefect', label: 'Prefect' },
            { value: 'temporal', label: 'Temporal' },
            { value: 'langchain', label: 'LangChain' },
            { value: 'llamaindex', label: 'LlamaIndex' },
            { value: 'haystack', label: 'Haystack' },
            { value: 'power-automate', label: 'Microsoft Power Automate' },
            { value: 'ifttt', label: 'IFTTT' },
            { value: 'workato', label: 'Workato' },
            { value: 'tray', label: 'Tray.io' },
            { value: 'azure-logic-apps', label: 'Azure Logic Apps' },
            { value: 'other', label: t('demographics.technicalBackground.workflowTools.other') },
            { value: 'none', label: t('demographics.technicalBackground.workflowTools.none') }
          ]
        },
        {
          key: 'technical_role',
          label: t('demographics.technicalBackground.technicalRole.label'),
          type: 'select',
          required: false,
          options: [
            { value: 'developer', label: t('demographics.technicalBackground.technicalRole.developer') },
            { value: 'devops-engineer', label: t('demographics.technicalBackground.technicalRole.devopsEngineer') },
            { value: 'data-scientist', label: t('demographics.technicalBackground.technicalRole.dataScientist') },
            { value: 'researcher', label: t('demographics.technicalBackground.technicalRole.researcher') },
            { value: 'pro-manager', label: t('demographics.technicalBackground.technicalRole.proManager') },
            { value: 'designer', label: t('demographics.technicalBackground.technicalRole.designer') },
            { value: 'student', label: t('demographics.technicalBackground.technicalRole.student') },
            { value: 'business-analyst', label: t('demographics.technicalBackground.technicalRole.businessAnalyst') },
            { value: 'qa-engineer', label: t('demographics.technicalBackground.technicalRole.qaEngineer') },
            { value: 'system-architect', label: t('demographics.technicalBackground.technicalRole.systemArchitect') },
            { value: 'consultant', label: t('demographics.technicalBackground.technicalRole.consultant') },
            { value: 'entrepreneur', label: t('demographics.technicalBackground.technicalRole.entrepreneur') },
            { value: 'other-technical', label: t('demographics.technicalBackground.technicalRole.otherTechnical') },
            { value: 'non-technical', label: t('demographics.technicalBackground.technicalRole.nonTechnical') }
          ]
        },
        {
          key: 'comments',
          label: t('demographics.technicalBackground.comments.label'),
          type: 'textarea',
          required: false,
          placeholder: t('demographics.technicalBackground.comments.placeholder'),
          rows: 4
        }
      ]
    }
  ];

  // Safety check: ensure demographicsStep is within bounds
  const safeStep = Math.max(0, Math.min(demographicsStep, steps.length - 1));
  const currentStepData = steps[safeStep] || steps[0];
  const progress = ((safeStep + 1) / steps.length) * 100;
  const isLastStep = safeStep === steps.length - 1;

  // Render field based on type
  const renderField = (field) => {
    const value = demographicsData[field.key] || (field.type === 'checkbox' ? [] : '');
    const fieldId = `demographics-${field.key}`;
    const hasError = !!fieldErrors[field.key];

    const baseInputClass = `
      w-full px-4 py-2 border rounded-lg 
      focus:ring-2 focus:outline-none
      transition-colors
      ${hasError 
        ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
      }
    `;

    switch (field.type) {
      case 'text':
        return (
          <div key={field.key} className="space-y-2">
            <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              id={fieldId}
              type="text"
              value={value}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              maxLength={DEMOGRAPHICS_CONFIG.MAX_TEXT_LENGTH}
              className={baseInputClass}
            />
            {hasError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <span>⚠️</span>
                <span>{fieldErrors[field.key]}</span>
              </p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.key} className="space-y-2">
            <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              id={fieldId}
              value={value}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              rows={field.rows || 3}
              maxLength={DEMOGRAPHICS_CONFIG.MAX_TEXT_LENGTH}
              className={baseInputClass}
            />
            <div className="flex justify-between items-center">
              <div>
                {hasError && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <span>⚠️</span>
                    <span>{fieldErrors[field.key]}</span>
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {value.length} / {DEMOGRAPHICS_CONFIG.MAX_TEXT_LENGTH}
              </p>
            </div>
          </div>
        );

      case 'select':
        return (
          <div key={field.key} className="space-y-2">
            <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              id={fieldId}
              value={value}
              onChange={(e) => handleChange(field.key, e.target.value)}
              className={baseInputClass}
            >
              <option value="">{t('common.form.pleaseSelect')}</option>
              {field.options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {hasError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <span>⚠️</span>
                <span>{fieldErrors[field.key]}</span>
              </p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.key} className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className={`space-y-2 p-3 rounded-lg border ${hasError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
              {field.options.map(option => {
                const isChecked = value.includes(option.value);
                return (
                  <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => handleCheckboxChange(field.key, option.value, e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{option.label}</span>
                  </label>
                );
              })}
            </div>
            {hasError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <span>⚠️</span>
                <span>{fieldErrors[field.key]}</span>
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl p-8">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                {t('demographics.progress.step', { current: safeStep + 1, total: steps.length })}
              </span>
              <span className="text-sm text-gray-500">
                {Math.round(progress)}% {t('demographics.progress.complete')}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Error Banner */}
          {demographicsError && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <div className="flex items-start">
                <span className="text-red-500 text-xl mr-3">⚠️</span>
                <div className="flex-1">
                  <p className="text-sm text-red-700">{demographicsError}</p>
                </div>
                <button
                  onClick={() => setDemographicsError(null)}
                  className="text-red-500 hover:text-red-700 text-xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Step Content */}
          <form onSubmit={isLastStep ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {currentStepData.title}
              </h2>
              {currentStepData.description && (
                <p className="text-gray-600 mb-6">{currentStepData.description}</p>
              )}

              <div className="space-y-6">
                {currentStepData.fields?.map(field => renderField(field))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-6 border-t">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={demographicsStep === 0}
                className={`
                  px-6 py-2.5 rounded-lg font-medium transition-all
                  ${demographicsStep === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }
                `}
              >
                {t('common.navigation.previous')}
              </button>

              <div className="text-center">
                <p className="text-sm text-gray-500">
                  {demographicsStep === 0 && t('demographics.navigation.readyToStart')}
                  {demographicsStep > 0 && !isLastStep && t('demographics.navigation.continueWhenReady')}
                  {isLastStep && t('demographics.navigation.almostDone')}
                </p>
              </div>

              <button
                type="submit"
                className={`
                  px-6 py-2.5 rounded-lg font-medium transition-all
                  ${isLastStep
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }
                `}
              >
                {isLastStep 
                  ? t('demographics.navigation.completeAndContinue')
                  : t('common.navigation.next')
                }
              </button>
            </div>
          </form>

          {/* Privacy Note */}
          <div className="mt-6 pt-6 border-t">
            <p className="text-xs text-gray-500 text-center">
              {t('demographics.privacyNote')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemographicsQuestionnaire;