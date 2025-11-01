// frontend/src/utils/workflowSerializer.js

/**
 * Enhanced workflow serializer with translation resolution
 */

/**
 * Resolve translation key to actual text
 * @param {string} key - Translation key
 * @param {Function} t - Translation function from useTranslation
 * @returns {string} Translated text or original key if translation fails
 */
const resolveTranslation = (key, t) => {
  if (!key || typeof key !== 'string') return key;
  
  // If it doesn't look like a translation key, return as-is
  if (!key.includes('.')) return key;
  
  try {
    const translated = t(key);
    // If translation failed, it returns the key itself
    return translated === key ? key : translated;
  } catch (err) {
    console.warn(`Failed to translate key: ${key}`);
    return key;
  }
};

/**
 * Resolve all translation keys in configSchema
 * @param {Array} configSchema - Schema with translation keys
 * @param {Function} t - Translation function
 * @returns {Array} Schema with resolved translations
 */
const resolveConfigSchemaTranslations = (configSchema, t) => {
  if (!Array.isArray(configSchema)) return [];
  
  return configSchema.map(field => {
    const resolvedField = {
      ...field,
      label: resolveTranslation(field.label, t),
      help: field.help ? resolveTranslation(field.help, t) : undefined,
      placeholder: field.placeholder ? resolveTranslation(field.placeholder, t) : undefined
    };
    
    // Resolve option labels if present
    if (Array.isArray(field.options)) {
      resolvedField.options = field.options.map(opt => ({
        ...opt,
        label: resolveTranslation(opt.label, t),
        help: opt.help ? resolveTranslation(opt.help, t) : undefined
      }));
    }
    
    // Remove undefined values
    Object.keys(resolvedField).forEach(key => {
      if (resolvedField[key] === undefined) {
        delete resolvedField[key];
      }
    });
    
    return resolvedField;
  });
};

/**
 * Deep clean config object to remove any function references or circular structures
 */
const cleanConfig = (config) => {
  if (!config || typeof config !== 'object') return config;
  
  const cleaned = {};
  
  for (const [key, value] of Object.entries(config)) {
    // Skip functions
    if (typeof value === 'function') continue;
    
    // Handle arrays
    if (Array.isArray(value)) {
      cleaned[key] = value.map(item => 
        typeof item === 'object' && item !== null ? cleanConfig(item) : item
      );
      continue;
    }
    
    // Handle nested objects
    if (typeof value === 'object' && value !== null) {
      cleaned[key] = cleanConfig(value);
      continue;
    }
    
    // Keep primitives
    cleaned[key] = value;
  }
  
  return cleaned;
};

/**
 * Clean configSchema to remove function references before serialization
 */
const cleanConfigSchema = (configSchema) => {
  if (!Array.isArray(configSchema)) return [];
  
  return configSchema.map(field => {
    const cleanField = {
      key: field.key,
      label: field.label,
      type: field.type,
      required: field.required,
      locked: field.locked,
      help: field.help,
      placeholder: field.placeholder,
      dependsOn: field.dependsOn,
      min: field.min,
      max: field.max,
      step: field.step
    };
    
    // Handle options
    if (field.options) {
      if (field.options === 'dynamic') {
        cleanField.options = 'dynamic';
      } else if (typeof field.options === 'function') {
        cleanField.options = 'dynamic';
      } else if (Array.isArray(field.options)) {
        cleanField.options = field.options.map(opt => ({
          value: opt.value,
          label: opt.label,
          help: opt.help,
          dataType: opt.dataType
        }));
      }
    }
    
    // Remove undefined values
    Object.keys(cleanField).forEach(key => {
      if (cleanField[key] === undefined) {
        delete cleanField[key];
      }
    });
    
    return cleanField;
  });
};

/**
 * Serialize workflow with ONLY backend-required fields
 * This is the most efficient serialization for execution (94% smaller)
 * 
 * Backend only needs:
 * - node.id
 * - node.data.template_id (which tool to execute)
 * - node.data.config (tool parameters)
 * - node.data.label (optional, for logging)
 * 
 * USE FOR EXPORTS REQUIRING HUMAN-READABLE
 * @param {Array} nodes - Workflow nodes
 * @param {Array} edges - Workflow edges
 * @returns {Object} Minimal serialized workflow
 */
export const serializeWorkflowMinimal = (nodes, edges) => {
  // Minimal node data - only what backend needs
  const cleanNodes = nodes.map(node => ({
    id: node.id,
    data: {
      template_id: node.data?.template_id,  // REQUIRED: Identifies which tool to run
      config: cleanConfig(node.data?.config || {}),  // REQUIRED: Tool parameters
      label: node.data?.label  // OPTIONAL: For logging/WebSocket updates
    }
  }));

  // Minimal edge data - only connections
  const cleanEdges = edges.map(edge => ({
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle || 'output-0',
    targetHandle: edge.targetHandle || 'input-0'
  }));

  return {
    nodes: cleanNodes,
    edges: cleanEdges
  };
};

/**
 * Serialize workflow with translation resolution
 * USE FOR EXPORTS REQUIRING HUMAN-READABLE
 * @param {Array} nodes - Workflow nodes
 * @param {Array} edges - Workflow edges
 * @param {Function} t - Translation function from useTranslation hook
 * @returns {Object} Serialized workflow with resolved translations
 */
