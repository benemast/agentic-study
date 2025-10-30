// frontend/src/config/nodeTemplates.js
// ============================================
// CRITICAL: IDs must match backend tool registry workflow_id values!
// Backend location: backend/app/orchestrator/tools/registry.py
// ============================================

import { getWorkflowSortableColumns, getWorkflowFilterableColumns } from './columnConfig';
// Tailwind color mapping for minimap
export const TAILWIND_COLORS = {
  'bg-blue-500': '#3b82f6',
  'bg-blue-600': '#2563eb',
  'bg-cyan-500': '#06b6d4',
  'bg-sky-500': '#0ea5e9',
  'bg-sky-600': '#0284c7',
  'bg-green-500': '#22c55e',
  'bg-emerald-500': '#10b981',
  'bg-purple-500': '#a855f7',
  'bg-violet-500': '#8b5cf6',
  'bg-indigo-500': '#6366f1',
  'bg-pink-500': '#ec4899',
  'bg-red-500': '#ef4444',
  'bg-orange-500': '#f97316',
  'bg-yellow-500': '#eab308',
  'bg-amber-500': '#f59e0b'
};

const inputColor = 'bg-cyan-500';
const processingColor = 'bg-emerald-500'
const analysisColor = 'bg-violet-500'
const aiColor = 'bg-amber-500'
const outputColor = 'bg-blue-500'

/**
 * Node templates for Workflow Builder
 * Each template maps to a backend tool in the registry
 * 
 * Template properties:
 * - id: Must match ToolDefinition.workflow_id in backend
 * - label: Display name in UI
 * - type: Visual grouping
 * - icon: Lucide icon name
 * - color: Tailwind color class
 * - category: Functional grouping (input/processing/analysis/output/logic)
 * - hasInput/hasOutput: Number of connection points
 * - maxInputConnections/maxOutputConnections: Connection limits
 * - description: Tooltip/help text
 * - configSchema: Array of configuration fields for the node editor
 * - defaultConfig: Default configuration values
 */
export const NODE_TEMPLATES = [
  // ============================================
  // DATA INPUT TOOLS
  // ============================================
  {
    id: 'load-reviews',
    label: 'workflow.builder.nodes.loadReviews.label',
    type: 'workflow.builder.nodes.loadReviews.type',
    icon: 'FileInput',
    color: inputColor,
    category: 'input',
    hasInput: 0,
    hasOutput: 1,
    maxInputConnections: 0,
    maxOutputConnections: 3,
    description: 'workflow.builder.nodes.loadReviews.description',
    editable: true,
    configSchema: [
      {
        key: 'category',
        label: 'workflow.builder.nodes.loadReviews.config.category.label',
        type: 'select',
        options: [
          { 
            value: 'shoes', 
            label: 'workflow.builder.nodes.loadReviews.config.category.options.shoes'
          },
          { 
            value: 'wireless', 
            label: 'workflow.builder.nodes.loadReviews.config.category.options.wireless'
          }
        ],
        required: false,
        locked: true,
        help: 'workflow.builder.nodes.loadReviews.config.category.help',
        placeholder: 'workflow.builder.nodes.loadReviews.config.category.placeholder'
      },
      {
        key: 'limit',
        label: 'workflow.builder.nodes.loadReviews.config.limit.label',
        type: 'number',
        min: 1,
        max: 10000,
        required: false,
        locked: false,
        help: 'workflow.builder.nodes.loadReviews.config.limit.help',
        placeholder: 'workflow.builder.nodes.loadReviews.config.limit.placeholder'
      }
    ],
    defaultConfig: {
      category: null,
      limit: null
    }
  },
  
  // ============================================
  // DATA PROCESSING TOOLS
  // ============================================

  {
    id: 'clean-data',
    label: 'workflow.builder.nodes.cleanData.label',
    type: 'workflow.builder.nodes.cleanData.type',
    icon: 'BrushCleaning',
    color: processingColor,
    category: 'processing',
    hasInput: 1,
    hasOutput: 1,
    maxInputConnections: 1,
    maxOutputConnections: 1,
    description: 'workflow.builder.nodes.cleanData.description',
    editable: true,
    configSchema: [
      {
        key: 'remove_nulls',
        label: 'workflow.builder.nodes.cleanData.config.removeNulls.label',
        type: 'boolean',
        required: false,
        locked: false,
        help: 'workflow.builder.nodes.cleanData.config.removeNulls.help',
        placeholder: 'workflow.builder.nodes.cleanData.config.removeNulls.placeholder'
      },
      {
        key: 'normalize_text',
        label: 'workflow.builder.nodes.cleanData.config.normalizeText.label',
        type: 'boolean',
        required: false,
        locked: false,
        help: 'workflow.builder.nodes.cleanData.config.normalizeText.help',
        placeholder: 'workflow.builder.nodes.cleanData.config.normalizeText.placeholder'
      },
      {
        key: 'remove_duplicates',
        label: 'workflow.builder.nodes.cleanData.config.removeDuplicates.label',
        type: 'boolean',
        required: false,
        locked: false,
        help: 'workflow.builder.nodes.cleanData.config.removeDuplicates.help',
        placeholder: 'workflow.builder.nodes.cleanData.config.removeDuplicates.placeholder'
      }
    ],
    defaultConfig: {
      remove_nulls: true,
      normalize_text: true,
      remove_duplicates: false
    }
  },

  {
    id: 'filter-reviews',
    label: 'workflow.builder.nodes.filterReviews.label',
    type: 'workflow.builder.nodes.filterReviews.type',
    icon: 'Filter',
    color: processingColor,
    category: 'processing',
    hasInput: 1,
    hasOutput: 1,
    maxInputConnections: 1,
    maxOutputConnections: 1,
    description: 'workflow.builder.nodes.filterReviews.description',
    editable: true,
    configSchema: [
      {
        key: 'field',
        label: 'workflow.builder.nodes.filterReviews.config.field.label',
        type: 'select',
        options: () => getWorkflowFilterableColumns().map(col => ({
          value: col.id,
          label: col.label,
          dataType: col.dataType
        })),
        required: true,
        locked: false,
        help: 'workflow.builder.nodes.filterReviews.config.field.help',
        placeholder: 'workflow.builder.nodes.filterReviews.config.field.placeholder'
      },
      {
        key: 'operator',
        label: 'workflow.builder.nodes.filterReviews.config.operator.label',
        type: 'select',
        options: 'dynamic',
        required: true,
        locked: false,
        dependsOn: 'field',
        help: 'workflow.builder.nodes.filterReviews.config.operator.help',
        placeholder: 'workflow.builder.nodes.filterReviews.config.operator.placeholder'
      },
      {
        key: 'value',
        label: 'workflow.builder.nodes.filterReviews.config.value.label',
        type: 'dynamic',
        required: true,
        locked: false,
        dependsOn: 'field',
        help: 'workflow.builder.nodes.filterReviews.config.value.help',
        placeholder: 'workflow.builder.nodes.filterReviews.config.value.placeholder'
      }
    ],
    defaultConfig: {
      field: null,
      operator: 'equal',
      value: ''
    }
  },

  {
    id: 'sort-reviews',
    label: 'workflow.builder.nodes.sortReviews.label',
    type: 'workflow.builder.nodes.sortReviews.type',
    icon: 'ArrowDownNarrowWide',
    color: processingColor,
    category: 'processing',
    hasInput: 1,
    hasOutput: 1,
    maxInputConnections: 1,
    maxOutputConnections: 1,
    description: 'workflow.builder.nodes.sortReviews.description',
    editable: true,
    configSchema: [
      {
        key: 'sort_by',
        label: 'workflow.builder.nodes.sortReviews.config.sortBy.label',
        type: 'select',
        options: () => getWorkflowSortableColumns().map(col => ({
          value: col.id,
          label: col.label
        })),
        required: true,
        locked: false,
        help: 'workflow.builder.nodes.sortReviews.config.sortBy.help',
        placeholder: 'workflow.builder.nodes.sortReviews.config.sortBy.placeholder'
      },
      {
        key: 'descending',
        label: 'workflow.builder.nodes.sortReviews.config.descending.label',
        type: 'select',
        options: [
          { 
            value: true, 
            label: 'workflow.builder.nodes.sortReviews.config.descending.options.true'
          },
          { 
            value: false, 
            label: 'workflow.builder.nodes.sortReviews.config.descending.options.false'
          }
        ],
        required: true,
        locked: false,
        help: 'workflow.builder.nodes.sortReviews.config.descending.help'
      }
    ],
    defaultConfig: {
      sort_by: null,
      descending: true
    }
  },

  
  // ============================================
  // ANALYSIS TOOLS
  // ============================================
  {
    id: 'generate-insights',
    label: 'workflow.builder.nodes.generateInsights.label',
    type: 'workflow.builder.nodes.generateInsights.type',
    icon: 'Brain',
    color: aiColor,
    category: 'analysis',
    hasInput: 1,
    hasOutput: 1,
    maxInputConnections: 1,
    maxOutputConnections: 1,
    description: 'workflow.builder.nodes.generateInsights.description',
    editable: true,
    configSchema: [
      {
        key: 'focus_area',
        label: 'workflow.builder.nodes.generateInsights.config.focusArea.label',
        type: 'multiselect',
        options: [
          { 
            value: 'competitive_positioning', 
            label: 'workflow.builder.nodes.generateInsights.config.focusArea.options.competitivePositioning.label',
            help: 'workflow.builder.nodes.generateInsights.config.focusArea.options.competitivePositioning.help'
          },
          { 
            value: 'customer_experience', 
            label: 'workflow.builder.nodes.generateInsights.config.focusArea.options.customerExperience.label',
            help: 'workflow.builder.nodes.generateInsights.config.focusArea.options.customerExperience.help'
          },
          { 
            value: 'marketing_messages', 
            label: 'workflow.builder.nodes.generateInsights.config.focusArea.options.marketingMessages.label',
            help: 'workflow.builder.nodes.generateInsights.config.focusArea.options.marketingMessages.help'
          },
          { 
            value: 'product_improvements', 
            label: 'workflow.builder.nodes.generateInsights.config.focusArea.options.productImprovements.label',
            help: 'workflow.builder.nodes.generateInsights.config.focusArea.options.productImprovements.help'
          }
        ],
        required: true,
        locked: false,
        help: 'workflow.builder.nodes.generateInsights.config.focusArea.help'
      },
      {
        key: 'max_recommendations',
        label: 'workflow.builder.nodes.generateInsights.config.maxRecommendations.label',
        type: 'number',
        min: 1,
        max: 10,
        required: true,
        locked: false,
        help: 'workflow.builder.nodes.generateInsights.config.maxRecommendations.help'
      }
    ],
    defaultConfig: {
      focus_area: null,
      max_recommendations: null
    }
  },
  
  {
    id: 'review-sentiment-analysis',
    label: 'workflow.builder.nodes.reviewSentimentAnalysis.label',
    type: 'workflow.builder.nodes.reviewSentimentAnalysis.type',
    icon: 'BarChart3',
    color: analysisColor,
    category: 'analysis',
    hasInput: 1,
    hasOutput: 1,
    maxInputConnections: 1,
    maxOutputConnections: 1,
    description: 'workflow.builder.nodes.reviewSentimentAnalysis.description',
    editable: true,
    configSchema: [
      {
        key: 'extract_themes',
        label: 'workflow.builder.nodes.reviewSentimentAnalysis.config.extractThemes.label',
        type: 'boolean',
        required: true,
        locked: true,
        help: 'workflow.builder.nodes.reviewSentimentAnalysis.config.extractThemes.help',
        placeholder: 'workflow.builder.nodes.reviewSentimentAnalysis.config.extractThemes.placeholder'
      },
      {
        key: 'theme_separation',
        label: 'workflow.builder.nodes.reviewSentimentAnalysis.config.themeSeparation.label',
        type: 'select',
        options: [
          { 
            value: 'combined', 
            label: 'workflow.builder.nodes.reviewSentimentAnalysis.config.themeSeparation.options.combined'
          },
          { 
            value: 'by_sentiment', 
            label: 'workflow.builder.nodes.reviewSentimentAnalysis.config.themeSeparation.options.bySentiment'
          }
        ],
        required: true,
        locked: false,
        help: 'workflow.builder.nodes.reviewSentimentAnalysis.config.themeSeparation.help'
      },
      {
        key: 'max_themes_per_category',
        label: 'workflow.builder.nodes.reviewSentimentAnalysis.config.maxThemesPerCategory.label',
        type: 'number',
        min: 1,
        max: 10,
        required: true,
        locked: false,
        help: 'workflow.builder.nodes.reviewSentimentAnalysis.config.maxThemesPerCategory.help'
      },
      {
        key: 'include_percentages',
        label: 'workflow.builder.nodes.reviewSentimentAnalysis.config.includePercentages.label',
        type: 'boolean',
        required: false,
        locked: false,
        help: 'workflow.builder.nodes.reviewSentimentAnalysis.config.includePercentages.help',
        placeholder: 'workflow.builder.nodes.reviewSentimentAnalysis.config.includePercentages.placeholder'
      }
    ],
    defaultConfig: {
      extract_themes: true,
      theme_separation: 'combined',
      max_themes_per_category: 1,
      include_percentages: false
    }
  },

  // ============================================
  // OUTPUT TOOLS
  // ============================================
  {
    id: 'show-results',
    label: 'workflow.builder.nodes.showResults.label',
    type: 'workflow.builder.nodes.showResults.type',
    icon: 'FileOutput',
    color: outputColor,
    category: 'output',
    hasInput: 1,
    hasOutput: 0,
    maxInputConnections: 1,
    maxOutputConnections: 0,
    description: 'workflow.builder.nodes.showResults.description',
    note: 'workflow.builder.nodes.showResults.note',
    editable: true,
    configSchema: [
      {
        key: 'include_sections',
        label: 'workflow.builder.nodes.showResults.config.includeSections.label',
        type: 'multiselect',
        options: [
          { 
            value: 'executive_summary', 
            label: 'workflow.builder.nodes.showResults.config.includeSections.options.executiveSummary.label',
            help: 'workflow.builder.nodes.showResults.config.includeSections.options.executiveSummary.help'
          },
          { 
            value: 'themes', 
            label: 'workflow.builder.nodes.showResults.config.includeSections.options.themes.label',
            help: 'workflow.builder.nodes.showResults.config.includeSections.options.themes.help'
          },
          { 
            value: 'recommendations', 
            label: 'workflow.builder.nodes.showResults.config.includeSections.options.recommendations.label',
            help: 'workflow.builder.nodes.showResults.config.includeSections.options.recommendations.help'
          },
          { 
            value: 'statistics', 
            label: 'workflow.builder.nodes.showResults.config.includeSections.options.statistics.label',
            help: 'workflow.builder.nodes.showResults.config.includeSections.options.statistics.help'
          },
          { 
            value: 'data_preview', 
            label: 'workflow.builder.nodes.showResults.config.includeSections.options.dataPreview.label',
            help: 'workflow.builder.nodes.showResults.config.includeSections.options.dataPreview.help'
          }
        ],
        required: false,
        locked: false,
        help: 'workflow.builder.nodes.showResults.config.includeSections.help'
      },
      {
        key: 'statistics_metrics',
        label: 'workflow.builder.nodes.showResults.config.statisticsMetrics.label',
        type: 'multiselect',
        options: [
          { 
            value: 'sentiment_distribution', 
            label: 'workflow.builder.nodes.showResults.config.statisticsMetrics.options.sentimentDistribution.label',
            help: 'workflow.builder.nodes.showResults.config.statisticsMetrics.options.sentimentDistribution.help'
          },
          { 
            value: 'review_summary', 
            label: 'workflow.builder.nodes.showResults.config.statisticsMetrics.options.reviewSummary.label',
            help: 'workflow.builder.nodes.showResults.config.statisticsMetrics.options.reviewSummary.help'
          },
          { 
            value: 'rating_distribution', 
            label: 'workflow.builder.nodes.showResults.config.statisticsMetrics.options.ratingDistribution.label',
            help: 'workflow.builder.nodes.showResults.config.statisticsMetrics.options.ratingDistribution.help'
          },
          { 
            value: 'verified_rate', 
            label: 'workflow.builder.nodes.showResults.config.statisticsMetrics.options.verifiedRate.label',
            help: 'workflow.builder.nodes.showResults.config.statisticsMetrics.options.verifiedRate.help'
          },
          { 
            value: 'theme_coverage', 
            label: 'workflow.builder.nodes.showResults.config.statisticsMetrics.options.themeCoverage.label',
            help: 'workflow.builder.nodes.showResults.config.statisticsMetrics.options.themeCoverage.help'
          },
          { 
            value: 'sentiment_consistency', 
            label: 'workflow.builder.nodes.showResults.config.statisticsMetrics.options.sentimentConsistency.label',
            help: 'workflow.builder.nodes.showResults.config.statisticsMetrics.options.sentimentConsistency.help'
          }
        ],
        required: false,
        locked: false,
        dependsOn: 'include_sections.statistics',
        help: 'workflow.builder.nodes.showResults.config.statisticsMetrics.help'
      },
      {
        key: 'show_visualizations',
        label: 'workflow.builder.nodes.showResults.config.showVisualizations.label',
        type: 'boolean',
        required: false,
        locked: false,
        dependsOn: 'include_sections.statistics',
        help: 'workflow.builder.nodes.showResults.config.showVisualizations.help',
        placeholder: 'workflow.builder.nodes.showResults.config.showVisualizations.placeholder'
      },
      {
        key: 'max_data_items',
        label: 'workflow.builder.nodes.showResults.config.maxDataItems.label',
        type: 'number',
        min: 1,
        max: 1000,
        required: false,
        locked: false,
        dependsOn: 'include_sections.data_preview',
        help: 'workflow.builder.nodes.showResults.config.maxDataItems.help'
      }
    ],
    defaultConfig: {
      include_sections: ['data_preview'],
      max_items: 50
    }
  },
  
  // ============================================
  // LOGIC TOOLS - Will not be used for study!
  // ============================================
/*
  {
    id: 'logic-if', 
    label: 'Logic If',
    type: 'Conditional',
    icon: 'Split',
    color: 'bg-yellow-500',
    category: 'logic',
    hasInput: 1,
    hasOutput: 2,
    maxInputConnections: 1,
    maxOutputConnections: 2,
    description: 'Conditional branching. Routes data to different paths based on conditions (e.g., rating thresholds).',
    editable: true,
    configSchema: [
      {
        key: 'condition_field',
        label: 'Condition Field',
        type: 'select',
        options: () => getWorkflowFilterableColumns().map(col => ({
          value: col.id,
          label: col.label,
          dataType: col.dataType
        })),
        required: true,
        locked: false,
        help: 'Field to evaluate for branching'
      },
      {
        key: 'condition_operator',
        label: 'Condition',
        type: 'select',
        options: 'dynamic',
        required: true,
        locked: false,
        dependsOn: 'condition_field',
        help: 'Comparison operator'
      },
      {
        key: 'condition_value',
        label: 'Value',
        type: 'dynamic',
        required: true,
        locked: false,
        dependsOn: 'condition_field',
        help: 'Value to compare against'
      }
    ],
    defaultConfig: {
      condition_field: 'star_rating',
      condition_operator: 'greater_or_equal',
      condition_value: 4
    }
  },
  {
    id: 'combine-data',
    label: 'Combine Data',
    type: 'Data Processing',
    icon: 'Merge',
    color: 'bg-yellow-500',
    category: 'logic',
    hasInput: 2,
    hasOutput: 1,
    maxInputConnections: 2,
    maxOutputConnections: 1,
    description: 'Combine or merge multiple datasets into a single unified dataset.',
    editable: true,
    configSchema: [
      {
        key: 'merge_strategy',
        label: 'Merge Strategy',
        type: 'select',
        options: [
          { value: 'concatenate', label: 'Concatenate (Stack datasets)' },
          { value: 'union', label: 'Union (Remove duplicates)' },
          { value: 'intersect', label: 'Intersect (Common records only)' }
        ],
        required: true,
        locked: false,
        help: 'Choose how to combine the datasets'
      }
    ],
    defaultConfig: {
      merge_strategy: 'concatenate'
    }
  } 
*/

];


// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get template by ID
 * @param {string} id - Template ID
 * @returns {object|undefined} Template object or undefined
 */
export const getTemplateById = (id) => {
  return NODE_TEMPLATES.find(template => template.id === id);
};

/**
 * Get templates by category
 * @param {string} category - Category name (input/processing/analysis/output/logic)
 * @returns {array} Array of matching templates
 */
export const getTemplatesByCategory = (category) => {
  return NODE_TEMPLATES.filter(template => template.category === category);
};

/**
 * Validate template ID exists
 * @param {string} id - Template ID to validate
 * @returns {boolean} True if template exists
 */
export const isValidTemplateId = (id) => {
  return NODE_TEMPLATES.some(template => template.id === id);
};

/**
 * Check if a node template is editable
 * @param {string} id - Template ID
 * @returns {boolean} True if editable, false otherwise
 */
export const isNodeEditable = (id) => {
  const template = getTemplateById(id);
  return template?.editable !== false; // Default to true if not specified
};

/**
 * Get dynamic label for Load Reviews node based on task
 * @param {string} category - Task category ('headphones' or 'shoes')
 * @returns {string} Dynamic label
 */
export const getLoadReviewsLabel = (category) => {
  console.log("[nodeTemplates] getting LoadReviews Label for category:", category)
  const categoryLabels = {
    'headphones': 'Load Headphone Reviews',
    'shoes': 'Load Shoe Reviews',
    'wireless': 'Load Wireless Reviews'
  };
  return categoryLabels[category] || 'Load Reviews';
};