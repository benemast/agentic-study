// frontend/src/config/executionStatusMessages.js
/**
 * Status messages for execution updates
 * 
 * Hierarchy:
 * 1. type: agent | node | tool | execution
 * 2. tool_id: (only for type=tool) load-reviews | clean-data | filter-reviews | sort-reviews | review-sentiment-analysis | generate-insights | show-results | default
 * 3. subtype: start | progress | end | error | chat | default
 * 4. status: start | running | completed | failed | exception
 */

export const EXECUTION_STATUS_MESSAGES = {
  // ============================================
  // TYPE: TOOL
  // ============================================
  'tool': {
    // Tool: load-reviews
    'load-reviews': {
      'start': {
        'default': 'Loading review data…',
        'start':   'Loading {category} reviews…'
      },
      'progress': {
        'default': 'Processing reviews…',
        'running': 'Loading reviews…',
        'loading': 'Loaded {records_loaded} of {total_available} reviews…'
      },
      'end': {
        'default': 'Reviews loaded successfully',
        'completed': 'Successfully loaded {records_loaded} {category} reviews'
      },
      'error': {
        'default': 'Failed to load reviews',
        'failed': 'Failed to load reviews',
        'exception': 'Error loading reviews'
      }
    },

    // Tool: clean-data
    'clean-data': {
      'start': {
        'default': 'Cleaning data…',
        'start': 'Starting data cleaning…'
      },
      'progress': {
        'default': 'Cleaning in progress…',
        'running': 'Processing data…',
        'missing_data_complete': '• Removed {data.removed} reviews with missing data',
        'spam_complete': '• Removed {data.removed} reviews with malformed data',
        'duplicates_complete': '• {data.removed} dupliate reviews found'
      },
      'end': {
        'default': 'Data cleaning complete',
        'completed': 'Cleaning finished'
      },
      'error': {
        'default': 'Failed to clean data',
        'failed': 'Failed to clean data',
        'exception': 'Error cleaning data'
      }
    },
    
    // Tool: filter-reviews
    'filter-reviews': {
      'start': {
        'default': 'Filtering reviews…',
        'start': 'Applying filters…'
      },
      'progress': {
        'default': 'Filtering in progress…',
        'running': 'Scanning reviews…'
      },
      'end': {
        'default': 'Reviews filtered',
        'completed': 'Filtered to {count} reviews'
      },
      'error': {
        'default': 'Failed to filter reviews',
        'failed': 'Failed to filter reviews',
        'exception': 'Error filtering reviews'
      }
    },
    
    // Tool: sort-reviews
    'sort-reviews': {
      'start': {
        'default': 'Sorting reviews…',
        'start': 'Starting sort operation…'
      },
      'progress': {
        'default': 'Sorting in progress…',
        'running': 'Organizing reviews…'
      },
      'end': {
        'default': 'Reviews sorted',
        'completed': 'Sorting complete'
      },
      'error': {
        'default': 'Failed to sort reviews',
        'failed': 'Failed to sort reviews',
        'exception': 'Error sorting reviews'
      }
    },
    
    // Tool: review-sentiment-analysis

    /*
      message=f"{self.name} calling LLM for analysis.",
      details={
          'records_cnt': total_reviews
      },
      status='LLM_handoff' 
    */

    'review-sentiment-analysis': {
      'start': {
        'default': 'Analyzing sentiment…',
        'start': 'Starting sentiment analysis…'
      },
      'progress': {
        'default': 'Processing reviews…',
        'running': 'Analyzing sentiment…',
        'LLM_handoff': '🔄 Performing sentiment and theme analysis…'
      }, 
      'end': {
        'default': '✅ Sentiment analysis completed.',
        'completed': '✅ Sentiment analysis completed.'
      },
      'error': {
        'default': 'Failed to analyze sentiment',
        'failed': 'Failed to analyze sentiment',
        'exception': 'Error analyzing sentiment'
      }
    },
    
    // Tool: generate-insights
    'generate-insights': {
      'start': {
        'default': 'Generating insights…',
        'start': 'Starting insight generation…'
      },
      'progress': {
        'default': 'Processing data…',
        'running': 'Generating insights…',
        'LLM_handoff': '🔄 Running insight analysis…'
      },
      'end': {
        'default': 'Insights generated',
        'completed': 'Insight generation complete'
      },
      'error': {
        'default': 'Failed to generate insights',
        'failed': 'Failed to generate insights',
        'exception': 'Error generating insights'
      }
    },
    
    // Tool: show-results
    'show-results': {
      'start': {
        'default': 'Preparing results…',
        'start': 'Loading results…'
      },
      'progress': {
        'default': 'Formatting output…',
        'running': 'Preparing display…',
        'LLM_handoff': '🧩 Compiling executive summary and main takeaways…'
      },
      'end': {
        'default': 'Results ready',
        'completed': 'Results displayed'
      },
      'error': {
        'default': 'Failed to show results',
        'failed': 'Failed to show results',
        'exception': 'Error showing results'
      }
    },
    
    // Default tool (fallback)
    'default': {
      'start': {
        'default': 'Starting tool…',
        'start': 'Starting tool…'
      },
      'progress': {
        'default': 'Processing…',
        'running': '{tool_name} running…',
      },
      'end': {
        'default': 'Tool completed',
        'completed': 'Completed successfully'
      },
      'error': {
        'default': 'Tool failed',
        'failed': 'Tool failed',
        'exception': 'Tool error'
      }
    }
  },
  
  // ============================================
  // TYPE: NODE
  // ============================================
  'node': {
    'load-reviews': {
      'start': {
        'default': 'Starting step…',
        'start': '{data.step_number}. Loading reviews…'
      },
      'progress': {
        'default': 'Processing…',
        'running': '{node_label} running…'
      },
      'end': {
        'default': 'Step completed',
        'completed': '✅ Loaded {data.results.total} reviews successfully.\n',
        'failed': '{node_label} failed',
      },
      'error': {
        'default': 'Step failed',
        'failed': '{data.error}',
        'exception': '{data.error}'
      }
    },
    'clean-data': {
      'start': {
        'default': 'Starting step…',
        'start': '{data.step_number}. Cleaning reviews…'
      },
      'progress': {
        'default': 'Processing…',
        'running': '{node_label} running…'
      },
      'end': {
        'default': 'Step completed',
        'completed': '✅ Removed {data.results.summary.total_removed} low-quality reviews.\n📊 {data.results.summary.records_after} reviews remaining (data quality: {data.results.summary.quality_score}%).\n',
        'failed': '{node_label} failed',
      },
      'error': {
        'default': 'Step failed',
        'failed': '{data.error}',
        'exception': '{data.error}'
      }
    },
    'filter-reviews': {
      'start': {
        'default': 'Starting step…',
        'start': '{data.step_number}. Filtering reviews…'
      },
      'progress': {
        'default': 'Processing…',
        'running': '{node_label} running…'
      },
      'end': {
        'default': 'Step completed',
        'completed': '✅ Filters applied.\n• Removed {data.results.summary.records_removed} non-matching reviews.\n• {data.results.summary.records_after} reviews remaining.\n',
        'failed': '{node_label} failed',
      },
      'error': {
        'default': 'Step failed',
        'failed': '{data.error}',
        'exception': '{data.error}'
      }
    },
    'sort-reviews': {
      'start': {
        'default': 'Starting step…',
        'start': '{data.step_number}. Sorting reviews…'
      },
      'progress': {
        'default': 'Processing…',
        'running': '{node_label} running…'
      },
      'end': {
        'default': 'Step completed',
        'completed': '✅ Sorted by {data.results.summary.sort_field} ({data.results.summary.sort_order}).\n',
        'failed': '{node_label} failed',
      },
      'error': {
        'default': 'Step failed',
        'failed': '{data.error}',
        'exception': '{data.error}'
      }
    },
    'review-sentiment-analysis': {
      'start': {
        'default': 'Starting step…',
        'start': '{data.step_number}. Analyzing sentiment and extracting themes…'
      },
      'progress': {
        'default': 'Processing…',
        'running': '{node_label} running…'
      },
      'end': {
        'default': 'Step completed',
        'completed': '{node_label} completed\n',
        'failed': '{node_label} failed',
      },
      'error': {
        'default': 'Step failed',
        'failed': '{node_label} failed',
        'exception': '{node_label} error'
      }
    },
    'generate-insights': {
      'start': {
        'default': 'Starting step…',
        'start': '{data.step_number}. Generating insights…'
      },
      'progress': {
        'default': 'Processing…',
        'running': '{node_label} running…'
      },
      'end': {
        'default': 'Step completed',
        'completed': '✅ Insights generated successfully.\n',
        'failed': '{node_label} failed',
      },
      'error': {
        'default': 'Step failed',
        'failed': '{node_label} failed',
        'exception': '{node_label} error'
      }
    },
    'show-results': {
      'start': {
        'default': 'Starting step…',
        'start': '{data.step_number}. Preparing results…'
      },
      'progress': {
        'default': 'Processing…',
        'running': '{node_label} running…'
      },
      'end': {
        'default': 'Step completed',
        'completed': '✅ Formatting complete.\n',
        'failed': '{node_label} failed',
      },
      'error': {
        'default': 'Step failed',
        'failed': '{data.error}',
        'exception': '{data.error}'
      }
    },
    // Default node config (fallback)
    'default': {
      'start': {
        'default': 'Starting step…',
        'start': '{data.step_number}. {data.node_label}…'
      },
      'progress': {
        'default': 'Processing…',
        'running': '{node_label} running…'
      },
      'end': {
        'default': 'Step completed',
        'completed': '{node_label} completed\n',
        'failed': '{node_label} failed',
      },
      'error': {
        'default': 'Step failed',
        'failed': '{node_label} failed',
        'exception': '{node_label} error'
      }
    }
  },
  
  // ============================================
  // TYPE: EXECUTION
  // ============================================
  'execution': {
    'start': {
      'default': 'Starting execution…',
      'start': 'Execution started'
    },
    'progress': {
      'default': 'Executing…',
      'running': 'Execution in progress…'
    },
    'end': {
      'default': 'Execution complete',
      'failed': 'Execution failed',
      'completed': 'Execution completed'
    },
    'error': {
      'default': 'Execution failed',
      'failed': 'Execution failed',
      'exception': 'Execution error'
    }
  },
  
  // ============================================
  // TYPE: AGENT
  // ============================================
  'agent': {
    'start': {
      'default': 'Agent starting…',
      'start': 'Agent starting…',
      'running': 'Agent analyzing task…'
    },
    'progress': {
      'default': 'Agent working…',
      'running': 'Agent processing…',
      'decision': '{data.decision}\n'
    },
    'chat': {
      'default': '{content}',
      'completed': '{content}'
    },
    'end': {
      'default': 'Agent finished',
      'completed': 'Summary:\n{summary}'
    },
    'error': {
      'default': 'Agent failed',
      'failed': 'Agent failed',
      'exception': 'Agent error'
    }
  }
};

