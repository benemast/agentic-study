// frontend/src/components/workflow/NodeResultsModal.jsx
import React, { useState } from 'react';
import { X, CheckCircle, XCircle, Clock, Database, Zap, Info, ChevronDown, ChevronRight } from 'lucide-react';
import ReactJson from '@microlink/react-json-view';
import { useTheme } from '../../../hooks/useTheme';

/**
 * Format snake_case or camelCase to readable text
 * e.g., "total_reviews" -> "Total Reviews"
 *       "sentimentScore" -> "Sentiment Score"
 */
const formatKey = (key) => {
  return key
    // Insert space before capital letters (camelCase)
    .replace(/([A-Z])/g, ' $1')
    // Replace underscores with spaces (snake_case)
    .replace(/_/g, ' ')
    // Capitalize first letter of each word
    .replace(/\b\w/g, char => char.toUpperCase())
    // Trim any extra spaces
    .trim();
};

/**
 * Format value for display
 */
const formatValue = (value) => {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  if (Array.isArray(value)) return `${value.length} items`;
  if (typeof value === 'object') return 'View details below';
  return String(value);
};

/**
 * KeyValueList - Display object as structured key-value pairs
 */
const KeyValueList = ({ data, title }) => {
  if (!data || typeof data !== 'object') return null;
  
  const entries = Object.entries(data).filter(([_, value]) => 
    value !== null && value !== undefined && typeof value !== 'object'
  );
  
  if (entries.length === 0) return null;
  
  return (
    <div className="space-y-2">
      {title && (
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {title}
        </h4>
      )}
      <div className="grid grid-cols-1 gap-2">
        {entries.map(([key, value]) => (
          <div 
            key={key}
            className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700"
          >
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {formatKey(key)}
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {formatValue(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Collapsible JSON Section Component
 */
const CollapsibleSection = ({ title, icon: Icon, iconColor, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900/70 transition"
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        </div>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-500" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 bg-white dark:bg-gray-800">
          {children}
        </div>
      )}
    </div>
  );
};

/**
 * Node-type-specific summary renderer
 */
const NodeSummary = ({ nodeResult }) => {
  const { tool_executions = [], output_data, results } = nodeResult;
  
  // Determine node type from tool executions
  const toolNames = tool_executions.map(t => t.tool_name);
  
  // Sentiment Analysis Node
  if (toolNames.includes('analyze_sentiment')) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {results?.sentiment_distribution && (
            <>
              <StatCard 
                label="Positive" 
                value={`${results.sentiment_distribution.positive || 0}%`}
                color="text-green-600 dark:text-green-400"
              />
              <StatCard 
                label="Neutral" 
                value={`${results.sentiment_distribution.neutral || 0}%`}
                color="text-blue-600 dark:text-blue-400"
              />
              <StatCard 
                label="Negative" 
                value={`${results.sentiment_distribution.negative || 0}%`}
                color="text-red-600 dark:text-red-400"
              />
              <StatCard 
                label="Reviews" 
                value={results.total_reviews || output_data?.row_count || 0}
                color="text-gray-900 dark:text-gray-100"
              />
            </>
          )}
        </div>
        {results && <KeyValueList data={results} />}
      </div>
    );
  }
  
  // Filter/Search Node
  if (toolNames.includes('filter_data') || toolNames.includes('search_reviews')) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard 
            label="Results Found" 
            value={output_data?.row_count || results?.count || 0}
            color="text-blue-600 dark:text-blue-400"
          />
          {output_data?.column_count && (
            <StatCard 
              label="Columns" 
              value={output_data.column_count}
              color="text-gray-600 dark:text-gray-400"
            />
          )}
          {results?.filtered_percentage && (
            <StatCard 
              label="Match Rate" 
              value={`${results.filtered_percentage}%`}
              color="text-green-600 dark:text-green-400"
            />
          )}
        </div>
        {results && <KeyValueList data={results} />}
      </div>
    );
  }
  
  // Insight Generation Node
  if (toolNames.includes('generate_insights') || toolNames.includes('extract_themes')) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard 
            label="Insights Generated" 
            value={results?.insights?.length || results?.count || 0}
            color="text-purple-600 dark:text-purple-400"
          />
          {results?.top_themes && (
            <StatCard 
              label="Themes" 
              value={results.top_themes.length}
              color="text-blue-600 dark:text-blue-400"
            />
          )}
          {output_data?.row_count && (
            <StatCard 
              label="Reviews Analyzed" 
              value={output_data.row_count}
              color="text-gray-600 dark:text-gray-400"
            />
          )}
        </div>
        {results && <KeyValueList data={results} />}
      </div>
    );
  }
  
  // Default: Generic data stats + all results
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {output_data?.row_count !== undefined && (
          <StatCard 
            label="Rows" 
            value={output_data.row_count}
            color="text-blue-600 dark:text-blue-400"
          />
        )}
        {output_data?.column_count !== undefined && (
          <StatCard 
            label="Columns" 
            value={output_data.column_count}
            color="text-gray-600 dark:text-gray-400"
          />
        )}
        {tool_executions.length > 0 && (
          <StatCard 
            label="Tools Used" 
            value={tool_executions.length}
            color="text-purple-600 dark:text-purple-400"
          />
        )}
      </div>
      {results && <KeyValueList data={results} />}
    </div>
  );
};

