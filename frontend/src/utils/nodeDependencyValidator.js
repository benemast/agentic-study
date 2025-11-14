// frontend/src/utils/nodeDependencyValidator.js

/**
 * Standalone utility for validating node dependencies in NodeEditor
 * NOT part of the workflow validation cycle
*/

/**
 * Get template_id from node
 */
const getNodeTemplateId = (node) => {
  if (node.data?.template_id) {
    return node.data.template_id;
  }
  // Parse from id (format: "template-id-counter")
  const match = node.id.match(/^(.+)-\d+$/);
  return match ? match[1] : node.id;
};

/**
 * Build predecessor map from workflow edges
 * Uses transitive closure to ensure ALL predecessors are captured
 */
const buildPredecessorMap = (nodes, edges) => {
  const predecessorMap = {};
  
  // Initialize empty sets for all nodes
  nodes.forEach(node => {
    predecessorMap[node.id] = new Set();
  });
  
  // First pass: add direct predecessors
  edges.forEach(edge => {
    if (predecessorMap[edge.target]) {
      predecessorMap[edge.target].add(edge.source);
    }
  });
  
  // Second pass: compute transitive closure (all indirect predecessors)
  // Keep iterating until no more predecessors are added
  let changed = true;
  while (changed) {
    changed = false;
    
    nodes.forEach(node => {
      const currentPreds = predecessorMap[node.id];
      const predsToAdd = new Set();
      
      // For each direct predecessor, add its predecessors too
      currentPreds.forEach(predId => {
        if (predecessorMap[predId]) {
          predecessorMap[predId].forEach(indirectPred => {
            if (!currentPreds.has(indirectPred)) {
              predsToAdd.add(indirectPred);
              changed = true;
            }
          });
        }
      });
      
      // Add all newly found predecessors
      predsToAdd.forEach(pred => currentPreds.add(pred));
    });
  }
  
  return predecessorMap;
};

/**
 * Build successor map from workflow edges
 * Uses transitive closure to ensure ALL successors are captured
 */
const buildSuccessorMap = (nodes, edges) => {
  const successorMap = {};
  
  // Initialize empty sets for all nodes
  nodes.forEach(node => {
    successorMap[node.id] = new Set();
  });
  
  // First pass: add direct successors
  edges.forEach(edge => {
    if (successorMap[edge.source]) {
      successorMap[edge.source].add(edge.target);
    }
  });
  
  // Second pass: compute transitive closure (all indirect successors)
  let changed = true;
  while (changed) {
    changed = false;
    
    nodes.forEach(node => {
      const currentSuccs = successorMap[node.id];
      const succsToAdd = new Set();
      
      // For each direct successor, add its successors too
      currentSuccs.forEach(succId => {
        if (successorMap[succId]) {
          successorMap[succId].forEach(indirectSucc => {
            if (!currentSuccs.has(indirectSucc)) {
              succsToAdd.add(indirectSucc);
              changed = true;
            }
          });
        }
      });
      
      // Add all newly found successors
      succsToAdd.forEach(succ => currentSuccs.add(succ));
    });
  }
  
  return successorMap;
};

/**
 * Check if a specific node template exists as a predecessor OR successor (for processing nodes)
 */
const hasRelatedNode = (
  nodeId,
  requiredTemplateId,
  nodes,
  predecessorMap,
  successorMap,
  currentNodeCategory
) => {
  const predecessors = predecessorMap[nodeId] || new Set();
  const successors = successorMap[nodeId] || new Set();
  
  // For processing nodes (clean-data, filter-reviews, sort-reviews), check BOTH predecessors and successors
  // since order doesn't matter for data processing
  const shouldCheckSuccessors = currentNodeCategory === 'processing';
  
  const checkInSet = (nodeSet) => {
    return Array.from(nodeSet).some(relatedId => {
      const relatedNode = nodes.find(n => n.id === relatedId);
      if (!relatedNode) return false;
      
      const templateId = getNodeTemplateId(relatedNode);
      return templateId === requiredTemplateId;
    });
  };
  
  // Check predecessors
  if (checkInSet(predecessors)) return true;
  
  // For processing nodes, also check successors
  if (shouldCheckSuccessors && checkInSet(successors)) return true;
  
  return false;
};

