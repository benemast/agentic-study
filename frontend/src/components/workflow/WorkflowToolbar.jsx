// frontend/src/components/WorkflowToolbar.jsx
import React, { memo } from 'react';
import { Play as PlayIcon, Save as SaveIcon, RotateCcw as RotateIcon, Settings as SettingsIcon } from 'lucide-react';
import { ICONS } from '../../constants/icons';
import { useTranslation } from '../../hooks/useTranslation';

const WorkflowToolbar = memo(({ 
  nodes = [],
  edges = [],
  workflowValidation = { isValid: false, message: '', details: '' },
  onExecute,
  onSave,
  onClear
}) => {
  const { t } = useTranslation();
  
  const SaveIcon = ICONS.Save.component;
  const RotateIcon = ICONS.RotateCcw.component;
  const SettingsIcon = ICONS.Settings.component;
  const PlayIcon = ICONS.Play.component;

  // Get translated status message
  const getStatusMessage = () => {
    if (nodes.length === 0) return t('workflow.builder.status.emptyWorkflow');
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
    return t('workflow.builder.status.ready');
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
        const nodeCount = workflowValidation.details.match(/\d+/)?.[0] || nodes.length;
        return t('workflow.builder.statusDetails.nodesConnected', { count: nodeCount });
      }
      return workflowValidation.details;
    }
    const nodeCount = nodes.length;
    return t('workflow.builder.statusDetails.nodesConnected', { count: nodeCount });
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {t('workflow.builder.title')}
          </h1>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {nodes.length} nodes, {edges.length} connections
          </span>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
            workflowValidation.isValid 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700' 
              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              workflowValidation.isValid 
                ? 'bg-green-500 dark:bg-green-400' 
                : 'bg-yellow-500 dark:bg-yellow-400'
            }`} />
            {getStatusMessage()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onSave}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={t('workflow.builder.toolbar.save')}
          >
            <SaveIcon size={16} />
            {t('workflow.builder.toolbar.save')}
          </button>
          <button 
            onClick={onClear}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={t('workflow.builder.toolbar.clear')}
          >
            <RotateIcon size={16} />
            {t('workflow.builder.toolbar.clear')}
          </button>              
          <button 
            className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={t('workflow.builder.toolbar.settings')}
          >
            <SettingsIcon size={16} />
            {t('workflow.builder.toolbar.settings')}
          </button>
          <button
            onClick={onExecute}                
            disabled={!workflowValidation.isValid}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              workflowValidation.isValid 
                ? 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600' 
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
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