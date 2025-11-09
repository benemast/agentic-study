// frontend/src/components/workflow/nodes/NodeEditor.jsx

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { X as XIcon, Info as InfoIcon, Lock as LockIcon, ChevronDown, ChevronRight, AlertTriangle as AlertTriangleIcon } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { getWorkflowFilterableColumns, getWorkflowSortableColumns } from '../../../config/columnConfig';
import { validateNodeOptionDependencies } from '../../../utils/nodeDependencyValidator';

const NodeEditor = memo(({ node, isOpen, onClose, onSave, nodes, edges }) => {
  const { t } = useTranslation();
  const [currentConfig, setCurrentConfig] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [collapsedSections, setCollapsedSections] = useState({});
  
  // Get option dependency validations and node-level warnings
  const validationResult = useMemo(() => 
    validateNodeOptionDependencies(node, nodes, edges),
    [node, nodes, edges]
  );
  
  const optionValidations = validationResult?.validations || {};
  const nodeWarnings = validationResult?.nodeWarnings || [];

  // Extract config schema and current config from node
  const configSchema = useMemo(() => node?.data?.configSchema || [], [node]);
  const nodeLabel = useMemo(() => node?.data?.label || '', [node]);
  const nodeDescription = useMemo(() => node?.data?.description || '', [node]); 
  const shouldTranslate = useCallback((str) => {
    return typeof str === 'string' && str.includes('.');
  }, []);

  // Initialize config from node data
  useEffect(() => {
    if (node?.data?.config) {
      setCurrentConfig(node.data.config);
    }
  }, [node]);

  // ============================================
  // FIELD VISIBILITY & DEPENDENCY LOGIC
  // ============================================
  
  /**
   * Get dependency state for a specific option
   * Returns: { disabled, warning, message }
   */
  const getOptionDependencyState = useCallback((fieldKey, optionValue) => {
    const validationKey = `${fieldKey}.${optionValue}`;
    const validation = optionValidations[validationKey];
    
    if (!validation || validation.isValid) {
      return { disabled: false, warning: false, message: null };
    }
    
    // Build message about missing nodes
    const missingNodeLabels = validation.missingNodes
      .map(nodeId => t(`workflow.builder.nodes.${nodeId}.label`) || nodeId)
      .join(', ');
    
    const message = t('workflow.builder.nodeEditor.dependencyMissing', { 
      nodes: missingNodeLabels 
    }) || `Requires: ${missingNodeLabels}`;
    
    return {
      disabled: validation.lockType === 'disable',
      warning: validation.lockType === 'warning',
      message
    };
  }, [optionValidations, t]);
  
  /**
   * Check if a field should be visible based on dependsOn
   * Examples:
   * - dependsOn: 'field' → visible if config.field has value
   * - dependsOn: 'include_sections.statistics' → visible if 'statistics' is in include_sections array
   */
  const isFieldVisible = useCallback((field) => {
    if (!field.dependsOn) return true;

    const dependency = field.dependsOn;
    
    // Handle nested dependencies (e.g., 'include_sections.statistics')
    if (dependency.includes('.')) {
      const [parentKey, requiredValue] = dependency.split('.');
      const parentValue = currentConfig[parentKey];
      
      // Check if array includes the required value
      if (Array.isArray(parentValue)) {
        return parentValue.includes(requiredValue);
      }
      
      return false;
    }
    
    // Simple dependency - just check if parent field has a value
    const parentValue = currentConfig[dependency];
    return parentValue !== null && parentValue !== undefined && parentValue !== '';
  }, [currentConfig]);

  // ============================================
  // GROUP FIELDS BY DEPENDENCY
  // ============================================
  
  /**
   * Group fields into sections:
   * - main: Independent fields (no dependsOn)
   * - sections: Dependent fields grouped by their parent
   */
  const fieldGroups = useMemo(() => {
    const main = [];
    const sections = {};

    configSchema.forEach(field => {
      if (!field.dependsOn) {
        // Independent field
        main.push(field);
      } else {
       // Dependent field - group by full dependency path
        // For 'include_sections.statistics' and 'include_sections.data_preview',
        // create separate sections
        const sectionKey = field.dependsOn;
        
        if (!sections[sectionKey]) {
          sections[sectionKey] = [];
        }
        sections[sectionKey].push(field);
      }
    });

    return { main, sections };
  }, [configSchema]);

  // ============================================
  // DYNAMIC FIELD TYPE & OPTIONS
  // ============================================
  
  const getDynamicFieldType = useCallback((field) => {
    if (field.type !== 'dynamic') return field.type;

    // For filter-reviews: value field depends on selected field's dataType
    if (field.key === 'value' && field.dependsOn === 'field') {
      const selectedFieldId = currentConfig.field;
      if (!selectedFieldId) return 'text';

      // Get the dataType from the selected column
      const columns = getWorkflowFilterableColumns();
      const selectedColumn = columns.find(col => col.id === selectedFieldId);
      
      if (selectedColumn?.dataType === 'int64') return 'number';
      if (selectedColumn?.dataType === 'boolean') return 'boolean';
      return 'text';
    }

    return 'text';
  }, [currentConfig]);

  /**
   * Get dynamic options when options is 'dynamic'
   * Based on selected field's dataType
   */
  const getDynamicOptions = useCallback((field) => {
    if (field.options !== 'dynamic') return null;

    // For filter-reviews: operator field depends on selected field's dataType
    if (field.key === 'operator' && field.dependsOn === 'field') {
      const selectedFieldId = currentConfig.field;
      if (!selectedFieldId) return [];

      const columns = getWorkflowFilterableColumns();
      const selectedColumn = columns.find(col => col.id === selectedFieldId);
      const dataType = selectedColumn?.dataType || 'string';

      // Return operators based on dataType
      const operators = {
        'string': [
          { value: 'equals', label: t('workflow.builder.nodes.settings.operators.text.equals') },
          { value: 'not_equals', label: t('workflow.builder.nodes.settings.operators.text.not_equals') },
          { value: 'contains', label: t('workflow.builder.nodes.settings.operators.text.contains') },
          { value: 'not_contains', label: t('workflow.builder.nodes.settings.operators.text.not_contains') },
          { value: 'starts_with', label: t('workflow.builder.nodes.settings.operators.text.starts_with') },
          { value: 'ends_with', label: t('workflow.builder.nodes.settings.operators.text.ends_with') }
        ],
        'int64': [
          { value: 'equals', label: t('workflow.builder.nodes.settings.operators.text.equals') },
          { value: 'not_equals', label: t('workflow.builder.nodes.settings.operators.text.not_equals') },
          { value: 'greater', label: t('workflow.builder.nodes.settings.operators.text.greater') },
          { value: 'greater_or_equal', label: t('workflow.builder.nodes.settings.operators.text.greater_or_equal') },
          { value: 'less', label: t('workflow.builder.nodes.settings.operators.text.less') },
          { value: 'less_or_equal', label: t('workflow.builder.nodes.settings.operators.text.less_or_equal') }
        ],
        'boolean': [
          { value: 'equals', label: t('workflow.builder.nodes.settings.operators.text.is') }
        ]
      };

      return operators[dataType] || operators['string'];
    }

    return [];
  }, [currentConfig, t]);

  /**
   * Resolve options - handle functions, dynamic, and static arrays
   */
  const resolveOptions = useCallback((field) => {
    // Dynamic options based on other field values
    if (field.options === 'dynamic') {
      return getDynamicOptions(field);
    }

    // Function options (e.g., () => getWorkflowFilterableColumns())
    if (typeof field.options === 'function') {
      return field.options();
    }

    // Static array options
    return field.options || [];
  }, [getDynamicOptions]);

  // ============================================
  // FIELD VALUE HANDLERS
  // ============================================
  
  const handleConfigChange = useCallback((key, value) => {
    setCurrentConfig(prev => ({
      ...prev,
      [key]: value
    }));

    // Clear validation error for this field
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });
  }, []);

  const handleMultiselectChange = useCallback((key, optionValue, isChecked) => {
    setCurrentConfig(prev => {
      const currentValues = prev[key] || [];
      const newValues = isChecked
        ? [...currentValues, optionValue]
        : currentValues.filter(v => v !== optionValue);
      
      return {
        ...prev,
        [key]: newValues
      };
    });

    // Clear validation error
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });
  }, []);

  // ============================================
  // SECTION COLLAPSE TOGGLE
  // ============================================
  
  const toggleSection = useCallback((sectionKey) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  }, []);

  // ============================================
  // VALIDATION
  // ============================================
  
  const validateConfig = useCallback(() => {
    const errors = {};
    
    configSchema.forEach(field => {
      // Skip validation for hidden fields
      if (!isFieldVisible(field)) return;

      if (field.required) {
        const value = currentConfig[field.key];
        
        // Check if value is missing or empty
        if (value === undefined || value === null) {
          errors[field.key] = t('common.validation.required');
        } else if (typeof value === 'string' && value.trim() === '') {
          errors[field.key] = t('common.validation.required');
        }
        
        // Additional validation for arrays (multiselect)
        if (field.type === 'multiselect' && Array.isArray(value) && value.length === 0) {
          errors[field.key] = t('common.validation.required');
        }
      }
      
      // Min/Max validation for numbers
      const fieldType = getDynamicFieldType(field);
      if (fieldType === 'number') {
        const value = currentConfig[field.key];
        if (value !== undefined && value !== null && value !== '') {
          const numValue = typeof value === 'string' ? parseFloat(value) : value;
          if (!isNaN(numValue)) {
            if (field.min !== undefined && numValue < field.min) {
              errors[field.key] = t('common.validation.minNum', { min: field.min });
            }
            if (field.max !== undefined && numValue > field.max) {
              errors[field.key] = t('common.validation.maxNum', { max: field.max });
            }
          }
        }
      }
    });
    
    return errors;
  }, [configSchema, currentConfig, isFieldVisible, getDynamicFieldType, t]);

  // ============================================
  // SAVE HANDLER
  // ============================================
  
  const handleSave = useCallback(() => {
    const errors = validateConfig();
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Save the updated node
    const updatedNode = {
      ...node,
      data: {
        ...node.data,
        config: currentConfig
      }
    };

    onSave(updatedNode);
    onClose();
  }, [node, currentConfig, validateConfig, onSave, onClose]);

  // ============================================
  // TOOLTIP COMPONENT FOR OPTION HELP
  // ============================================
  
  const OptionHelpTooltip = memo(({ help }) => {
    const [showTooltip, setShowTooltip] = useState(false);

    if (!help) return null;

    return (
      <div className="relative inline-block ml-2">
        <InfoIcon 
          className="w-3 h-3 text-gray-400 hover:text-blue-500 cursor-help transition-colors"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        />
        {showTooltip && (
          <div className="absolute left-0 top-full mt-1 z-50 w-64 p-2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded shadow-lg border border-gray-700">
            <div className="absolute -top-1 left-2 w-2 h-2 bg-gray-900 dark:bg-gray-800 transform rotate-45 border-l border-t border-gray-700"></div>
            {t(help)}
          </div>
        )}
      </div>
    );
  });

  OptionHelpTooltip.displayName = 'OptionHelpTooltip';

  // ============================================
  // CHECK IF ANY FIELDS ARE LOCKED
  // ============================================
  
  const hasLockedFields = useMemo(() => {
    return configSchema.some(field => field.locked && isFieldVisible(field));
  }, [configSchema, isFieldVisible]);

  // ============================================
  // RENDER FIELD COMPONENTS
  // ============================================
  
  const renderField = useCallback((field) => {
    // Check visibility
    if (!isFieldVisible(field)) return null;

    const value = currentConfig[field.key];
    const error = validationErrors[field.key];
    const fieldType = getDynamicFieldType(field);
    const options = resolveOptions(field);
    const isLocked = field.locked || false;

    const fieldLabel = t(field.label);
    const fieldHelp = field.help ? t(field.help) : null;
    const fieldPlaceholder = field.placeholder ? t(field.placeholder) : null;

    const baseInputClass = `w-full px-3 py-2 border rounded-lg transition-colors ${
      error 
        ? 'border-red-500 focus:ring-red-500' 
        : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
    } ${
      isLocked 
        ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' 
        : 'bg-white dark:bg-gray-900'
    } focus:ring-2 focus:border-transparent dark:text-gray-100`;

    return (
      <div key={field.key} className="space-y-2">
        {/* Label */}
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {fieldLabel}
            {field.required && <span className="text-red-500 ml-1">*</span>}
            {isLocked && <LockIcon className="inline ml-2 w-3 h-3 text-gray-400 dark:text-gray-500" />}
          </label>
        </div>

        {/* Help Text */}
        {fieldHelp && (
          <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
            <InfoIcon className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>{fieldHelp}</span>
          </div>
        )}

        {/* Text Input */}
        {fieldType === 'text' && (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleConfigChange(field.key, e.target.value)}
            disabled={isLocked}
            placeholder={fieldPlaceholder}
            className={baseInputClass}
          />
        )}

        {/* Number Input */}
        {fieldType === 'number' && (
          <input
            type="number"
            value={value === null || value === undefined ? '' : value}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                handleConfigChange(field.key, null);
              } else {
                const numVal = parseFloat(val);
                handleConfigChange(field.key, isNaN(numVal) ? null : numVal);
              }
            }}
            disabled={isLocked}
            min={field.min}
            max={field.max}
            step={field.step || 1}
            placeholder={fieldPlaceholder}
            className={baseInputClass}
          />
        )}

        {/* Boolean Input */}
        {fieldType === 'boolean' && (
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleConfigChange(field.key, e.target.checked)}
              disabled={isLocked}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">
              {fieldPlaceholder || t('common.form.enable')}
            </span>
          </label>
        )}

        {/* Select Dropdown */}
        {field.type === 'select' && (
          <select
            value={value === null || value === undefined ? '' : String(value)}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                handleConfigChange(field.key, null);
                return;
              }
              // Parse boolean values
              if (val === 'true') return handleConfigChange(field.key, true);
              if (val === 'false') return handleConfigChange(field.key, false);
              // Try to find option to get proper type
              const option = options.find(opt => String(opt.value) === val);
              handleConfigChange(field.key, option?.value ?? val);
            }}
            disabled={isLocked}
            className={baseInputClass}
          >
            <option value="">
              {fieldPlaceholder || t('common.form.selectOption')}
            </option>
            {options.map(opt => (
              <option key={String(opt.value)} value={String(opt.value)}>
                {shouldTranslate(opt.label) ? t(opt.label) : opt.label}
              </option>
            ))}
          </select>
        )}

        {/* Multiselect */}
        {field.type === 'multiselect' && (
          <div className="space-y-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 max-h-60 overflow-y-auto">
            {options.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No options available</p>
            ) : (
              options.map(opt => {
                const depState = getOptionDependencyState(field.key, opt.value);
                const isChecked = (value || []).includes(opt.value);
                const isDisabled = isLocked || depState.disabled;
                
                return (
                  <label 
                    key={opt.value} 
                    className={`flex items-start space-x-2 p-2 rounded transition-colors ${
                      isDisabled 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => handleMultiselectChange(field.key, opt.value, e.target.checked)}
                      disabled={isDisabled}
                      className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {shouldTranslate(opt.label) ? t(opt.label) : opt.label}
                        </span>
                        {depState.warning && (
                          <div className="relative group">
                            <AlertTriangleIcon className="w-4 h-4 text-amber-500" />
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64">
                              <div className="bg-amber-50 dark:bg-amber-900/90 text-amber-900 dark:text-amber-100 text-xs rounded-lg p-2 shadow-lg border border-amber-200 dark:border-amber-700">
                                {depState.message}
                              </div>
                            </div>
                          </div>
                        )}
                        {depState.disabled && (
                          <div className="relative group">
                            <LockIcon className="w-3 h-3 text-gray-400" />
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64">
                              <div className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-lg p-2 shadow-lg border border-gray-200 dark:border-gray-600">
                                {depState.message}
                              </div>
                            </div>
                          </div>
                        )}
                        <OptionHelpTooltip help={opt.help} />
                      </div>
                      {/* Show help text inline if no hover tooltip (fallback) */}
                      {!opt.help && opt.description && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {shouldTranslate(opt.description) ? t(opt.description) : opt.description}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })
            )}
          </div>
        )}

        {/* Validation Error */}
        {error && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}
      </div>
    );
  }, [
    currentConfig,
    validationErrors,
    isFieldVisible,
    getDynamicFieldType,
    resolveOptions,
    handleConfigChange,
    handleMultiselectChange,
    shouldTranslate,
    t
  ]);

  // ============================================
  // RENDER DEPENDENT SECTION
  // ============================================
  
  const renderDependentSection = useCallback((sectionKey, fields) => {
    // Check if any field in this section is visible
    const hasVisibleFields = fields.some(field => isFieldVisible(field));
    
    if (!hasVisibleFields) return null;

    // Generate section label based on dependency type
    let sectionLabel = sectionKey;
    
    if (sectionKey.includes('.')) {
      // Nested dependency like 'include_sections.statistics' or 'include_sections.data_preview'
      const [parentKey, dependencyValue] = sectionKey.split('.');
      
      // Find parent field
      const parentField = configSchema.find(f => f.key === parentKey);
      
      if (parentField && parentField.options && Array.isArray(parentField.options)) {
        // Find the specific option that matches the dependency value
        const matchingOption = parentField.options.find(opt => opt.value === dependencyValue);
        if (matchingOption) {
          sectionLabel = t(matchingOption.label);
        }
      }
    } else {
      // Simple dependency - use parent field label
      const parentField = configSchema.find(f => f.key === sectionKey);
      if (parentField) {
        sectionLabel = t(parentField.label);
      }
    }
    
    const isCollapsed = collapsedSections[sectionKey];

    return (
      <div key={sectionKey} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {/* Section Header */}
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            )}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {sectionLabel} {t('workflow.builder.nodeEditor.options') || 'Options'}
            </span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {fields.filter(f => isFieldVisible(f)).length} {t('workflow.builder.nodeEditor.fields') || 'fields'}
          </span>
        </button>

        {/* Section Content */}
        {!isCollapsed && (
          <div className="p-4 space-y-4 bg-white dark:bg-gray-900">
            {fields.map(renderField)}
          </div>
        )}
      </div>
    );
  }, [configSchema, collapsedSections, isFieldVisible, toggleSection, renderField, t]);

  // ============================================
  // RENDER MODAL
  // ============================================
  
  if (!isOpen || !node) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {t('workflow.builder.nodeEditor.title')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{nodeLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Description */}
        {nodeDescription && (
          <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">{nodeDescription}</p>
          </div>
        )}

        {/* Locked Fields Notice */}
        {hasLockedFields && (
          <div className="px-6 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <LockIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-200">
                {t('workflow.builder.nodeEditor.noConfig') || 'Some settings are locked for this task and cannot be changed. These are pre-configured to ensure the task works correctly.'}
              </p>
            </div>
          </div>
        )}

        {/* Node-level Warnings */}
        {nodeWarnings && nodeWarnings.length > 0 && (
          <div className="px-6 py-3 space-y-2">
            {nodeWarnings.map((warning, index) => {
              const bgColor = warning.severity === 'warning' 
                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700' 
                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700';
              const textColor = warning.severity === 'warning'
                ? 'text-amber-800 dark:text-amber-200'
                : 'text-blue-800 dark:text-blue-200';
              const iconColor = warning.severity === 'warning'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-blue-600 dark:text-blue-400';
              
              return (
                <div key={index} className={`flex items-start gap-2 p-3 rounded-lg border ${bgColor}`}>
                  <AlertTriangleIcon className={`w-4 h-4 ${iconColor} mt-0.5 flex-shrink-0`} />
                  <p className={`text-xs ${textColor}`}>
                    {warning.message}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Config Fields - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {configSchema.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              {t('workflow.builder.nodeEditor.noConfig') || 'No configuration options available'}
            </p>
          ) : (
            <>
              {/* Main Fields (no dependencies) */}
              {fieldGroups.main.length > 0 && (
                <div className="space-y-4">
                  {fieldGroups.main.map(renderField)}
                </div>
              )}

              {/* Dependent Sections */}
              {Object.entries(fieldGroups.sections).map(([sectionKey, fields]) =>
                renderDependentSection(sectionKey, fields)
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {Object.keys(validationErrors).length > 0 && (
              <span className="text-red-500 dark:text-red-400">
                {t('workflow.builder.nodeEditor.fixErrors', { count: Object.keys(validationErrors).length }) || 
                 `Please fix ${Object.keys(validationErrors).length} error(s)`}
              </span>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 font-medium transition-colors"
            >
              {t('workflow.builder.nodeEditor.cancel')}
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 font-medium transition-colors"
            >
              {t('workflow.builder.nodeEditor.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

NodeEditor.displayName = 'NodeEditor';
export default NodeEditor;