/**
 * Validate option dependencies for a node
 * Returns validation state for each option with dependencies
 * 
 * @param {Object} node - Current node being edited
 * @param {Array} nodes - All workflow nodes
 * @param {Array} edges - All workflow edges
 * @param {Function} [t] - Optional translation function (from useTranslation)
 * @returns {Object} { validations: {...}, nodeWarnings: [...] }
 */
export const validateNodeOptionDependencies = (node, nodes, edges, t) => {
  const validations = {};
  const nodeWarnings = [];

  // Early return with correct structure
  if (!node || !nodes || !edges) {
    return { validations, nodeWarnings };
  }
  
  const configSchema = node.data?.configSchema || [];
  const predecessorMap = buildPredecessorMap(nodes, edges);
  const successorMap = buildSuccessorMap(nodes, edges);
  
  // Check for node-level warnings
  const currentTemplateId = getNodeTemplateId(node);
  const currentNodeCategory = node.data?.category || 'analysis'; // Default to analysis for safety
  
  // Skip warnings for load-reviews and self-referential warnings
  const shouldCheckClean = currentTemplateId !== 'load-reviews' && currentTemplateId !== 'clean-data';
  const shouldCheckFilter = currentTemplateId !== 'load-reviews' && currentTemplateId !== 'filter-reviews';
  
  const hasCleanData = hasRelatedNode(node.id, 'clean-data', nodes, predecessorMap, successorMap, currentNodeCategory);
  const hasFilterReviews = hasRelatedNode(node.id, 'filter-reviews', nodes, predecessorMap, successorMap, currentNodeCategory);
  
  // Add warnings based on missing predecessor nodes
  if (shouldCheckClean && !hasCleanData) {
    nodeWarnings.push({
      type: 'data-quality',
      severity: 'warning',
      message: t
        ? t('workflow.builder.nodeEditor.validation.noise')
        : 'Data may contain noise (consider adding a Clean Reviews node).',
      missingNode: 'clean-data',
    });
  }
  
  if (shouldCheckFilter && !hasFilterReviews) {
    nodeWarnings.push({
      type: 'performance',
      severity: 'info',
      message: t
        ? t('workflow.builder.nodeEditor.validation.performance')
        : 'Processing the entire dataset may impact performance (consider adding a Filter Reviews node).',
      missingNode: 'filter-reviews',
    });
  }
  
  // Check each config field for option-level dependencies
  configSchema.forEach(field => {
    // Handle multiselect with array options
    if (field.type === 'multiselect' && Array.isArray(field.options)) {
      field.options.forEach(option => {
        if (option.dependencies) {
          const { requiresNodes = [], lockType = 'disable' } = option.dependencies;
          
          const missingNodes = requiresNodes.filter(
            requiredId => !hasRelatedNode(node.id, requiredId, nodes, predecessorMap, successorMap, currentNodeCategory)
          );
          
          const key = `${field.key}.${option.value}`;
          validations[key] = {
            isValid: missingNodes.length === 0,
            lockType,
            missingNodes
          };
        }
      });
    }
    
    // Handle checklist with object options
    if (field.type === 'checklist' && field.options && typeof field.options === 'object') {
      Object.entries(field.options).forEach(([optionKey, optionConfig]) => {
        if (optionConfig.dependencies) {
          const { requiresNodes = [], lockType = 'disable' } = optionConfig.dependencies;
          
          const missingNodes = requiresNodes.filter(
            requiredId => !hasRelatedNode(node.id, requiredId, nodes, predecessorMap, successorMap, currentNodeCategory)
          );
          
          const key = `${field.key}.${optionKey}`;
          validations[key] = {
            isValid: missingNodes.length === 0,
            lockType,
            missingNodes
          };
        }
      });
    }
  });
  
  return { validations, nodeWarnings };
};
