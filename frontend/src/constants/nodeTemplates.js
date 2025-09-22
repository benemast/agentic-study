export const ICON_MAP = {
  Database: 'Database',
  Filter: 'Filter', 
  BarChart3: 'BarChart3',
  Brain: 'Brain',
  Download: 'Download',
};

export const TAILWIND_COLORS = {
  'bg-blue-500': '#3b82f6',
  'bg-green-500': '#10b981', 
  'bg-purple-500': '#8b5cf6',
  'bg-orange-500': '#f97316',
  'bg-indigo-500': '#6366f1',
  'bg-yellow-500': '#eab308',
};

export const NODE_TEMPLATES = [
  {
    id: 'gather-data',
    label: 'Gather Data',
    type: 'Data Input',
    icon: 'Database',
    color: 'bg-blue-500',
    category: 'input',
    hasInput: 0,
    hasOutput: 1,
    maxInputConnections: 0,
    maxOutputConnections: 3
  },
  {
    id: 'logic-if', 
    label: 'Logic If',
    type: 'Conditional',
    icon: 'Filter',
    color: 'bg-yellow-500',
    category: 'logic',
    hasInput: 1,
    hasOutput: 2,
    maxInputConnections: 1,
    maxOutputConnections: 1
  },
  {
    id: 'clean-data',
    label: 'Clean Data', 
    type: 'Data Processing',
    icon: 'Filter',
    color: 'bg-green-500',
    category: 'processing',
    hasInput: 1,
    hasOutput: 1,
    maxInputConnections: 1,
    maxOutputConnections: 1
  },
  {
    id: 'sentiment-analysis',
    label: 'Sentiment Analysis',
    type: 'Analysis', 
    icon: 'BarChart3',
    color: 'bg-purple-500',
    category: 'analysis',
    hasInput: 1,
    hasOutput: 1,
    maxInputConnections: 1,
    maxOutputConnections: 1
  },
  {
    id: 'generate-insights',
    label: 'Generate Insights',
    type: 'AI Operation',
    icon: 'Brain',
    color: 'bg-orange-500', 
    category: 'ai',
    hasInput: 1,
    hasOutput: 1,
    maxInputConnections: 1,
    maxOutputConnections: 1
  },
  {
    id: 'show-results',
    label: 'Show Results',
    type: 'Output',
    icon: 'Download',
    color: 'bg-indigo-500',
    category: 'output',
    hasInput: 1,
    hasOutput: 0,
    maxInputConnections: 1,
    maxOutputConnections: 0
  }
];