export const serializeWorkflowWithTranslations = (nodes, edges, t) => {
  // Clean nodes with translation resolution
  const cleanNodes = nodes.map(node => {
    const cleanedSchema = cleanConfigSchema(node.data?.configSchema || []);
    const resolvedSchema = resolveConfigSchemaTranslations(cleanedSchema, t);
    
    return {
      id: node.id,
      type: node.type,
      position: {
        x: node.position.x,
        y: node.position.y
      },
      data: {
        // Resolve label and description
        label: resolveTranslation(node.data?.label, t),
        description: resolveTranslation(node.data?.description, t),
        
        // Keep identifiers
        template_id: node.data?.template_id,
        type: node.data?.type,
        color: node.data?.color,
        category: node.data?.category,
        
        // Deep clean config
        config: cleanConfig(node.data?.config || {}),
        
        // Resolved configSchema with translated labels
        configSchema: resolvedSchema,
        
        // Metadata
        hasInput: node.data?.hasInput,
        hasOutput: node.data?.hasOutput,
        maxInputConnections: node.data?.maxInputConnections,
        maxOutputConnections: node.data?.maxOutputConnections
      }
    };
  });

  // Clean edges
  const cleanEdges = edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: edge.type,
    animated: edge.animated,
  }));

  return {
    nodes: cleanNodes,
    edges: cleanEdges
  };
};

/**
 * Serialize workflow WITHOUT translation resolution (keeps keys)
 * Use this for storage/persistence where you want to keep translation keys
 */
export const serializeWorkflowSafe = (nodes, edges) => {
  const cleanNodes = nodes.map(node => ({
    id: node.id,
    type: node.type,
    position: {
      x: node.position.x,
      y: node.position.y
    },
    data: {
      label: node.data?.label,
      description: node.data?.description,
      template_id: node.data?.template_id,
      type: node.data?.type,
      color: node.data?.color,
      category: node.data?.category,
      config: cleanConfig(node.data?.config || {}),
      configSchema: cleanConfigSchema(node.data?.configSchema || []),
      hasInput: node.data?.hasInput,
      hasOutput: node.data?.hasOutput,
      maxInputConnections: node.data?.maxInputConnections,
      maxOutputConnections: node.data?.maxOutputConnections
    }
  }));

  const cleanEdges = edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: edge.type,
    animated: edge.animated,
  }));

  return {
    nodes: cleanNodes,
    edges: cleanEdges
  };
};

/**
 * Validate serialized workflow
 */
export const validateSerializedWorkflow = (serializedWorkflow) => {
  const errors = [];
  
  if (!serializedWorkflow) {
    errors.push('Workflow is null or undefined');
    return { valid: false, errors };
  }
  
  if (!Array.isArray(serializedWorkflow.nodes)) {
    errors.push('Nodes must be an array');
  } else if (serializedWorkflow.nodes.length === 0) {
    errors.push('Workflow must contain at least one node');
  }
  
  if (!Array.isArray(serializedWorkflow.edges)) {
    errors.push('Edges must be an array');
  }
  
  // Validate each node
  serializedWorkflow.nodes?.forEach((node, index) => {
    if (!node.id) errors.push(`Node ${index} missing id`);
    if (!node.data?.template_id) errors.push(`Node ${index} missing template_id`);
    if (node.data?.config && typeof node.data.config !== 'object') {
      errors.push(`Node ${index} config must be an object`);
    }
  });
  
  // Validate edges reference valid nodes
  const nodeIds = new Set(serializedWorkflow.nodes?.map(n => n.id) || []);
  serializedWorkflow.edges?.forEach((edge, index) => {
    if (!edge.source) errors.push(`Edge ${index} missing source`);
    if (!edge.target) errors.push(`Edge ${index} missing target`);
    
    if (edge.source && !nodeIds.has(edge.source)) {
      errors.push(`Edge ${index} references invalid source: ${edge.source}`);
    }
    if (edge.target && !nodeIds.has(edge.target)) {
      errors.push(`Edge ${index} references invalid target: ${edge.target}`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Pretty print workflow for debugging
 */
export const printWorkflow = (nodes, edges) => {
  if (!nodes || !edges) {
    console.warn('Cannot print workflow: nodes or edges is undefined');
    return;
  }
  
  console.group('Workflow Structure');
  
  console.log('📦 Nodes:', nodes.length);
  nodes.forEach(node => {
    console.log(`  • ${node.id} (${node.data?.template_id})`);
    if (node.data?.config && Object.keys(node.data.config).length > 0) {
      console.log('    Config:', node.data.config);
    }
  });
  
  console.log('🔗 Edges:', edges.length);
  edges.forEach(edge => {
    console.log(`  • ${edge.source} → ${edge.target}`);
  });
  
  console.groupEnd();
};

// ============================================
// USAGE GUIDE
// ============================================
/**
 * Use different serializers for different purposes:
 * 
 * 1. FOR EXECUTION (send to backend):
 *    Use serializeWorkflowMinimal()
 *    → Only essential data
 *    → 94% smaller
 *    → Faster execution
 * 
 * 2. FOR STORAGE (save to database):
 *    Use serializeWorkflowSafe()
 *    → Keep translation keys
 *    → Keep configSchema for future editing
 *    → Support multi-language
 * 
 * 3. FOR EXPORT (download file):
 *    Use serializeWorkflowWithTranslations()
 *    → Resolved translations
 *    → Human-readable
 *    → Self-documenting
 */
/**
 * FOR WORKFLOW EXECUTION (send to backend):
 * Use serializeWorkflowWithTranslations() with translation function
 * This resolves all translation keys to actual text
 * 
 * import { useTranslation } from './hooks/useTranslation';
 * 
 * const { t } = useTranslation();
 * const serialized = serializeWorkflowWithTranslations(nodes, edges, t);
 * 
 * Result: All labels, help text, etc. are in actual language text
 */

/**
 * FOR WORKFLOW STORAGE/PERSISTENCE:
 * Use serializeWorkflowSafe() WITHOUT translation function
 * This keeps translation keys intact for multi-language support
 * 
 * const serialized = serializeWorkflowSafe(nodes, edges);
 * 
 * Result: Translation keys preserved for future use
 */