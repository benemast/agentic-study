// frontend/src/components/WorkflowToolbar.jsx
import React, { memo } from 'react';
import { ICONS } from '../constants/icons';

const WorkflowToolbar = memo(({ 
  nodes, 
  edges, 
  workflowValidation,
  onExecute,
  onSave,
  onClear
}) => {
  const SaveIcon = ICONS.Save.component;
  const RotateIcon = ICONS.RotateCcw.component;
  const SettingsIcon = ICONS.Settings.component;
  const PlayIcon = ICONS.Play.component;

  return (
    <div className="absolute top-0 left-0 right-0 z-10 bg-white border-b border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-800">Research Workflow</h1>
          <span className="text-sm text-gray-500">
            {nodes.length} nodes, {edges.length} connections
          </span>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
            workflowValidation.isValid 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              workflowValidation.isValid ? 'bg-green-500' : 'bg-yellow-500'
            }`} />
            {workflowValidation.message}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onSave}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <SaveIcon size={16} />
            Save
          </button>
          <button 
            onClick={onClear}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <RotateIcon size={16} />
            Clear
          </button>              
          <button className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors">
            <SettingsIcon size={16} />
            Settings
          </button>
          <button
            onClick={onExecute}                
            disabled={!workflowValidation.isValid}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              workflowValidation.isValid 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={workflowValidation.details}
          >
            <PlayIcon size={16} />
            Execute
          </button>
        </div>
      </div>
    </div>
  );
});

WorkflowToolbar.displayName = 'WorkflowToolbar';
export default WorkflowToolbar;