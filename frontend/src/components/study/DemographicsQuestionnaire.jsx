// frontend/src/components/study/DemographicsQuestionnaire.jsx
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useSession } from '../../hooks/useSession';
import { useSessionData } from '../../hooks/useSessionData';
import { useTracking } from '../../hooks/useTracking';
import { useTranslation } from '../../hooks/useTranslation';
import { demographicsAPI } from '../../services/api';
import { interpolateComponents } from '../../utils/translationHelpers';
import { 
  DEMOGRAPHICS_CONFIG, 
  ERROR_MESSAGES, 
  TRACKING_EVENTS 
} from '../../config/constants';

const DemographicsQuestionnaire = ({ onComplete }) => {
  const { sessionId } = useSession();
  const { 
    demographicsData,
    demographicsStep,
    setDemographicsField,
    setDemographicsStep,
    completeDemographics,
    setDemographicsError,
    demographicsError
  } = useSessionData();
  
  const { track, trackError } = useTracking();
  const { t, currentLanguage } = useTranslation();
  const [fieldErrors, setFieldErrors] = useState({});

  // Track page view
  useEffect(() => {
    track(TRACKING_EVENTS.DEMOGRAPHICS_STARTED, {
      step: demographicsStep,
      language: currentLanguage
    });
  }, []);

  // Safety check: reset demographicsStep if out of bounds
  useEffect(() => {
    if (demographicsStep < 0 || demographicsStep >= 3) {
      console.warn(`Demographics step ${demographicsStep} is out of bounds, resetting to 0`);
      setDemographicsStep(0);
    }
  }, [demographicsStep, setDemographicsStep]);

  // Computed: Check if field_of_study should be shown
  const shouldShowFieldOfStudy = useMemo(() => {
    const education = demographicsData.education;
    return education === 'bachelors' || education === 'masters' || education === 'phd';
  }, [demographicsData.education]);

  // Computed: Check if additional AI fields should be shown
  const shouldShowAdditionalAI = useMemo(() => {
    const ai_ml_experience = demographicsData.ai_ml_experience;
    return ai_ml_experience !== 'none' && ai_ml_experience !== '';
  }, [demographicsData.ai_ml_experience]);

  // Handle text/select inputs
  const handleInputChange = useCallback((field, value) => {
    setDemographicsField(field, value);
    
    // Clear error for this field
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

  // Handle checkbox arrays
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


     // Conditional required: AI fields when AI experience is not none
    if ((field.key === 'ai_ml_expertise' || field.key === 'ai_tools_used' || field.key === 'workflow_tools_used') 
        && shouldShowAdditionalAI && field.required) {
      const value = demographicsData[field.key];
      if (!value || (Array.isArray(value) && value.length === 0) || 
          (typeof value === 'string' && value.trim() === '')) {
        stepErrors[field.key] = t('common.validation.required');
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

      await demographicsAPI.create(submissionData);
      await completeDemographics(demographicsData);
      
      track(TRACKING_EVENTS.DEMOGRAPHICS_COMPLETED, {
        fieldsCompleted: Object.keys(cleanedData).length,
        language: currentLanguage
      });

      // Call parent callback
      if (onComplete) {
        onComplete(demographicsData);
      }

    } catch (error) {
      console.error('Demographics submission failed:', error);
      let errorMessage = ERROR_MESSAGES.API_ERROR;
      if (error.status === 409) {
        errorMessage = 'Demographics already submitted';
      } else if (error.status === 400) {
        errorMessage = 'Invalid data submitted. Please check your responses.';
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
          key: 'genderIdentity',
          label: t('demographics.basicInfo.genderIdentity.label'),
          type: 'select',
          required: true,
          options: [
            { value: 'woman', label: t('demographics.basicInfo.genderIdentity.woman') },
            { value: 'man', label: t('demographics.basicInfo.genderIdentity.man') },
            { value: 'non-binary', label: t('demographics.basicInfo.genderIdentity.nonBinary') },
            { value: 'other', label: t('demographics.basicInfo.genderIdentity.other') },
            { value: 'prefer-not-to-say', label: t('demographics.basicInfo.genderIdentity.preferNotToSay') }
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
            { value: 'none', label: t('demographics.basicInfo.education.none') },
            { value: 'school', label: t('demographics.basicInfo.education.school') },
            { value: 'upperSecondary', label: t('demographics.basicInfo.education.upperSecondary') },
            { value: 'vocational', label: t('demographics.basicInfo.education.vocational') },
            { value: 'shortTertiary', label: t('demographics.basicInfo.education.shortTertiary') },
            { value: 'bachelors', label: t('demographics.basicInfo.education.bachelors') },
            { value: 'masters', label: t('demographics.basicInfo.education.masters') },
            { value: 'phd', label: t('demographics.basicInfo.education.phd') },
            { value: 'other', label: t('demographics.basicInfo.education.other') },
            { value: 'prefer-not-to-say', label: t('demographics.basicInfo.education.preferNotToSay') }
          ]
        },
        ...(shouldShowFieldOfStudy ? [{
          key: 'field_of_study',
          label: t('demographics.basicInfo.fieldOfStudy.label'),
          type: 'text',
          required: false,
          placeholder: t('demographics.basicInfo.fieldOfStudy.placeholder')
        }] : [])
      ]
    },
    
    // Step 2: Professional Background
    {
      title: t('demographics.professionalBackground.title'),
      description: t('demographics.professionalBackground.description'),
      fields: [
        {
          key: 'occupation',
          label: t('demographics.professionalBackground.occupation.label'),
          type: 'text',
          required: false,
          placeholder: t('demographics.professionalBackground.occupation.placeholder')
        },
        {
          key: 'industry',
          label: t('demographics.professionalBackground.industry.label'),
          type: 'select',
          required: true,
          options: [
            { value: 'consulting',    label: t('demographics.professionalBackground.industry.consulting') },
            { value: 'education',     label: t('demographics.professionalBackground.industry.education') },
            { value: 'finance',       label: t('demographics.professionalBackground.industry.finance') },
            { value: 'government',    label: t('demographics.professionalBackground.industry.government') },
            { value: 'healthcare',    label: t('demographics.professionalBackground.industry.healthcare') },
            { value: 'manufacturing', label: t('demographics.professionalBackground.industry.manufacturing') },
            { value: 'nonprofit',     label: t('demographics.professionalBackground.industry.nonprofit') },
            { value: 'research',      label: t('demographics.professionalBackground.industry.research') },
            { value: 'retail',        label: t('demographics.professionalBackground.industry.retail') },
            { value: 'tech',          label: t('demographics.professionalBackground.industry.tech') },
            { value: 'student',       label: t('demographics.professionalBackground.industry.student') },
            { value: 'other',         label: t('demographics.professionalBackground.industry.other') }
          ]
        },
        {
          key: 'work_experience',
          label: t('demographics.professionalBackground.workExperience.label'),
          type: 'select',
          required: true,
          options: [
            { value: 'none', label: t('demographics.professionalBackground.workExperience.none') },
            { value: '0-2', label: t('demographics.professionalBackground.workExperience.lessThan2') },
            { value: '3-5', label: t('demographics.professionalBackground.workExperience.threeToFive') },
            { value: '6-10', label: t('demographics.professionalBackground.workExperience.sixToTen') },
            { value: '10+', label: t('demographics.professionalBackground.workExperience.moreThan10') }
          ]
        }
      ]
    },

    // Step 3: Technical Background
    {
      title: t('demographics.technicalBackground.title'),
      description: t('demographics.technicalBackground.description'),
      fields: [
        {
          key: 'technical_role',
          label: t('demographics.technicalBackground.technicalRole.label'),
          type: 'select',
          required: false,
          options: [
            { value: 'business-analyst',    label: t('demographics.technicalBackground.technicalRole.businessAnalyst') },
            { value: 'consultant',          label: t('demographics.technicalBackground.technicalRole.consultant') },
            { value: 'data-scientist',      label: t('demographics.technicalBackground.technicalRole.dataScientist') },
            { value: 'designer',            label: t('demographics.technicalBackground.technicalRole.designer') },
            { value: 'devops-engineer',     label: t('demographics.technicalBackground.technicalRole.devopsEngineer') },
            { value: 'developer',           label: t('demographics.technicalBackground.technicalRole.developer') },
            { value: 'entrepreneur',        label: t('demographics.technicalBackground.technicalRole.entrepreneur') },
            { value: 'pro-manager',         label: t('demographics.technicalBackground.technicalRole.proManager') },
            { value: 'qa-engineer',         label: t('demographics.technicalBackground.technicalRole.qaEngineer') },
            { value: 'researcher',          label: t('demographics.technicalBackground.technicalRole.researcher') },
            { value: 'system-architect',    label: t('demographics.technicalBackground.technicalRole.systemArchitect') },
            { value: 'other-technical',     label: t('demographics.technicalBackground.technicalRole.otherTechnical') },
            { value: 'non-technical',       label: t('demographics.technicalBackground.technicalRole.nonTechnical') }
          ]
        },
        {
          key: 'programming_experience',
          label: t('demographics.technicalBackground.programmingExperience.label'),
          type: 'select',
          required: true,
          options: [
            { value: 'none', label: t('demographics.technicalBackground.programmingExperience.none') },
            { value: 'basic', label: t('demographics.technicalBackground.programmingExperience.basic') },
            { value: 'intermediate', label: t('demographics.technicalBackground.programmingExperience.intermediate') },
            { value: 'advanced', label: t('demographics.technicalBackground.programmingExperience.advanced') },
            { value: 'expert', label: t('demographics.technicalBackground.programmingExperience.expert') }
          ]
        },
        {
          key: 'ai_ml_experience',
          label: t('demographics.technicalBackground.aiMlExperience.time.label'),
          description: t('demographics.technicalBackground.aiMlExperience.time.description'),
          type: 'select',
          required: true,
          options: [
            { value: 'none', label: t('demographics.technicalBackground.aiMlExperience.time.none') },
            { value: 'basic', label: t('demographics.technicalBackground.aiMlExperience.time.basic') },
            { value: 'intermediate', label: t('demographics.technicalBackground.aiMlExperience.time.intermediate') },
            { value: 'advanced', label: t('demographics.technicalBackground.aiMlExperience.time.advanced') },
            { value: 'expert', label: t('demographics.technicalBackground.aiMlExperience.time.expert') }
          ]
        },

        ...(shouldShowAdditionalAI ? [
          {
            key: 'ai_ml_expertise',
            label: t('demographics.technicalBackground.aiMlExperience.level.label'),
            type: 'select',
            required: false,
            options: [
              { value: 'basic', label: t('demographics.technicalBackground.aiMlExperience.level.basic') },
              { value: 'intermediate', label: t('demographics.technicalBackground.aiMlExperience.level.intermediate') },
              { value: 'advanced', label: t('demographics.technicalBackground.aiMlExperience.level.advanced') },
              { value: 'expert', label: t('demographics.technicalBackground.aiMlExperience.level.expert') }
            ]
          },
          {
            key: 'ai_tools_used',
            label: t('demographics.technicalBackground.tools.labelAI'),
            type: 'checkbox',
            required: true,
            options: [
              { value: 'chatgpt',        label: 'ChatGPT' },
              { value: 'claude',         label: 'Claude' },
              { value: 'deepSeek',       label: 'DeepSeek' },
              { value: 'github',         label: 'GitHub Copilot' },
              { value: 'gemini',         label: 'Google Gemini' },
              { value: 'microsoft',      label: 'Microsoft Copilot' },
              { value: 'midjourney',     label: 'Midjourney' },
              { value: 'stable-diffusion', label: 'Stable Diffusion' },
              { value: 'other',          label: t('demographics.technicalBackground.tools.other') },
              { value: 'none',           label: t('demographics.technicalBackground.tools.none') }
            ]
          },
          {
            key: 'workflow_tools_used',
            label: t('demographics.technicalBackground.tools.labelWorkflow'),
            type: 'checkbox',
            required: true,
            options: [
              { value: 'airflow',          label: 'Apache Airflow' },
              { value: 'azure-logic-apps', label: 'Azure Logic Apps' },
              { value: 'haystack',         label: 'Haystack' },
              { value: 'ifttt',            label: 'IFTTT' },
              { value: 'langchain',        label: 'LangChain' },
              { value: 'llamaindex',       label: 'LlamaIndex' },
              { value: 'make',             label: 'Make (Integromat)' },
              { value: 'n8n',              label: 'n8n' },
              { value: 'node-red',         label: 'Node-RED' },
              { value: 'power-automate',   label: 'Microsoft Power Automate' },
              { value: 'prefect',          label: 'Prefect' },
              { value: 'tray',             label: 'Tray.io' },
              { value: 'temporal',         label: 'Temporal' },
              { value: 'workato',          label: 'Workato' },
              { value: 'zapier',           label: 'Zapier' },
              { value: 'other',            label: t('demographics.technicalBackground.tools.other') },
              { value: 'none',             label: t('demographics.technicalBackground.tools.none') }
            ]

          }
        ] : []),
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
    if (field.hidden) return null;

    const value = demographicsData[field.key] || (field.type === 'checkbox' ? [] : '');
    const fieldId = `demographics-${field.key}`;
    const hasError = !!fieldErrors[field.key];

    const baseInputClass = `
      w-full px-4 py-3 border rounded-lg 
      focus:ring-2 focus:outline-none
      transition-all duration-200
      ${hasError 
        ? 'border-red-300 dark:border-red-700 focus:ring-red-500 dark:focus:ring-red-400 focus:border-red-500 dark:focus:border-red-400 bg-red-50 dark:bg-red-900/10' 
        : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400'
      }
      bg-white dark:bg-gray-700
      text-gray-900 dark:text-gray-100
      placeholder-gray-400 dark:placeholder-gray-500
      disabled:bg-gray-100 dark:disabled:bg-gray-800
      disabled:text-gray-500 dark:disabled:text-gray-600
      disabled:cursor-not-allowed
    `;

    const labelClass = `
      block text-sm font-semibold mb-2
      ${hasError ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}
    `;

    return (
      <div key={field.key} className="space-y-2">
        <label htmlFor={fieldId} className={labelClass}>
          {field.label}
          {field.required && <span className="text-red-500 dark:text-red-400 ml-1 font-bold">*</span>}
        </label>

        {/* Field Description - with highlighted box for important clarifications */}
        {field.description && (
        <div className="flex items-start gap-2 !mb-2">
          <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-gray-600 dark:text-gray-400 ">
            {field.description}
          </p>
        </div>
        )}

        {/* Text Input */}
        {field.type === 'text' && (
          <input
            id={fieldId}
            type="text"
            value={value}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClass}
          />
        )}

        {/* Select Dropdown */}
        {field.type === 'select' && (
          <select
            id={fieldId}
            value={value}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
            className={baseInputClass}
          >
            <option value="" className="text-gray-500 dark:text-gray-400">
              {t('common.form.selectOption')}
            </option>
            {field.options.map(opt => (
              <option 
                key={opt.value} 
                value={opt.value}
                className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
              >
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {/* Textarea */}
        {field.type === 'textarea' && (
          <textarea
            id={fieldId}
            value={value}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            rows={field.rows || 3}
            className={baseInputClass}
          />
        )}

        {/* Checkbox Group */}
        {field.type === 'checkbox' && (
          <div className={`space-y-2.5 p-5 rounded-lg border ${
            hasError 
              ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10' 
              : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
          }`}>
            {field.options.map(option => {
              const isChecked = Array.isArray(value) && value.includes(option.value);
              return (
                <label
                  key={option.value}
                  className="flex items-center space-x-3 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => handleCheckboxChange(field.key, option.value, e.target.checked)}
                    className="w-4 h-4 text-blue-600 dark:text-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
                    {option.label}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {/* Error Message */}
        {hasError && (
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5 font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{fieldErrors[field.key]}</span>
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="h-full bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-blue-950 py-12">
      <div className="max-w-4xl mx-auto px-6">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {t('demographics.title')}
            </h1>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-full border border-blue-200 dark:border-blue-800">
              {t('demographics.progress.step', { current: safeStep + 1, total: steps.length })}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 shadow-inner">
            <div
              className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Error Message */}
        {demographicsError && (
          <div className="mb-6 p-5 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-400 rounded-r-xl shadow-sm">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-500 dark:text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-800 dark:text-red-300 text-sm font-medium">
                {demographicsError}
              </p>
            </div>
          </div>
        )}

        {/* Form Card - Matching Welcome Screen Style */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
          <form onSubmit={isLastStep ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
            {/* Form Content */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {currentStepData.title}
              </h2>
              {currentStepData.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                  {currentStepData.description}
                </p>
              )}

              <div className="space-y-6">
                {currentStepData.fields?.map(field => renderField(field))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={demographicsStep === 0}
                className={`
                  px-6 py-3 rounded-xl font-semibold transition-all duration-200
                  flex items-center gap-2 shadow-sm
                  ${demographicsStep === 0
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed border border-gray-200 dark:border-gray-700'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 hover:shadow-md'
                  }
                `}
              >
                <span>←</span>
                {t('common.navigation.previous')}
              </button>

              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  {demographicsStep === 0 && t('demographics.navigation.readyToStart')}
                  {demographicsStep > 0 && !isLastStep && t('demographics.navigation.continueWhenReady')}
                  {isLastStep && t('demographics.navigation.almostDone')}
                </p>
              </div>

              <button
                type="submit"
                className={`
                  px-6 py-3 rounded-xl font-semibold transition-all duration-200
                  flex items-center gap-2 shadow-md hover:shadow-lg transform hover:scale-105
                  ${isLastStep
                    ? 'bg-gradient-to-r from-green-600 to-green-500 dark:from-green-500 dark:to-green-400 hover:from-green-700 hover:to-green-600 dark:hover:from-green-600 dark:hover:to-green-500 text-white'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 text-white'
                  }
                `}
              >
                {isLastStep 
                  ? t('demographics.navigation.completeAndContinue')
                  : t('common.navigation.next')
                }
                <span>→</span>
              </button>
            </div>
          </form>

          {/* Privacy Note */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {t('demographics.privacyNote')}
              </p>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {interpolateComponents(
              t('demographics.requiredNote'),
              {
                ASTERISK: (<span className="text-red-500 dark:text-red-400">*</span> )
              }
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DemographicsQuestionnaire;