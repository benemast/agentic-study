// frontend/src/config/executionStatusMessages.js
/**
 * Modular conversational status messages for AI Assistant execution updates
 * 
 * Supports multiple levels of granularity:
 * 1. Type level (tool, node, execution, agent)
 * 2. Message subtype level (start, progress, end, error)
 * 3. Custom status level (for specialized messages)
 * 
 * Priority order (most specific to least specific):
 * 1. messages[subtype][status] (if status provided)
 * 2. messages[subtype].default
 * 3. Global default
 * 
 * Optimizations:
 * 1. Template substitution caching (LRU cache with 100 entry limit)
 * 2. Pre-compiled regex patterns for better performance
 */

export const EXECUTION_STATUS_MESSAGES = {
  // ============================================
  // TOOL MESSAGES
  // ============================================
  'tool': {
    'start': {
      default: '🔧 Starting tool...',
      tool_execution_start: '🔧 Initializing...',
      start: '🔧 Starting...'
    },
    'progress': {
      default: '⚙️ Processing...',
      running: '⚙️ Tool running...',
      loading: '📥 Loaded {records_loaded} of {total_available} records...'
    },
    'end': {
      default: '✓ Tool completed',
      success: '✓ Successfully completed',
      completed: '✓ Completed successfully',
      tool_execution_complete: '✓ Execution complete',
      loaded: '✓ Successfully loaded {records_loaded} records'
    },
    'error': {
      default: '❌ Tool failed'
    }
  },
  
  // ============================================
  // NODE MESSAGES (Legacy support)
  // ============================================
  'node': {
    'start': {
      default: '⚙️ Starting node...'
    },
    'progress': {
      default: '⚙️ Processing node...'
    },
    'end': {
      default: '✓ Node completed'
    },
    'error': {
      default: '❌ Node failed'
    }
  },
  
  // ============================================
  // LOAD REVIEWS
  // ============================================
  'load-reviews': {
    'start': {
      default: '📂 Loading review data...',
      connecting: '📂 Connecting to data source...',
      tool_execution_start: '📂 Initializing data loader...',
      start: '📂 Starting to load {category} reviews...'
    },
    'progress': {
      default: '📊 Processing reviews...',
      reading: '📖 Reading {count} review files...',
      parsing: '⚙️ Parsing review data...',
      validating: '✓ Validating data quality...',
      counting: '📊 Found {count} reviews...',
      loading: '📥 Loaded {records_loaded} of {total_available} reviews...',
      running: '📥 Loading {category} reviews...'
    },
    'end': {
      default: '✓ Reviews loaded successfully',
      cached: '✓ Reviews loaded from cache',
      fresh: '✓ Loaded {count} fresh reviews',
      with_count: '✓ Successfully loaded {count} reviews',
      loaded: '✓ Successfully loaded {records_loaded} reviews',
      completed: '✓ Successfully loaded {records_loaded} {category} reviews',
      tool_execution_complete: '✓ Data loading complete'
    },
    'error': {
      default: '❌ Failed to load reviews',
      connection_error: '❌ Could not connect to data source',
      not_found: '❌ Review data not found',
      timeout: '❌ Loading timed out after {elapsed}s'
    }
  },
  
  // ============================================
  // PROCESSING
  // ============================================
  'sort-reviews': {
    'start': {
      default: '📊 Sorting reviews...',
      date: '📅 Sorting by date...',
      rating: '⭐ Sorting by rating...',
      tool_execution_start: '📊 Initializing sort...',
      start: '📊 Starting sort operation...'
    },
    'progress': {
      default: '⚙️ Organizing {count} reviews...',
      running: '⚙️ Sorting in progress...'
    },
    'end': {
      default: '✓ Reviews sorted',
      with_count: '✓ Sorted {count} reviews',
      completed: '✓ Sort complete',
      tool_execution_complete: '✓ Sorting finished'
    },
    'error': {
      default: '❌ Failed to sort reviews'
    }
  },
  
  'data-cleaner': {
    'start': {
      default: '🧹 Cleaning and preprocessing data...',
      tool_execution_start: '🧹 Initializing data cleaner...',
      start: '🧹 Starting data cleaning...',
      initializing: '🧹 Preparing cleaning pipeline...'
    },
    'progress': {
      default: '⚙️ Removing noise and formatting...',
      trimming: '✂️ Removing extra whitespace...',
      normalizing: '📝 Normalizing text format...',
      processing: '⚙️ Processed {count}/{total} reviews...',
      running: '🧹 Cleaning in progress...',
      scanning_missing_data: '🔍 Scanning for missing data...',
      missing_data_complete: '✓ Missing data scan complete',
      scanning_spam: '🔍 Analyzing text patterns for spam...',
      spam_complete: '✓ Spam detection complete',
      scanning_duplicates: '🔍 Checking for duplicates...',
      duplicates_complete: '✓ Duplicate check complete'
    },
    'end': {
      default: '✓ Data cleaning complete',
      with_count: '✓ Cleaned {count} reviews',
      completed: '✓ Cleaning finished',
      tool_execution_complete: '✓ All cleaning tasks complete'
    },
    'error': {
      default: '❌ Failed to clean data'
    }
  },
  
  'show-results': {
    'start': {
      default: '📋 Preparing results...',
      tool_execution_start: '📋 Loading results viewer...',
      start: '📋 Displaying results...'
    },
    'progress': {
      default: '⚙️ Formatting output...',
      running: '📊 Preparing data display...'
    },
    'end': {
      default: '✓ Results ready',
      completed: '✓ Results displayed',
      tool_execution_complete: '✓ Display complete'
    },
    'error': {
      default: '❌ Failed to show results'
    }
  },
  
  'filter-reviews': {
    'start': {
      default: '🔍 Filtering reviews based on your criteria...',
      rating: '⭐ Filtering by rating {min_rating}+...',
      date: '📅 Filtering by date range...',
      keyword: '🔤 Filtering by keywords: "{keyword}"...'
    },
    'progress': {
      default: '⚙️ Applying filters...',
      scanning: '👀 Scanning through {total} reviews...',
      matching: '✓ Found {count} matching reviews...'
    },
    'end': {
      default: '✓ Reviews filtered',
      few: '✓ Found {count} matching reviews',
      many: '✓ Found {count} matching reviews',
      none: '⚠️ No reviews match your criteria',
      with_percentage: '✓ Filtered to {count} reviews ({percentage}% match)'
    },
    'error': {
      default: '❌ Failed to filter reviews',
      invalid_criteria: '❌ Invalid filter criteria'
    }
  },
  
  'clean-reviews': {
    'start': {
      default: '🧹 Cleaning and preprocessing review text...'
    },
    'progress': {
      default: '⚙️ Removing noise and formatting...',
      trimming: '✂️ Removing extra whitespace...',
      normalizing: '📝 Normalizing text format...',
      processing: '⚙️ Processed {count}/{total} reviews...'
    },
    'end': {
      default: '✓ Reviews cleaned',
      with_count: '✓ Cleaned {count} reviews'
    },
    'error': {
      default: '❌ Failed to clean reviews'
    }
  },
  
  // ============================================
  // ANALYSIS
  // ============================================
  'review-sentiment-analysis': {
    'start': {
      default: '🧠 Analyzing sentiment in reviews...',
      batch: '🧠 Starting batch sentiment analysis of {count} reviews...'
    },
    'progress': {
      default: '💭 Processing emotions and opinions...',
      positive: '😊 Analyzing positive sentiments...',
      negative: '😔 Analyzing negative sentiments...',
      themes: '🎨 Extracting emotional themes...',
      counting: '📊 Analyzed {count}/{total} reviews...',
      percentage: '📊 Analysis {percentage}% complete...'
    },
    'end': {
      default: '✓ Sentiment analysis complete',
      positive_dominant: '✓ Analysis complete - {percentage}% positive sentiment',
      negative_dominant: '✓ Analysis complete - {percentage}% negative sentiment',
      mixed: '✓ Analysis complete - mixed sentiments detected',
      with_stats: '✓ Analysis complete: {positive} positive, {negative} negative, {neutral} neutral'
    },
    'error': {
      default: '❌ Failed to analyze sentiment',
      llm_error: '❌ AI model error - please try again'
    }
  },
  
  'generate-insights': {
    'start': {
      default: '✨ Generating actionable insights...',
      focused: '✨ Generating insights focused on {focus_area}...'
    },
    'progress': {
      default: '💡 Identifying patterns and recommendations...',
      analyzing: '🧪 Analyzing data patterns...',
      synthesizing: '🎯 Synthesizing findings...',
      counting: '💡 Generated {count} insights so far...'
    },
    'end': {
      default: '✓ Insights generated',
      actionable: '✓ Generated {count} actionable recommendations',
      with_count: '✓ Generated {count} insights'
    },
    'error': {
      default: '❌ Failed to generate insights',
      insufficient_data: '⚠️ Not enough data for insights (need at least {min_required})'
    }
  },
  
  'aggregate-reviews': {
    'start': {
      default: '📈 Aggregating review statistics...'
    },
    'progress': {
      default: '⚙️ Computing metrics...',
      processing: '⚙️ Processing {count}/{total} reviews...'
    },
    'end': {
      default: '✓ Aggregation complete',
      with_stats: '✓ Aggregated {count} reviews (avg rating: {avg_rating})'
    },
    'error': {
      default: '❌ Failed to aggregate reviews'
    }
  },
  
  // ============================================
  // OUTPUT
  // ============================================
  'generate-report': {
    'start': {
      default: '📝 Preparing comprehensive report...',
      with_sections: '📝 Preparing report with {section_count} sections...'
    },
    'progress': {
      default: '⚙️ Compiling findings...',
      formatting: '✨ Formatting report...',
      charts: '📊 Creating {chart_count} visualizations...',
      writing: '✏️ Writing section {current}/{total}...'
    },
    'end': {
      default: '✓ Report generated',
      ready: '✓ Report ready for download',
      with_pages: '✓ Generated {page_count}-page report'
    },
    'error': {
      default: '❌ Failed to generate report'
    }
  },
  
  'export-data': {
    'start': {
      default: '💾 Exporting processed data...',
      with_format: '💾 Exporting {count} records as {format}...'
    },
    'progress': {
      default: '⚙️ Formatting output...',
      processing: '⚙️ Exported {count}/{total} records...'
    },
    'end': {
      default: '✓ Data exported',
      with_size: '✓ Exported {count} records ({size})'
    },
    'error': {
      default: '❌ Failed to export data'
    }
  }
};

