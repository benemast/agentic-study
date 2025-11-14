// frontend/src/components/workflow/WorkflowToolbar.jsx
import React, { memo, useMemo } from 'react';
import { ICONS } from '../../config/icons';
import { useTranslation } from '../../hooks/useTranslation';

const WorkflowToolbar = memo(({ 
  nodes = [],
  edges = [],
  workflowValidation = { isValid: false, message: '', details: '' },
  executionStatus,
  onExecute,
  onSave,
  onClear
}) => {
  const { t } = useTranslation();
  
  const RotateIcon = ICONS.RotateCcw.component;
  const PlayIcon = ICONS.Play.component;

  // Computed + memoized status message (Option 3)
  const statusMessage = useMemo(() => {
    
    if (!workflowValidation.isValid) {
      // Map specific validation messages
      if (workflowValidation.message === 'Missing input node') {
        return t('workflow.builder.status.missingInput');
      }
      if (workflowValidation.message === 'Missing output node') {
        return t('workflow.builder.status.missingOutput');
      }
      if (workflowValidation.message === 'No connections') {
        return t('workflow.builder.status.noConnections');
      }
      if (workflowValidation.message === 'Incomplete workflow') {
        return t('workflow.builder.status.incompleteWorkflow');
      }
      return workflowValidation.message; // Fallback to original
    }

    // 1) Execution-related messages (override validation messages)
    if (executionStatus === 'running') {
      return t('workflow.builder.status.running');
    }

    if (executionStatus === 'completed') {
      return t('workflow.builder.status.completed');
    }

    if (executionStatus === 'error') {
      return t('workflow.builder.status.error');
    }

    // 2) Fallback to original validation-based logic
    if (nodes.length === 0) {
      return t('workflow.builder.status.emptyWorkflow');
    }

    return t('workflow.builder.status.ready');
  }, [executionStatus, nodes, workflowValidation, t]);

  // Color config for the status indicator (red on error, else green/yellow)
  const statusColor = executionStatus === 'error'
    ? {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-300',
        border: 'border-red-200 dark:border-red-700',
        dot: 'bg-red-500 dark:bg-red-400'
      }
    : workflowValidation.isValid
      ? {
          bg: 'bg-green-100 dark:bg-green-900/30',
          text: 'text-green-700 dark:text-green-300',
          border: 'border-green-200 dark:border-green-700',
          dot: 'bg-green-500 dark:bg-green-400'
        }
      : {
          bg: 'bg-yellow-100 dark:bg-yellow-900/30',
          text: 'text-yellow-700 dark:text-yellow-300',
          border: 'border-yellow-200 dark:border-yellow-700',
          dot: 'bg-yellow-500 dark:bg-yellow-400'
        };

  const getStatusDetails = () => {
    if (nodes.length === 0) return t('workflow.builder.statusDetails.addNodes');
    if (!workflowValidation.isValid) {
      // Map specific validation details
      if (workflowValidation.details === 'Add a data input node to start your workflow') {
        return t('workflow.builder.statusDetails.addInput');
      }
      if (workflowValidation.details === 'Add an output node to complete your workflow') {
        return t('workflow.builder.statusDetails.addOutput');
      }
      if (workflowValidation.details === 'Connect your nodes to create a workflow path') {
        return t('workflow.builder.statusDetails.connectNodes');
      }
      if (workflowValidation.details === 'Create a path from input to output nodes') {
        return t('workflow.builder.statusDetails.createPath');
      }
      if (workflowValidation.details.includes('nodes connected properly')) {
        const nodeCount = workflowValidation.details.match(/\d+/)?.[0] || '0';
        return t('workflow.builder.statusDetails.nodesConnected', { count: nodeCount });
      }
      return workflowValidation.details;
    }
    const nodeCount = nodes.length;
    return t('workflow.builder.statusDetails.nodesConnected', { count: nodeCount });
  };

  const isExecuteDisabled = !workflowValidation.isValid || executionStatus === 'running';

  return (
    <div 
      data-tour="workflow-toolbar"
      className="absolute top-0 left-0 right-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm"
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* Status Indicator */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
              ${statusColor.bg} ${statusColor.text} ${statusColor.border}
            `}
          >
            <div className={`w-2 h-2 rounded-full ${statusColor.dot}`} />
            {statusMessage}
          </div>
        </div>

        <div className="flex items-center gap-2">  
          <button 
            onClick={onClear}
            className="clear-button flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={t('workflow.builder.toolbar.clear')}
          >
            <RotateIcon size={16} />
            {t('workflow.builder.toolbar.clear')}
          </button>
          
          <button
            data-tour="execute-workflow-button"
            onClick={onExecute}
            disabled={isExecuteDisabled}
            className={`execute-button flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isExecuteDisabled
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
            }`}
            title={getStatusDetails()}
          >
            <PlayIcon size={16} />
            {t('workflow.builder.toolbar.execute')}
          </button>
        </div>
      </div>
    </div>
  );
});

WorkflowToolbar.displayName = 'WorkflowToolbar';
export default WorkflowToolbar;
