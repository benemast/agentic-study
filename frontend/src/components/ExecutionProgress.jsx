// frontend/src/components/ExecutionProgress.jsx
import React from 'react';
import { Play, Check, X, Loader, Brain, ArrowRight } from 'lucide-react';

/**
 * Real-time execution progress display
 * Shows live updates from workflow/agent execution
 */
export const ExecutionProgress = ({ 
  status, 
  progress = [], 
  progressPercentage = 0,
  currentStep,
  condition,
  onCancel 
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'running':
      case 'starting':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-gray-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
      case 'starting':
        return <Loader className="w-5 h-5 animate-spin" />;
      case 'completed':
        return <Check className="w-5 h-5" />;
      case 'failed':
      case 'cancelled':
        return <X className="w-5 h-5" />;
      default:
        return <Play className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`${getStatusColor()} text-white p-2 rounded-lg`}>
            {getStatusIcon()}
          </div>
          <div>
            <h3 className="text-lg font-semibold capitalize">{status}</h3>
            <p className="text-sm text-gray-600">
              {condition === 'workflow_builder' ? 'Workflow Execution' : 'AI Assistant Task'}
            </p>
          </div>
        </div>
        
        {status === 'running' && onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {(status === 'running' || status === 'starting') && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Current Step */}
      {currentStep && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              {condition === 'workflow_builder' 
                ? `Executing: ${currentStep.label || currentStep.nodeId}`
                : `Agent: ${currentStep.action || 'Processing...'}`
              }
            </span>
          </div>
          {currentStep.step && (
            <p className="text-xs text-blue-700 mt-1">Step {currentStep.step}</p>
          )}
        </div>
      )}

      {/* Progress Timeline */}
      <div className="max-h-64 overflow-y-auto space-y-2">
        {(progress || []).map((item, index) => (
          <ProgressItem 
            key={index} 
            item={item} 
            condition={condition}
            isLatest={index === (progress?.length || 0) - 1}
          />
        ))}
      </div>

      {/* Empty State */}
      {(!progress || progress.length === 0) && status === 'idle' && (
        <div className="text-center text-gray-500 py-8">
          <p>No execution in progress</p>
        </div>
      )}
    </div>
  );
};

/**
 * Individual progress item
 */
const ProgressItem = ({ item, condition, isLatest }) => {
  const getItemDisplay = () => {
    if (condition === 'workflow_builder') {
      switch (item.type) {
        case 'node_start':
          return {
            icon: <ArrowRight className="w-4 h-4" />,
            text: `Started: ${item.nodeLabel || item.nodeId}`,
            color: 'text-blue-600 bg-blue-50'
          };
        case 'node_complete':
          return {
            icon: <Check className="w-4 h-4" />,
            text: `Completed: ${item.nodeId}`,
            color: 'text-green-600 bg-green-50'
          };
        default:
          return {
            icon: <ArrowRight className="w-4 h-4" />,
            text: 'Processing...',
            color: 'text-gray-600 bg-gray-50'
          };
      }
    } else {
      // AI Assistant
      switch (item.type) {
        case 'agent_decision':
          return {
            icon: <Brain className="w-4 h-4" />,
            text: `Decision: ${item.action}`,
            detail: item.reasoning,
            color: 'text-purple-600 bg-purple-50'
          };
        case 'tool_execution':
          return {
            icon: <ArrowRight className="w-4 h-4" />,
            text: `Executing: ${item.tool}`,
            color: 'text-blue-600 bg-blue-50'
          };
        default:
          return {
            icon: <ArrowRight className="w-4 h-4" />,
            text: 'Processing...',
            color: 'text-gray-600 bg-gray-50'
          };
      }
    }
  };

  const display = getItemDisplay();

  return (
    <div className={`flex items-start gap-3 p-2 rounded-lg ${display.color} ${isLatest ? 'ring-2 ring-blue-300' : ''}`}>
      <div className="mt-0.5">{display.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{display.text}</p>
        {display.detail && (
          <p className="text-xs mt-1 text-gray-700">{display.detail}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          {new Date(item.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

export default ExecutionProgress;