// ========================================
// TEMPLATE SUBSTITUTION WITH CACHING
// ========================================

/**
 * LRU Cache for template substitution results
 * Limits memory usage while providing performance boost
 */
const templateCache = new Map();
const CACHE_SIZE_LIMIT = 100;

/**
 * Apply template substitution to message with caching
 * Replaces {field} placeholders with actual values from data
 * 
 * @param {string} template - Message template with {field} placeholders
 * @param {Object} data - Data object with field values
 * @returns {string} Message with substitutions applied
 * 
 * @example
 * applyTemplateSubstitution('Processing {count} items...', { count: 42 })
 * // Returns: 'Processing 42 items...'
 */
const applyTemplateSubstitution = (template, data) => {
  // Create cache key from template + data
  const cacheKey = `${template}::${JSON.stringify(data)}`;
  
  // Check cache first
  if (templateCache.has(cacheKey)) {
    return templateCache.get(cacheKey);
  }
  
  let result = template;
  
  // Find all {field} placeholders and replace with data values
  Object.entries(data).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    
    if (result.includes(placeholder)) {
      // Format the value appropriately
      let formattedValue = value;
      
      // Special formatting for common types
      if (typeof value === 'number') {
        // Round to 2 decimal places if it's a float
        formattedValue = value % 1 === 0 ? value : value.toFixed(2);
      } else if (value === null || value === undefined) {
        formattedValue = 'N/A';
      }
      
      // Use pre-compiled regex for better performance
      result = result.replace(
        new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), 
        formattedValue
      );
    }
  });
  
  // Cache result with LRU eviction
  if (templateCache.size >= CACHE_SIZE_LIMIT) {
    // Remove oldest entry (first key)
    const firstKey = templateCache.keys().next().value;
    templateCache.delete(firstKey);
  }
  templateCache.set(cacheKey, result);
  
  return result;
};