// ========================================
// TEMPLATE SUBSTITUTION WITH CACHING
// ========================================

const templateCache = new Map();
const CACHE_SIZE_LIMIT = 100;

const applyTemplateSubstitution = (template, data) => {
  const cacheKey = `${template}::${JSON.stringify(data)}`;
  
  if (templateCache.has(cacheKey)) {
    return templateCache.get(cacheKey);
  }
  
  let result = template;
  
  // Find all placeholders in the template (e.g., {key} or {data.key})
  const placeholders = template.match(/\{[^}]+\}/g) || [];
  
  placeholders.forEach(placeholder => {
    const path = placeholder.slice(1, -1); // Remove { and }
    
    // Handle nested paths (e.g., "data.node_label")
    let value;
    if (path.includes('.')) {
      const keys = path.split('.');
      value = keys.reduce((obj, key) => obj?.[key], data);
    } else {
      // Direct key access
      value = data[path];
    }
    
    // Format the value
    let formattedValue = value;
    if (typeof value === 'number') {
      formattedValue = value % 1 === 0 ? value : value.toFixed(2);
    } else if (value === null || value === undefined) {
      formattedValue = 'N/A';
    }
    
    // Replace placeholder
    result = result.replace(
      new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), 
      formattedValue
    );
  });
  
  if (templateCache.size >= CACHE_SIZE_LIMIT) {
    const firstKey = templateCache.keys().next().value;
    templateCache.delete(firstKey);
  }
  templateCache.set(cacheKey, result);
  
  return result;
};

