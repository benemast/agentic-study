// frontend/src/components/ExecutionProgress.jsx
import React, { useEffect, useRef } from 'react';
import { 
  Play, 
  Check, 
  X, 
  Loader, 
  Brain, 
  ArrowRight, 
  AlertCircle,
  Settings,
  Zap,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useBrowserNotifications } from '../hooks/useBrowserNotification';

/**
 * Real-time execution progress display with browser notifications
 * 
 * Three-tier message structure:
 * - Execution level (orchestrator)
 * - Node level (graph)
 * - Tool level (tools)
 * 
 * Props from useExecutionProgress hook:
 * - status: Current execution status
 * - messages: Array of all progress messages
 * - progressPercentage: Overall progress (0-100)
 * - currentStep: Current step being executed
 * - nodeStates: Node execution states (workflow_builder)
 * - toolStates: Tool execution states (both conditions)
 * - condition: 'workflow_builder' or 'ai_assistant'
 * - onCancel: Cancel callback
 * - enableNotifications: Enable browser notifications (default: true)
 */
export const ExecutionProgress = ({ 
  status, 
  messages = [],
  progressPercentage = 0,
  currentStep,
  nodeStates = {},
  toolStates = {},
  condition,
  onCancel,
  enableNotifications = true
}) => {
  const {
    notifyExecutionStart,
    notifyExecutionComplete,
    notifyExecutionError,
    isGranted
  } = useBrowserNotifications({
    enabled: enableNotifications,
    playSound: true,
    requireInteraction: false
  });
  
  // Track previous status to detect changes
  const prevStatusRef = useRef(status);
  
  // ✨ NEW: Handle status changes and send notifications
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    
    // Status changed from non-running to running
    if (prevStatus !== 'running' && status === 'running') {
      notifyExecutionStart({
        message: condition === 'workflow_builder' 
          ? 'Your workflow is now running'
          : 'AI Assistant is processing your request',
        onClick: () => window.focus()
      });
    }
    
    // Status changed to completed
    if (prevStatus === 'running' && status === 'completed') {
      const completedNodes = Object.values(nodeStates).filter(
        s => s.status === 'completed'
      ).length;
      
      notifyExecutionComplete({
        message: condition === 'workflow_builder'
          ? `Workflow complete! ${completedNodes} nodes executed successfully`
          : 'AI Assistant task completed successfully',
        requireInteraction: true,  // Keep notification until dismissed
        onClick: () => window.focus()
      });
    }
    
    // Status changed to failed
    if (prevStatus === 'running' && status === 'failed') {
      notifyExecutionError({
        message: condition === 'workflow_builder'
          ? 'Workflow execution failed. Check the progress panel for details.'
          : 'AI Assistant encountered an error',
        requireInteraction: true,  // Keep error notification
        onClick: () => window.focus()
      });
    }
    
    // Update ref for next render
    prevStatusRef.current = status;
  }, [status, condition, nodeStates, notifyExecutionStart, notifyExecutionComplete, notifyExecutionError]);

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
        return <X className="w-5 h-5" />;
      case 'cancelled':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Play className="w-5 h-5" />;
    }
  };

  // Count active tools
  const activeTools = Object.values(toolStates).filter(
    state => state.status === 'running'
  ).length;

  // Count completed/failed nodes
  const nodeStats = Object.values(nodeStates).reduce((acc, state) => {
    acc[state.status] = (acc[state.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`${getStatusColor()} text-white p-2 rounded-lg`}>
            {getStatusIcon()}
          </div>
          <div>
            <h3 className="text-lg font-semibold capitalize text-gray-900 dark:text-gray-100">
              {status}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {condition === 'workflow_builder' ? 'Workflow Execution' : 'AI Assistant Task'}
              {enableNotifications && isGranted && (
                <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                  🔔 Notifications enabled
                </span>
              )}
            </p>
          </div>
        </div>
        
        {status === 'running' && onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {(status === 'running' || status === 'starting') && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Progress</span>
            <span>{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats Row (Workflow Builder only) */}
      {condition === 'workflow_builder' && Object.keys(nodeStates).length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center">
            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Running</div>
            <div className="text-lg font-bold text-blue-900 dark:text-blue-300">
              {nodeStats.running || 0}
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
            <div className="text-xs text-green-600 dark:text-green-400 font-medium">Completed</div>
            <div className="text-lg font-bold text-green-900 dark:text-green-300">
              {nodeStats.completed || 0}
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 text-center">
            <div className="text-xs text-red-600 dark:text-red-400 font-medium">Failed</div>
            <div className="text-lg font-bold text-red-900 dark:text-red-300">
              {nodeStats.failed || 0}
            </div>
          </div>
        </div>
      )}

      {/* Active Tools (AI Assistant or during tool execution) */}
      {activeTools > 0 && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-purple-900 dark:text-purple-300">
              Active Tools ({activeTools})
            </span>
          </div>
          <div className="space-y-2">
            {Object.entries(toolStates)
              .filter(([_, state]) => state.status === 'running')
              .map(([toolName, state]) => (
                <div key={toolName} className="flex items-center justify-between">
                  <span className="text-xs text-purple-700 dark:text-purple-400">
                    {toolName}
                  </span>
                  {state.progress !== undefined && (
                    <span className="text-xs font-medium text-purple-900 dark:text-purple-300">
                      {state.progress}%
                    </span>
                  )}
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* Current Step */}
      {currentStep && status === 'running' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
              {condition === 'workflow_builder' 
                ? `Executing: ${currentStep.label || currentStep.nodeId}`
                : currentStep.thinking 
                  ? `Agent thinking... (${currentStep.chunks || 0} chunks)`
                  : `${currentStep.action || currentStep.message || 'Processing...'}`
              }
            </span>
          </div>
          {currentStep.step && (
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
              Step {currentStep.step}
            </p>
          )}
          {currentStep.progress !== undefined && (
            <div className="mt-2">
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1">
                <div
                  className="bg-blue-600 dark:bg-blue-400 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${currentStep.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress Timeline */}
      <div className="max-h-64 overflow-y-auto space-y-2">
        {messages.map((item, index) => (
          <ProgressItem 
            key={item.id || index}
            item={item} 
            condition={condition}
            isLatest={index === messages.length - 1}
          />
        ))}
      </div>

      {/* Empty State */}
      {messages.length === 0 && status === 'idle' && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <Play className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No execution in progress</p>
          <p className="text-xs mt-1">Click Execute to start</p>
        </div>
      )}
    </div>
  );
};

/**
 * Individual progress item with three-tier support
 */
const ProgressItem = ({ item, condition, isLatest }) => {
  const getItemDisplay = () => {
    // EXECUTION LEVEL
    if (item.type === 'execution') {
      switch (item.subtype) {
        case 'start':
          return {
            icon: <Play className="w-4 h-4" />,
            text: 'Execution started',
            color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400',
            badge: 'Orchestrator'
          };
        case 'progress':
          return {
            icon: <Loader className="w-4 h-4 animate-spin" />,
            text: item.content,
            color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400',
            badge: 'Progress'
          };
        case 'end':
          return {
            icon: <CheckCircle className="w-4 h-4" />,
            text: 'Execution completed',
            detail: item.duration ? `Duration: ${Math.round(item.duration / 1000)}s` : null,
            color: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
            badge: 'Complete'
          };
        case 'error':
          return {
            icon: <XCircle className="w-4 h-4" />,
            text: `Error: ${item.content}`,
            color: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
            badge: 'Error'
          };
        default:
          return {
            icon: <ArrowRight className="w-4 h-4" />,
            text: item.content,
            color: 'text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-400'
          };
      }
    }
    
    // NODE LEVEL (Workflow Builder)
    if (item.type === 'node') {
      switch (item.subtype) {
        case 'start':
          return {
            icon: <ArrowRight className="w-4 h-4" />,
            text: `Node: ${item.nodeLabel || item.nodeId}`,
            detail: 'Started',
            color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400',
            badge: 'Node'
          };
        case 'progress':
          return {
            icon: <Loader className="w-4 h-4 animate-spin" />,
            text: `Node: ${item.nodeLabel || item.nodeId}`,
            detail: item.content,
            color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400',
            badge: item.progress ? `${item.progress}%` : 'Running'
          };
        case 'end':
          return {
            icon: <Check className="w-4 h-4" />,
            text: `Node: ${item.nodeLabel || item.nodeId}`,
            detail: 'Completed',
            color: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
            badge: 'Complete'
          };
        case 'error':
          return {
            icon: <X className="w-4 h-4" />,
            text: `Node: ${item.nodeLabel || item.nodeId}`,
            detail: item.error,
            color: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
            badge: 'Failed'
          };
        default:
          return {
            icon: <Settings className="w-4 h-4" />,
            text: item.content,
            color: 'text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-400'
          };
      }
    }
    
    // TOOL LEVEL (Both conditions)
    if (item.type === 'tool') {
      switch (item.subtype) {
        case 'start':
          return {
            icon: <Zap className="w-4 h-4" />,
            text: `Tool: ${item.toolName}`,
            detail: 'Started',
            color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400',
            badge: 'Tool'
          };
        case 'progress':
          return {
            icon: <Loader className="w-4 h-4 animate-spin" />,
            text: `Tool: ${item.toolName}`,
            detail: item.content,
            color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400',
            badge: item.progress ? `${item.progress}%` : 'Running'
          };
        case 'end':
          return {
            icon: <Check className="w-4 h-4" />,
            text: `Tool: ${item.toolName}`,
            detail: item.execution_time_ms ? `${item.execution_time_ms}ms` : 'Completed',
            color: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
            badge: 'Complete'
          };
        case 'error':
          return {
            icon: <X className="w-4 h-4" />,
            text: `Tool: ${item.toolName}`,
            detail: item.error,
            color: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
            badge: 'Failed'
          };
        default:
          return {
            icon: <Zap className="w-4 h-4" />,
            text: item.content,
            color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400'
          };
      }
    }
    
    // AGENT LEVEL (AI Assistant)
    if (item.type === 'agent') {
      switch (item.subtype) {
        case 'decision':
          return {
            icon: <Brain className="w-4 h-4" />,
            text: `Decision: ${item.content}`,
            detail: item.reasoning,
            color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400',
            badge: item.confidence ? `${Math.round(item.confidence * 100)}%` : 'Agent'
          };
        default:
          return {
            icon: <Brain className="w-4 h-4" />,
            text: item.content,
            color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400'
          };
      }
    }
    
    // FALLBACK
    return {
      icon: <ArrowRight className="w-4 h-4" />,
      text: item.content || 'Processing...',
      color: 'text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-400'
    };
  };

  const display = getItemDisplay();

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${display.color} ${isLatest ? 'ring-2 ring-blue-300 dark:ring-blue-600' : ''} transition-all`}>
      <div className="mt-0.5 flex-shrink-0">{display.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{display.text}</p>
          {display.badge && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/50 dark:bg-gray-900/50 font-medium">
              {display.badge}
            </span>
          )}
        </div>
        {display.detail && (
          <p className="text-xs mt-1 opacity-80">{display.detail}</p>
        )}
        <p className="text-xs opacity-60 mt-1">
          {new Date(item.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

export default ExecutionProgress;