/**
 * Stat Card Component
 */
const StatCard = ({ label, value, color }) => (
  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
    <p className={`text-xl font-bold ${color}`}>{value}</p>
  </div>
);

/**
 * Modal to display node execution results
 * 
 * Shows:
 * - Execution status and time
 * - Node-specific summary statistics
 * - Tool execution details
 * - Input/output data (collapsible)
 * - Error information (if any)
 */
const NodeResultsModal = ({ isOpen, onClose, nodeResult }) => {
  const { isDark } = useTheme();
  
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Status Bar */}
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

          {/* Node-Specific Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">Summary</h3>
            <NodeSummary nodeResult={nodeResult} />
          </div>

          {/* Tool Executions */}
          {tool_executions.length > 0 && (
            <CollapsibleSection
              title={`Tool Executions (${tool_executions.length})`}
              icon={Zap}
              iconColor="text-purple-500 dark:text-purple-400"
              defaultOpen={false}
            >
              <div className="space-y-2">
                {tool_executions.map((tool, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {tool.tool_name}
                      </p>
                      {tool.error && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          Error: {tool.error}
                        </p>
                      )}
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-4">
                      {tool.execution_time_ms}ms
                    </span>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Results Data */}
          {nodeResult.results && (
            <CollapsibleSection
              title="Detailed Results"
              icon={CheckCircle}
              iconColor="text-blue-500 dark:text-blue-400"
              defaultOpen={true}
            >
              <ReactJson 
                src={nodeResult.results}
                theme={isDark ? 'monokai' : 'rjv-default'}
                collapsed={2}
                indentWidth={4}
                displayDataTypes={true}
                displayObjectSize={true}
                enableClipboard={false}
                name={false}
                style={{
                  padding: '12px',
                  borderRadius: '6px',
                  backgroundColor: isDark ? '#1f2937' : '#f9fafb',
                  fontSize: '12px'
                }}
              />
            </CollapsibleSection>
          )}

          {/* Input Data */}
          {input_data && Object.keys(input_data).length > 0 && (
            <CollapsibleSection
              title="Input Data"
              icon={Database}
              iconColor="text-blue-500 dark:text-blue-400"
              defaultOpen={false}
            >
              <ReactJson 
                src={input_data}
                theme={isDark ? 'monokai' : 'rjv-default'}
                collapsed={2}
                displayDataTypes={false}
                displayObjectSize={true}
                enableClipboard={true}
                name={false}
                style={{
                  padding: '12px',
                  borderRadius: '6px',
                  backgroundColor: isDark ? '#1f2937' : '#f9fafb',
                  fontSize: '12px'
                }}
              />
            </CollapsibleSection>
          )}

          {/* Output Data */}
          {output_data && (
            <CollapsibleSection
              title="Output Data"
              icon={Database}
              iconColor="text-green-500 dark:text-green-400"
              defaultOpen={false}
            >
              {typeof output_data === 'object' ? (
                <ReactJson 
                  src={output_data}
                  theme={isDark ? 'monokai' : 'rjv-default'}
                  collapsed={1}
                  indentWidth={4}
                  displayDataTypes={true}
                  displayObjectSize={true}
                  enableClipboard={false}
                  name={false}
                  style={{
                    padding: '12px',
                    borderRadius: '6px',
                    backgroundColor: isDark ? '#1f2937' : '#f9fafb',
                    fontSize: '12px'
                  }}
                />
              ) : (
                <pre className="text-xs text-gray-800 dark:text-gray-200 overflow-x-auto p-3 bg-gray-50 dark:bg-gray-900 rounded">
                  {String(output_data)}
                </pre>
              )}
            </CollapsibleSection>
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