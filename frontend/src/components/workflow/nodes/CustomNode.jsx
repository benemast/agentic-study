// frontend/src/components/workflow/nodes/CustomNode.jsx
import React, { memo, useCallback, useMemo } from 'react';
import { Position } from 'reactflow';
import NodeHandle from './NodeHandle';
import { renderIcon, ICONS } from '../../../config/icons';
import { isNodeEditable } from '../../../config/nodeTemplates';
import { getColumnById } from '../../../config/columnConfig';
import { useTranslation } from '../../../hooks/useTranslation';

/**
 * Generate simplified settings text for display on node
 */
const generateSettingsText = (nodeType, config, t) => {
  if (!config) return null;

  switch (nodeType) {
    case 'filter-reviews': {
      const { field, operator, value } = config;
      if (!field || !operator || value === undefined || value === '') return null;
      
      const column = getColumnById(field);
      const columnLabel = column?.label || field;
      
      // Translate operator
      const operatorKey = `workflow.builder.nodes.settings.operators.signs.${operator}`;
      const operatorDisplay = t(operatorKey);
      
      // Format value for display
      const valueDisplay = typeof value === 'boolean' 
        ? (value ? t('common.form.yes') : t('common.form.no')) 
        : value;
      
      return t('workflow.builder.nodes.settings.filter', { 
        column: columnLabel, 
        operator: operatorDisplay, 
        value: valueDisplay 
      });
    }

    case 'sort-reviews': {
      const { sort_by, descending } = config;
      if (!sort_by) return null;
      
      const column = getColumnById(sort_by);
      const columnLabel = column?.label || sort_by;
      const direction = descending 
        ? t('workflow.builder.nodes.settings.descending.short') 
        : t('workflow.builder.nodes.settings.ascending.short');
      
      return t('workflow.builder.nodes.settings.sort', { column: columnLabel, direction });
    }

    case 'clean-data': {
      const { remove_nulls, remove_duplicates, normalize_text } = config;
      const actions = [];
      if (remove_nulls) actions.push(t('workflow.builder.nodes.settings.clean.removeNulls'));
      if (remove_duplicates) actions.push(t('workflow.builder.nodes.settings.clean.removeDuplicates'));
      if (normalize_text) actions.push(t('workflow.builder.nodes.settings.clean.normalizeText'));
      
      if (actions.length === 0) return null;
      return t('workflow.builder.nodes.settings.clean.label', { actions: actions.join(', ') });
    }

    case 'load-reviews': {
      const { category, limit } = config;
      if (!category) return null;
      
      const categoryKey = `workflow.builder.nodes.settings.load.${category}`;
      const categoryLabel = t(categoryKey);
      
      return limit 
        ? t('workflow.builder.nodes.settings.load.withLimit', { category: categoryLabel, limit })
        : t('workflow.builder.nodes.settings.load.noLimit', { category: categoryLabel });
    }

    case 'review-sentiment-analysis': {
      const { extract_themes, theme_separation, max_themes_per_category, include_percentages } = config;
      
      // Build summary of key settings
      const parts = [];
      
      if (extract_themes) {
        parts.push(t('workflow.builder.nodes.settings.sentiment.extractThemes'));
      }
      
      if (theme_separation === 'by_sentiment') {
        parts.push(t('workflow.builder.nodes.settings.sentiment.separatedBySentiment'));
      }
      
      if (max_themes_per_category) {
        parts.push(t('workflow.builder.nodes.settings.sentiment.maxThemes', { count: max_themes_per_category }));
      }
      
      if (include_percentages) {
        parts.push(t('workflow.builder.nodes.settings.sentiment.withPercentages'));
      }
      
      return parts.length > 0 ? parts.join(' • ') : null;
    }

    case 'generate-insights': {
      const { focus_area, max_recommendations } = config;
      
      // focus_area is now an array from multiselect
      if (!focus_area || (Array.isArray(focus_area) && focus_area.length === 0)) return null;
      
      const areas = Array.isArray(focus_area) ? focus_area : [focus_area];
      
      // Translate each focus area
      const areaLabels = areas.map(area => {
        const areaKey = `workflow.builder.nodes.settings.insights.${area}`;
        return t(areaKey);
      });
      
      // Join areas
      const areasText = areaLabels.join(', ');
      
      return max_recommendations 
        ? t('workflow.builder.nodes.settings.insights.withMax', { areas: areasText, max: max_recommendations })
        : areasText;
    }

    case 'show-results': {
      const { include_sections, statistics_metrics, show_visualizations, max_data_items } = config;
      
      // include_sections is an array from multiselect
      if (!include_sections || (Array.isArray(include_sections) && include_sections.length === 0)) {
        return null;
      }
      
      const sections = Array.isArray(include_sections) ? include_sections : [include_sections];
      
      // Translate section names
      const sectionLabels = sections.map(section => {
        const sectionKey = `workflow.builder.nodes.settings.results.sections.${section}`;
        return t(sectionKey);
      });
      
      const parts = [sectionLabels.join(', ')];
      
      // Add additional details
      if (sections.includes('statistics') && statistics_metrics && statistics_metrics.length > 0) {
        parts.push(t('workflow.builder.nodes.settings.results.withStats', { count: statistics_metrics.length }));
      }
      
      if (sections.includes('statistics') && show_visualizations) {
        parts.push(t('workflow.builder.nodes.settings.results.withCharts'));
      }
      
      if (sections.includes('data_preview') && max_data_items) {
        parts.push(t('workflow.builder.nodes.settings.results.maxItems', { max: max_data_items }));
      }
      
      return parts.join(' • ');
    }

    default:
      return null;
  }
};

const CustomNode = memo(({ data, selected, id }) => {
  const { t } = useTranslation();
  
  const { 
    label, 
    type, 
    color, 
    hasInput = 1, 
    hasOutput = 1, 
    iconName,
    config,
    template_id,
    connectionState = { isConnecting: false },
    currentEdges = [], 
    isValidConnection, 
    onDelete,
    onEdit,
    onViewResults,
    summaryAvailable = false,
    executionState = {}
  } = data;
  
  const {
    status,           // 'running', 'completed', 'error'
    hasExecuted
  } = executionState;

  // Check if this node type is editable
  const isEditable = template_id ? isNodeEditable(template_id) : true;

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    onDelete?.(id);
  }, [onDelete, id]);

  const handleEdit = useCallback((e) => {
    e.stopPropagation();
    onEdit?.(id);
  }, [onEdit, id]);

  // Handle viewing results
  const handleViewResults = useCallback((e) => {
    e.stopPropagation();
    if (onViewResults && hasExecuted) {
      onViewResults(id);
    }
  }, [onViewResults, id, hasExecuted]);

  const IconComponent = renderIcon(iconName, { size: 20, className: "text-white" });
  const EditIcon = ICONS.Edit3.component;
  const TrashIcon = ICONS.Trash2.component;
  
  // Generate settings text
  const settingsText = useMemo(() => {
    return generateSettingsText(template_id, config, t);
  }, [template_id, config, t]);

  const getHandleHighlight = useCallback((handleType, handleIndex) => {
    if (!connectionState.isConnecting) return 'normal';
    
    if (connectionState.sourceNodeId === id) {
      return handleType === 'source' ? 'source' : 'normal';
    }
    
    if (handleType === 'source') return 'normal';
    
    if (handleType === 'target') {
      const targetHandleId = `input-${handleIndex}`;
      
      const targetHandleConnections = currentEdges.filter(e => 
        e.target === id && (e.targetHandle || 'input-0') === targetHandleId
      );
      
      if (targetHandleConnections.length >= 1) return 'normal';
      
      const sourceHandleConnections = currentEdges.filter(e => 
        e.source === connectionState.sourceNodeId && 
        (e.sourceHandle || 'output-0') === connectionState.sourceHandleId
      );
      
      if (sourceHandleConnections.length >= 1) return 'normal';
      
      const mockConnection = {
        source: connectionState.sourceNodeId,
        target: id,
        sourceHandle: connectionState.sourceHandleId,
        targetHandle: targetHandleId
      };
      
      const isValid = isValidConnection?.(mockConnection);
      return isValid ? 'valid' : 'invalid';
    }
    
    return 'normal';
  }, [connectionState, id, currentEdges, isValidConnection]);

  const inputHandles = useMemo(() => {
    if (hasInput === 0) return null;
    
    return Array.from({ length: hasInput }).map((_, index) => {
      const highlight = getHandleHighlight('target', index);
      const isHighlighted = highlight === 'valid' || highlight === 'source';
      
      return (
        <NodeHandle
          key={`input-${index}`}
          type="target"
          position={Position.Top}
          id={`input-${index}`}
          index={index}
          total={hasInput}
          isHighlighted={isHighlighted}
          label={hasInput > 1 ? `In ${index + 1}` : undefined}
        />
      );
    });
  }, [hasInput, getHandleHighlight]);

  const outputHandles = useMemo(() => {
    if (hasOutput === 0) return null;
    
    return Array.from({ length: hasOutput }).map((_, index) => {
      const highlight = getHandleHighlight('source', index);
      const isHighlighted = highlight === 'source' || highlight === 'valid';
      
      return (
        <NodeHandle
          key={`output-${index}`}
          type="source"
          position={Position.Bottom}
          id={`output-${index}`}
          index={index}
          total={hasOutput}
          isHighlighted={isHighlighted}
          label={hasOutput > 1 ? `Out ${index + 1}` : undefined}
        />
      );
    });
  }, [hasOutput, getHandleHighlight]);

  // Node className - unchanged, no execution state styling
  const nodeClassName = useMemo(() => {
    return `group relative bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/50 border-2 transition-all duration-200 ${
      selected 
        ? 'border-blue-500 dark:border-blue-400 shadow-lg ring-2 ring-blue-200 dark:ring-blue-500/30' 
        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg'
    } min-w-[220px] max-w-[280px]`;
  }, [selected]);

  const hasValidTargets = useMemo(() => {
    if (!connectionState.isConnecting || connectionState.sourceNodeId === id) return false;
    
    return Array.from({ length: hasInput }).map((_, index) => {
      const mockConnection = {
        source: connectionState.sourceNodeId,
        target: id,
        sourceHandle: connectionState.sourceHandleId,
        targetHandle: `input-${index}`
      };
      return isValidConnection?.(mockConnection) || false;
    }).some(Boolean);
  }, [connectionState, id, hasInput, isValidConnection]);
  
  // Get status indicator styling
  const getStatusIndicator = () => {
    if (!hasExecuted) return null;
    
    let bgColor, borderColor, icon, tooltip;

    switch (status) {
      case 'running':
        bgColor = 'bg-gray-500';
        borderColor = 'border-gray-600';
        tooltip = 'Running...';
        icon = (
          <svg className="w-3 h-3 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
        break;
      case 'completed':
        bgColor = 'bg-green-500';
        borderColor = 'border-green-600';
        
        // Use summaryAvailable from props (available in outer scope)
        tooltip = summaryAvailable 
          ? 'Completed - Click to view summary'
          : 'Completed - Click to view results';
        
        icon = (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
        break;
      case 'error':
        bgColor = 'bg-red-500';
        borderColor = 'border-red-600';
        tooltip = 'Failed - Click to view error details';
        icon = (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
        break;
      default:
        return null;
    }
    
    return (
      <button
        onClick={handleViewResults}
        className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 ${bgColor} ${borderColor} shadow-lg hover:scale-110 transition-transform duration-200 flex items-center justify-center z-10 cursor-pointer`}
        title={tooltip}
        disabled={status === 'running'}
      >
        {icon}
      </button>
    );
  };

  return (
    <div className={nodeClassName}>
      {connectionState.isConnecting && hasValidTargets && (
        <div className="absolute inset-0 rounded-lg border-2 border-green-400 dark:border-green-300 bg-green-100 dark:bg-green-900/30 bg-opacity-20 animate-pulse pointer-events-none" />
      )}
      
      {/* Status indicator on left border */}
      {getStatusIndicator()}
      
      {inputHandles}
      
      <div className={`absolute -top-2 -right-2 flex gap-1 transition-opacity duration-200 ${
        selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}>
        {/* Only show edit button if node is editable */}
        {isEditable && (
        <button
          onClick={handleEdit}
          className="flex items-center justify-center w-6 h-6 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-full shadow-lg dark:shadow-gray-900/50 transition-all duration-200 hover:scale-110"
          title="Edit node"
        >
          <EditIcon size={13} />
        </button>
        )}
        <button
          onClick={handleDelete}
          className="flex items-center justify-center w-6 h-6 bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 text-white rounded-full shadow-lg dark:shadow-gray-900/50 transition-all duration-200 hover:scale-110"
          title="Delete node"
        >
          <TrashIcon size={13} />
        </button>
      </div>
      
      <div className="p-3">
        {/* Header with Icon and Title */}
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-1.5 rounded-lg ${color} transition-all duration-200 flex-shrink-0 ${
            connectionState.isConnecting && hasValidTargets ? 'ring-2 ring-green-300 dark:ring-green-400' : ''
          }`}>
            {IconComponent}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight truncate">
              {label}
            </h3>
          </div>
        </div>
        
        {/* Settings Display - Directly under title */}
        {settingsText && (
          <div className="mt-2 px-2 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-xs text-blue-900 dark:text-blue-200 font-medium leading-relaxed">
              {settingsText}
            </p>
          </div>
        )}
        
        {/* No settings configured message */}
        {!settingsText && (
          <div className="mt-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-md">
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
              {t('workflow.builder.nodes.settings.notConfigured')}
            </p>
          </div>
        )}
      </div>
      
      {outputHandles}
    </div>
  );
});

CustomNode.displayName = 'CustomNode';
export default CustomNode;