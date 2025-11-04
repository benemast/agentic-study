// frontend/src/components/workflow/NodeResultsModal.jsx
import React from 'react';
import { X, CheckCircle, XCircle, Clock, Database, Zap, Info } from 'lucide-react';

/**
 * Modal to display node execution results
 * 
 * Shows:
 * - Execution status and time
 * - Input/output data
 * - Tool execution details
 * - Error information (if any)
 */
const NodeResultsModal = ({ isOpen, onClose, nodeResult }) => {
  if (!isOpen || !nodeResult) return null;

  const { 
    node_id, 
    node_label, 
    status, 
    execution_time_ms,
    input_data,
    output_data,
    tool_executions = [],
    error,
    step_number
  } = nodeResult;

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-red-500" />;
      default:
        return <Clock className="w-6 h-6 text-blue-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {node_label}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {node_id} • Step {step_number}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Status Summary */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Status</p>
                <p className={`text-lg font-semibold capitalize ${getStatusColor()}`}>
                  {status}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Execution Time</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {execution_time_ms}ms
                </p>
              </div>
            </div>
          </div>

          {/* Error (if present) */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900 dark:text-red-300 mb-1">Error</h3>
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tool Executions */}
          {tool_executions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Tool Executions ({tool_executions.length})
                </h3>
              </div>
              <div className="space-y-3">
                {tool_executions.map((tool, idx) => (
                  <div 
                    key={idx}
                    className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {tool.tool_name}
                      </p>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {tool.execution_time_ms}ms
                      </span>
                    </div>
                    {tool.error && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                        Error: {tool.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input Data */}
          {input_data && Object.keys(input_data).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Input Data</h3>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <pre className="text-sm text-gray-800 dark:text-gray-200 overflow-x-auto">
                  {JSON.stringify(input_data, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Output Data */}
          {output_data && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-5 h-5 text-green-500 dark:text-green-400" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Output Data</h3>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                {typeof output_data === 'object' ? (
                  <div className="space-y-2">
                    {/* Show summary stats for data */}
                    {output_data.row_count !== undefined && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Rows:</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {output_data.row_count}
                        </span>
                      </div>
                    )}
                    {output_data.column_count !== undefined && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Columns:</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {output_data.column_count}
                        </span>
                      </div>
                    )}
                    
                    {/* Full data preview */}
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-blue-600 dark:text-blue-400 hover:underline">
                        Show full data
                      </summary>
                      <pre className="text-xs text-gray-800 dark:text-gray-200 overflow-x-auto mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded">
                        {JSON.stringify(output_data, null, 2)}
                      </pre>
                    </details>
                  </div>
                ) : (
                  <pre className="text-sm text-gray-800 dark:text-gray-200 overflow-x-auto">
                    {String(output_data)}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* Results Data - Primary Results */}
          {nodeResult.results && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Results</h3>
                {nodeResult.success !== undefined && (
                  <span className={`ml-auto text-xs px-2 py-1 rounded-full ${
                    nodeResult.success 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {nodeResult.success ? 'Success' : 'Failed'}
                  </span>
                )}
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                {typeof nodeResult.results === 'object' ? (
                  <div className="space-y-2">
                    {/* Show key results stats if available */}
                    {nodeResult.results.summary && (
                      <div className="mb-3 p-3 bg-white dark:bg-gray-800 rounded border border-blue-100 dark:border-blue-900">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Summary</div>
                        <pre className="text-xs text-gray-800 dark:text-gray-200 overflow-x-auto">
                          {JSON.stringify(nodeResult.results.summary, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {/* Full results preview */}
                    <details open className="mt-3">
                      <summary className="cursor-pointer text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
                        Show all results
                      </summary>
                      <pre className="text-xs text-gray-800 dark:text-gray-200 overflow-x-auto mt-2 p-3 bg-white dark:bg-gray-800 rounded border border-blue-100 dark:border-blue-900">
                        {JSON.stringify(nodeResult.results, null, 2)}
                      </pre>
                    </details>
                  </div>
                ) : (
                  <pre className="text-sm text-gray-800 dark:text-gray-200 overflow-x-auto">
                    {String(nodeResult.results)}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* Info Note */}
          <div className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              This shows the execution result for this specific node in the workflow.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeResultsModal;