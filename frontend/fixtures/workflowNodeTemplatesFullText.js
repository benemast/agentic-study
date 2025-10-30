export const NODE_TEMPLATES = [
  // ============================================
  // DATA INPUT TOOLS
  // ============================================
  {
    id: 'load-reviews',
    label: 'Load Reviews',
    type: 'Data Input',
    icon: 'FileInput',
    color: 'bg-blue-500',
    category: 'input',
    hasInput: 0,
    hasOutput: 1,
    maxInputConnections: 0,
    maxOutputConnections: 3,
    description: 'Load product reviews from database. Supports shoes and wireless categories with filtering options.',
    editable: true,
    configSchema: [
      {
        key: 'category',
        label: 'Product Category',
        type: 'select',
        options: [
          { value: 'shoes', label: 'Shoes' },
          { value: 'wireless', label: 'Wireless Headphones' }
        ],
        required: false,
        locked: true,
        help: 'Select which product category to load reviews from'
      },
      {
        key: 'limit',
        label: 'Maximum Reviews',
        type: 'number',
        min: 1,
        max: 10000,
        required: false,
        locked: false,
        help: 'Limit the number of reviews to load (leave empty for all)'
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
    id: 'filter-reviews',
    label: 'Filter Reviews', 
    type: 'Data Processing',
    icon: 'Filter',
    color: 'bg-green-500',
    category: 'processing',
    hasInput: 1,
    hasOutput: 1,
    maxInputConnections: 1,
    maxOutputConnections: 1,
    description: 'Filter reviews by rating, verified status, helpfulness, or text content. Supports multiple filter conditions.',
    editable: true,
    configSchema: [
      {
        key: 'field',
        label: 'Filter Column',
        type: 'select',
        options: () => getWorkflowFilterableColumns().map(col => ({
          value: col.id,
          label: col.label,
          dataType: col.dataType
        })),
        required: true,
        locked: false,
        help: 'Select which column to filter by'
      },
      {
        key: 'operator',
        label: 'Filter Condition',
        type: 'select',
        options: 'dynamic', // Will be populated based on selected field's dataType
        required: true,
        locked: false,
        dependsOn: 'field',
        help: 'Select how to compare the values'
      },
      {
        key: 'value',
        label: 'Filter Value',
        type: 'dynamic', // Will be text/number/boolean based on field dataType
        required: true,
        locked: false,
        dependsOn: 'field',
        help: 'Enter the value to filter by'
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
    label: 'Sort Reviews',
    type: 'Data Processing',
    icon: 'ArrowDownNarrowWide',
    color: 'bg-green-500',
    category: 'processing',
    hasInput: 1,
    hasOutput: 1,
    maxInputConnections: 1,
    maxOutputConnections: 1,
    description: 'Sort reviews by rating, helpfulness, engagement metrics, or date.',
    editable: true,
    configSchema: [
      {
        key: 'sort_by',
        label: 'Sort By Column',
        type: 'select',
        options: () => getWorkflowSortableColumns().map(col => ({
          value: col.id,
          label: col.label
        })),
        required: true,
        locked: false,
        help: 'Select which column to sort by'
      },
      {
        key: 'descending',
        label: 'Sort Direction',
        type: 'select',
        options: [
          { value: true, label: 'Descending (High to Low)' },
          { value: false, label: 'Ascending (Low to High)' }
        ],
        required: true,
        locked: false,
        help: 'Choose sort direction'
      }
    ],
    defaultConfig: {
      sort_by: null,
      descending: true
    }
  },
  {
    id: 'clean-data',
    label: 'Clean Data', 
    type: 'Data Processing',
    icon: 'BrushCleaning',
    color: 'bg-green-500',
    category: 'processing',
    hasInput: 1,
    hasOutput: 1,
    maxInputConnections: 1,
    maxOutputConnections: 1,
    description: 'Clean and normalize data by removing nulls, standardizing formats, and fixing data quality issues.',
    editable: true,
    configSchema: [
      {
        key: 'remove_nulls',
        label: 'Remove Null Values',
        type: 'boolean',
        required: false,
        locked: false,
        help: 'Remove records with null/empty values in key fields'
      },
      {
        key: 'normalize_text',
        label: 'Normalize Text',
        type: 'boolean',
        required: false,
        locked: false,
        help: 'Standardize text formatting and remove special characters'
      },
      {
        key: 'remove_duplicates',
        label: 'Remove Duplicates',
        type: 'boolean',
        required: false,
        locked: false,
        help: 'Remove duplicate reviews based on review ID'
      }
    ],
    defaultConfig: {
      remove_nulls: true,
      normalize_text: true,
      remove_duplicates: false
    }
  },
  
  // ============================================
  // ANALYSIS TOOLS
  // ============================================
  {
    id: 'review-sentiment-analysis',
    label: 'Sentiment Analysis',
    type: 'AI Operation', 
    icon: 'BarChart3',
    color: 'bg-purple-500',
    category: 'analysis',
    hasInput: 1,
    hasOutput: 1,
    maxInputConnections: 1,
    maxOutputConnections: 1,
    description: 'Extract key themes and sentiment patterns from customer reviews. Identifies what customers discuss most and how they feel about specific product aspects.',
    editable: true,
    configSchema: [
      {
        key: 'extract_themes',
        label: 'Extract Key Themes',
        type: 'boolean',
        required: true,
        locked: true,
        help: 'Identify recurring topics customers discuss (e.g., comfort, durability, price)'
      },
      {
        key: 'theme_separation',
        label: 'Theme Organization',
        type: 'select',
        options: [
          { value: 'combined', label: 'All Themes Together' },
          { value: 'by_sentiment', label: 'Separate Positive/Negative Themes' }
        ],
        required: true,
        locked: false,
        help: 'How should themes be categorized?'
      },
      {
        key: 'max_themes_per_category',
        label: 'Number of Themes',
        type: 'number',
        min: 1,
        max: 10,
        required: true,
        locked: false,
        help: 'How many themes to extract per category'
      },
      {
        key: 'include_percentages',
        label: 'Include Theme Percentages',
        type: 'boolean',
        required: false,
        locked: false,
        help: 'Calculate frequency percentage for each theme'
      }
    ],
    defaultConfig: {
      extract_themes: true,
      theme_separation: 'combined',
      max_themes_per_category: 1,
      include_percentages: false,
      include_summary: false
    }
  },
  {
    id: 'generate-insights', 
    label: 'Generate Insights',
    type: 'AI Operation',
    icon: 'Brain',
    color: 'bg-orange-500', 
    category: 'analysis',
    hasInput: 1,
    hasOutput: 1,
    maxInputConnections: 1,
    maxOutputConnections: 1,
    description: 'Generate actionable business recommendations based on customer feedback analysis. Translates patterns into strategic next steps.',
    editable: true,
    configSchema: [
      {
        key: 'focus_area',
        label: 'Recommendation Focus',
        type: 'multiselect',
        options: [
          { value: 'competitive_positioning', label: 'Competitive Positioning' },
          { value: 'customer_experience', label: 'Customer Experience' },
          { value: 'marketing_messages', label: 'Marketing Messages' },
          { value: 'product_improvements', label: 'Product Improvements' }
        ],
        required: true,
        locked: false,
        help: 'What type of recommendations to prioritize'
      },
      {
        key: 'max_recommendations',
        label: 'Number of Recommendations',
        type: 'number',
        min: 1,
        max: 10,
        required: true,
        locked: false,
        help: 'Maximum number of recommendations to generate'
      }
    ],
    defaultConfig: {
      focus_area: null,
      max_recommendations: null
    }
  },
  
  // ============================================
  // OUTPUT TOOLS
  // ============================================
  {
    id: 'show-results',
    label: 'Show Results',
    type: 'Output',
    icon: 'FileOutput',
    color: 'bg-indigo-500',
    category: 'output',
    hasInput: 1,
    hasOutput: 0,
    maxInputConnections: 1,
    maxOutputConnections: 0,
    description: 'Format and display final results. Organizes available data into structured report sections.',
    note: 'Only data available from previous tools will be displayed. Unavailable datasections will be marked.',
    editable: true,
    configSchema: [
      {
        key: 'include_sections',
        label: 'Report Sections',
        type: 'multiselect',
        options: [
          { value: 'executive_summary', label: 'Executive Summary', help: 'High-level overview of findings and key takeaways' },
          { value: 'themes', label: 'Key Themes', help: 'Extracted themes with frequencies and sentiment' },
          { value: 'recommendations', label: 'Recommendations', help: 'Actionable business recommendations' },
          { value: 'statistics', label: 'Statistics & Metrics', help: 'Quantitative data and distribution metrics' },
          { value: 'data_preview', label: 'Data Preview', help: 'Sample of raw review data' }
        ],
        required: false,
        locked: false,
        help: 'Select sections to include. '
      },
      {
        key: 'statistics_metrics',
        label: 'Statistics to Display',
        type: 'multiselect',
        options: [
          { 
            value: 'sentiment_distribution', 
            label: 'Overall Sentiment Distribution',
            help: 'Percentage breakdown of positive, neutral, and negative reviews'
          },
          { 
            value: 'review_summary', 
            label: 'Total Reviews & Average Rating',
            help: 'Total number of reviews analyzed and mean rating'
          },
          { 
            value: 'rating_distribution', 
            label: 'Rating Distribution',
            help: 'Count and percentage of reviews by rating (1-5 stars)'
          },
          { 
            value: 'verified_rate', 
            label: 'Verified Purchase Rate',
            help: 'Percentage of reviews from verified purchases vs. unverified'
          },
          { 
            value: 'theme_coverage', 
            label: 'Theme Coverage',
            help: 'Percentage of reviews that mention identified themes'
          },
          { 
            value: 'sentiment_consistency', 
            label: 'Sentiment Consistency',
            help: 'Correlation between star ratings and sentiment classification'
          }
        ],
        required: false,
        locked: false,
        dependsOn: 'include_sections.statistics',
        help: 'Select which statistics to include (only shown if Statistics section is enabled)'
      },
      {
        key: 'show_visualizations',
        label: 'Include Visualizations',
        type: 'boolean',
        required: false,
        locked: false,
        dependsOn: 'include_sections.statistics',
        help: 'Display charts and graphs where applicable'
      },
      {
        key: 'max_data_items',
        label: 'Maximum Items to Display in Data Preview',
        type: 'number',
        min: 1,
        max: 1000,
        required: false,
        locked: false,
        dependsOn: 'include_sections.data_preview',
        help: 'Limit number of items shown (for data tables/lists)'
      }
    ],
    defaultConfig: {
      include_sections: ['data_table'],
      max_items: 50
    }
  }
];
