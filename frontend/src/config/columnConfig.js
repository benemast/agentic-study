// frontend/src/config/columnConfig.js
// ============================================
// COLUMN CONFIGURATION
// Shared configuration for dataset columns
// Used by DatasetViewer and NodeEditor
// ============================================

export const COLUMN_CONFIG = [
  { 
    id: 'row_number', 
    label: '#', 
    dataType: 'int64',
    dataViewer: {
      enable: true,
      alignment: 'center', 
      minWidth: 55, 
      maxWidth: 60, 
      width: 'w-16', 
      defaultVisible: true, 
      sortable: true, 
      filterable: false, 
    },
    workflow:{
      enable: false,       
      sortable: false, 
      filterable: false, 
    }    
  },
  { 
    id: 'review_id', 
    label: 'Review ID', 
    dataType: 'string', 
    dataViewer: {
      enable: true,
      alignment: 'left', 
      minWidth: 155, 
      maxWidth: 165, 
      width: 'w-32', 
      defaultVisible: true, 
      sortable: true, 
      filterable: true
    },
    workflow:{
      enable: true,      
      sortable: true, 
      filterable: true, 
    }    
  },
  { 
    id: 'customer_id', 
    label: 'Customer ID', 
    dataType: 'string' ,  
    dataViewer: {
      enable: true,
      alignment: 'left', 
      minWidth: 100, 
      maxWidth: 110, 
      width: 'w-28', 
      defaultVisible: true, 
      sortable: true, 
      filterable: true
    },
    workflow:{
      enable: true,      
      sortable: true, 
      filterable: true, 
    }    
  },
  { 
    id: 'product_id', 
    label: 'Product ID', 
    dataType: 'string' ,  
    dataViewer: {
      enable: true,
      alignment: 'left', 
      minWidth: 120, 
      maxWidth: 125, 
      width: 'w-32', 
      defaultVisible: true, 
      sortable: true, 
      filterable: true
    },
    workflow:{
      enable: true,      
      sortable: true, 
      filterable: true, 
    }    
  },
  { 
    id: 'product_title', 
    label: 'Product', 
    dataType: 'string' ,  
    dataViewer: {
      enable: true,
      alignment: 'left', 
      minWidth: 200, 
      maxWidth: 285, 
      width: 'w-48', 
      defaultVisible: true, 
      sortable: true, 
      filterable: true
    },
    workflow:{
      enable: true,      
      sortable: true, 
      filterable: true, 
    }    
  },
  { 
    id: 'product_category', 
    label: 'Category', 
    dataType: 'string' ,  
    dataViewer: {
      enable: true,
      alignment: 'left', 
      minWidth: 100, 
      maxWidth: 180, 
      width: 'w-28', 
      defaultVisible: false, 
      sortable: true, 
      filterable: true
    },
    workflow:{
      enable: false,
      sortable: false, 
      filterable: false,   
    }    
  },
  { 
    id: 'star_rating', 
    label: 'Rating', 
    dataType: 'int64' ,  
    dataViewer: {
      enable: true,
      alignment: 'left', 
      minWidth: 100, 
      maxWidth: 105, 
      width: 'w-20', 
      defaultVisible: true, 
      sortable: true, 
      filterable: true
    },
    workflow:{
      enable: true,      
      sortable: true, 
      filterable: true, 
    }    
  },
  { 
    id: 'review_headline', 
    label: 'Headline', 
    dataType: 'string' ,  
    dataViewer: {
      enable: true,
      alignment: 'left', 
      minWidth: 150, 
      maxWidth: 220, 
      width: 'w-32', 
      defaultVisible: true, 
      sortable: true, 
      filterable: true
    },
    workflow:{
      enable: true,      
      sortable: true, 
      filterable: true, 
    }    
  },
  { 
    id: 'review_body', 
    label: 'Review', 
    dataType: 'string' ,  
    dataViewer: {
      enable: true,
      alignment: 'left', 
      minWidth: 250, 
      maxWidth: 700, 
      width: '', 
      defaultVisible: true, 
      sortable: true, 
      filterable: true
    },
    workflow:{
      enable: true,      
      sortable: true, 
      filterable: true, 
    }    
  },
  { 
    id: 'helpful_votes', 
    label: 'Helpful', 
    dataType: 'int64' ,  
    dataViewer: {
      enable: true,
      alignment: 'center', 
      minWidth: 80, 
      maxWidth: 85, 
      width: 'w-24', 
      defaultVisible: true, 
      sortable: true, 
      filterable: true
    },
    workflow:{
      enable: true,      
      sortable: true, 
      filterable: true, 
    }    
  },
  { 
    id: 'total_votes', 
    label: 'Total Votes', 
    dataType: 'int64' ,  
    dataViewer: {
      enable: true,
      alignment: 'center', 
      minWidth: 80, 
      maxWidth: 85, 
      width: 'w-24', 
      defaultVisible: false, 
      sortable: true, 
      filterable: true
    },
    workflow:{
      enable: true,      
      sortable: true, 
      filterable: true, 
    }    
  },
  { 
    id: 'verified_purchase', 
    label: 'Verified', 
    dataType: 'boolean' ,  
    dataViewer: {
      enable: true,
      alignment: 'center', 
      minWidth: 70, 
      maxWidth: 75, 
      width: 'w-20', 
      defaultVisible: true, 
      sortable: true, 
      filterable: true
    },
    workflow:{
      enable: true,      
      sortable: true, 
      filterable: true, 
    }    
  }
];