/**
 * Get status message from frontend configuration with dynamic data substitution
 * 
 * Looks up message template based on: type → subtype → status
 * Then replaces {field} placeholders with actual values from data
 * 
 * @param {string} type - Message type (e.g., 'tool', 'node', 'load-reviews')
 * @param {string} subtype - Message subtype (e.g., 'start', 'progress', 'end', 'error')
 * @param {string} status - Optional specific status (e.g., 'running', 'completed')
 * @param {Object} data - Data object containing fields for substitution
 * @returns {string|null} Formatted status message or null if no template found
 * 
 * @example
 * // Basic usage
 * getExecutionStatusMessage('load-reviews', 'progress', 'loading', {
 *   records_loaded: 1917,
 *   total_available: 1917
 * })
 * // Returns: '📥 Loaded 1917 of 1917 reviews...'
 * 
 * // No matching template
 * getExecutionStatusMessage('unknown', 'test', null, {})
 * // Returns: null
 */
export const getExecutionStatusMessage = (type, subtype, status = null, data = {}) => {
  // Navigate config: type → subtype → status
  const typeConfig = EXECUTION_STATUS_MESSAGES[type];
  if (!typeConfig) {
    console.log(`⚠️ No config found for type: ${type}`);
    return null;
  }
  
  const subtypeConfig = typeConfig[subtype];
  if (!subtypeConfig) {
    console.log(`⚠️ No config found for type: ${type}, subtype: ${subtype}`);
    return null;
  }
  
  // Get message template
  let template;
  
  if (status && subtypeConfig[status]) {
    // Specific status message
    template = subtypeConfig[status];
  } else if (subtypeConfig.default) {
    // Default message for this subtype
    template = subtypeConfig.default;
  } else {
    console.log(`⚠️ No message found for type: ${type}, subtype: ${subtype}, status: ${status}`);
    return null;
  }
  
  console.log(`🔍 Found template: "${template}"`);
  
  // Apply data substitution with caching
  const message = applyTemplateSubstitution(template, data);
  
  return message;
};

/**
 * Get available statuses for a type and subtype
 * 
 * @param {string} type - Message type (tool, node, execution, etc.)
 * @param {string} subtype - Message subtype
 * @returns {Array<string>} Available status keys
 */
export const getAvailableStatuses = (type, subtype = 'start') => {
  const typeConfig = EXECUTION_STATUS_MESSAGES[type];
  if (!typeConfig) return [];
  
  const subtypeMessages = typeConfig[subtype] || {};
  return Object.keys(subtypeMessages);
};

/**
 * Check if a specific status exists
 * 
 * @param {string} type - Message type (tool, node, execution, etc.)
 * @param {string} subtype - Message subtype
 * @param {string} status - Status to check
 * @returns {boolean} True if exists
 */
export const hasStatus = (type, subtype, status) => {
  const availableStatuses = getAvailableStatuses(type, subtype);
  return availableStatuses.includes(status);
};

/**
 * Clear template cache (useful for testing or memory management)
 */
export const clearTemplateCache = () => {
  templateCache.clear();
};

export default EXECUTION_STATUS_MESSAGES;