/**
 * Get status message from configuration with dynamic data substitution
 * 
 * @param {string} type - Message type: agent | node | tool | execution
 * @param {string} subtype - Message subtype: start | progress | end | error | chat | default
 * @param {string} status - Specific status: start | running | completed | failed | exception
 * @param {Object} data - Data object containing fields for substitution
 * @param {string} itemId - For type=tool: toolId (e.g. 'load-reviews'); For type=node: nodeId (e.g. 'node-1')
 * @param {Function} t - Optional translation function from useTranslation
 * @returns {string|null} Formatted status message or null if no template found
 */
export const getExecutionStatusMessage = (type, subtype, status = null, data = {}, itemId = null, t = null) => {
  
  // If translation function provided, use translated templates
  if (t) {
    // Build translation key: execution.tool.clean-data.progress.missing_data_complete
    const keyParts = ['execution', type];
    if (itemId) keyParts.push(itemId);
    keyParts.push(subtype);
    if (status) keyParts.push(status);
    
    const translationKey = keyParts.join('.');
    const translated = t(translationKey);
    
    // If translation found (not just the key returned), use it
    if (translated !== translationKey) {
      return applyTemplateSubstitution(translated, data);
    }
    
    // Try without status as fallback
    if (status) {
      const fallbackKey = keyParts.slice(0, -1).concat('default').join('.');
      const fallbackTranslated = t(fallbackKey);
      if (fallbackTranslated !== fallbackKey) {
        return applyTemplateSubstitution(fallbackTranslated, data);
      }
    }
  }

  // Navigate config: type → subtype → status
  const typeConfig = EXECUTION_STATUS_MESSAGES[type];
  if (!typeConfig) {
    console.warn(`NO CONFIG - type: "${type}" not found`);
    return null;
  }
  
  // For type=tool or type=node, navigate through itemId level if specific config exists
  let subtypeConfig;
  if (type === 'tool' && itemId) {
    const toolConfig = typeConfig[itemId] || typeConfig['default'];
    if (!toolConfig) {
      console.warn(`NO CONFIG - toolId: "${itemId}" not found and no default available`);
      return null;
    }
    
    subtypeConfig = toolConfig[subtype];
  } else if (type === 'node' && itemId) {
    // Use same pattern as tools: check for specific nodeId, fallback to 'default'
    const nodeConfig = typeConfig[itemId] || typeConfig['default'];
    if (!nodeConfig) {
      console.warn(`NO CONFIG - nodeId: "${itemId}" not found and no default available`);
      return null;
    }
    
    subtypeConfig = nodeConfig[subtype];
  } else {
    subtypeConfig = typeConfig[subtype];
  }
  
  if (!subtypeConfig) {
    console.warn(`NO CONFIG - subtype: "${subtype}" not found`);
    return null;
  }
  
  // Get message template
  let template;
  let matchedKey = null;
  
  if (status && subtypeConfig[status]) {
    // Specific status message
    template = subtypeConfig[status];
    matchedKey = status;
  } else if (subtypeConfig.default) {
    // Default message for this subtype
    template = subtypeConfig.default;
    matchedKey = 'default';
  } else {
    return null;
  }
  
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