/**
 * Get workflow-enabled columns
 * @returns {array} Array of workflow-enabled columns
 */
export const getWorkflowColumns = () => {
  return COLUMN_CONFIG
    .filter(col => col.workflow?.enable)  
    .sort((a, b) => a.label.localeCompare(b.label));
};

/**
 * Get sortable columns for workflow
 * @returns {array} Array of sortable columns
 */
export const getWorkflowSortableColumns = () => {
  return COLUMN_CONFIG
    .filter(col => col.workflow?.sortable)
    .sort((a, b) => a.label.localeCompare(b.label));
};

/**
 * Get filterable columns for workflow
 * @returns {array} Array of filterable columns
 */
export const getWorkflowFilterableColumns = () => {
  return COLUMN_CONFIG
    .filter(col => col.workflow?.filterable).sort()
    .sort((a, b) => a.label.localeCompare(b.label));
};

/**
 * Get dataViewer-enabled columns
 * @returns {array} Array of dataViewer-enabled columns
 */
export const getDataViewerColumns = () => {
  return COLUMN_CONFIG.filter(col => col.dataViewer?.enable);
};

/**
 * Get filterable columns for dataViewer
 * @returns {array} Array of filterable columns for dataViewer
 */
export const getDataViewerFilterableColumns = () => {
  return COLUMN_CONFIG.filter(col => col.dataViewer?.filterable);
};

/**
 * Get sortable columns for dataViewer
 * @returns {array} Array of sortable columns for dataViewer
 */
export const getDataViewerSortableColumns = () => {
  return COLUMN_CONFIG.filter(col => col.dataViewer?.sortable);
};

/**
 * Get column by ID
 * @param {string} id - Column ID
 * @returns {object|undefined} Column config or undefined
 */
export const getColumnById = (id) => {
  return COLUMN_CONFIG.find(col => col.id === id);
};

/**
 * Get filter operators based on data type
 * @param {string} dataType - Data type (string, int64, boolean)
 * @returns {array} Array of operator options
 */
export const getFilterOperators = (dataType) => {
  switch (dataType) {
    case 'string':
      return [
        { value: 'contains', label: 'Contains' },
        { value: 'equals', label: 'Equals' },
        { value: 'not_equals', label: 'Not Equals' },
        { value: 'starts_with', label: 'Starts With' },
        { value: 'ends_with', label: 'Ends With' }
      ];
    case 'int64':
      return [
        { value: 'equals', label: 'Equals (=)' },
        { value: 'not_equals', label: 'Not Equals (≠)' },
        { value: 'greater_than', label: 'Greater Than (>)' },
        { value: 'less_than', label: 'Less Than (<)' },
        { value: 'greater_or_equal', label: 'Greater or Equal (≥)' },
        { value: 'less_or_equal', label: 'Less or Equal (≤)' }
      ];
    case 'boolean':
      return [
        { value: 'equals', label: 'Is' }
      ];
    default:
      return [{ value: 'equals', label: 'Equals' }];
  }
};