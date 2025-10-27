// frontend/src/components/study/DatasetViewer.jsx
/**
 * Dataset Viewer - VIRTUAL SCROLLING VERSION (Carefully Optimized)
 * 
 * Features:
 * Virtual Scrolling (react-window) - Renders only visible items
 * Debounced Inputs - No lag during typing
 * Memoization - Faster filtering/sorting
 * useTransition - Non-blocking UI updates
 */

import React, { useState, useMemo, useCallback, useRef, useEffect, useTransition } from 'react';
import { FixedSizeList } from 'react-window';

// Virtual scrolling configuration
const CARD_ROW_HEIGHT = 220;
const TABLE_ROW_HEIGHT = 80;
const CARDS_PER_ROW = 2;

// Column widths for table alignment (CRITICAL for proper alignment)
const COLUMN_WIDTHS = {
  row_number: 60,
  review_id: 150,
  customer_id: 120,
  product_id: 150,
  product_title: 250,
  product_category: 120,
  star_rating: 90,
  review_headline: 200,
  review_body: 350,
  helpful_votes: 100,
  total_votes: 100,
  verified_purchase: 80
};

// ============================================================
// CUSTOM HOOKS
// ============================================================
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

// ============================================================
// COLUMN DEFINITIONS
// ============================================================
const COLUMN_CONFIG = [
  { id: 'row_number', label: '#', width: 'w-16', defaultVisible: true, sortable: true, filterable: true, dataType: 'int64' },
  { id: 'review_id', label: 'Review ID', width: 'w-32', defaultVisible: true, sortable: true, filterable: true, dataType: 'string' },
  { id: 'customer_id', label: 'Customer ID', width: 'w-28', defaultVisible: true, sortable: true, filterable: true, dataType: 'string' },
  { id: 'product_id', label: 'Product ID', width: 'w-32', defaultVisible: true, sortable: true, filterable: true, dataType: 'string' },
  { id: 'product_title', label: 'Product', width: 'w-48', defaultVisible: true, sortable: true, filterable: true, dataType: 'string' },
  { id: 'product_category', label: 'Category', width: 'w-28', defaultVisible: false, sortable: true, filterable: true, dataType: 'string' },
  { id: 'star_rating', label: 'Rating', width: 'w-20', defaultVisible: true, sortable: true, filterable: true, dataType: 'int64' },
  { id: 'review_headline', label: 'Headline', width: 'w-32', defaultVisible: true, sortable: true, filterable: true, dataType: 'string' },
  { id: 'review_body', label: 'Review', width: '', defaultVisible: true, sortable: true, filterable: true, dataType: 'string' },
  { id: 'helpful_votes', label: 'Helpful', width: 'w-24', defaultVisible: true, sortable: true, filterable: true, dataType: 'int64' },
  { id: 'total_votes', label: 'Total Votes', width: 'w-24', defaultVisible: false, sortable: true, filterable: true, dataType: 'int64' },
  { id: 'verified_purchase', label: 'Verified', width: 'w-20', defaultVisible: true, sortable: true, filterable: true, dataType: 'boolean' }
];

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
const sanitizeText = (text) => {
  if (!text) return '';
  return String(text).trim();
}

const escapeHtml = (text) => {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = sanitizeText(text);
  return div.innerHTML;
};

const SafeText = ({ text, className = '' }) => {
  return (
    <span 
      className={className}
      dangerouslySetInnerHTML={{ __html: escapeHtml(text) }}
    />
  );
};

// ============================================================
// STAR RATING COMPONENT
// ============================================================
const StarRating = ({ rating }) => {
  const color = rating >= 4 
    ? 'text-green-600 dark:text-green-400' 
    : rating === 3 
    ? 'text-yellow-600 dark:text-yellow-400' 
    : 'text-red-600 dark:text-red-400';
  
  return (
    <div className="flex items-center gap-1">
      <span className={`font-bold ${color}`}>{rating}</span>
      <span className="text-yellow-400 dark:text-yellow-300">★</span>
    </div>
  );
};

// ============================================================
// REVIEW CARD COMPONENT
// ============================================================
const ReviewCard = React.memo(({ review, isExpanded, onToggle, rowNumber }) => {
  return (
    <div 
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md dark:hover:shadow-gray-900/30 transition-shadow cursor-pointer"
      onClick={onToggle}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-500 dark:text-gray-500">#{rowNumber}</span>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              <SafeText text={review.review_headline || 'No headline'} />
            </h4>
          </div>
          {review.verified_purchase && (
            <span className="inline-block text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-2 py-0.5 rounded mt-1">
              Verified Purchase
            </span>
          )}
        </div>
        <StarRating rating={review.star_rating} />
      </div>

      <p className={`text-sm text-gray-700 dark:text-gray-300 ${isExpanded ? '' : 'line-clamp-3'}`}>
        <SafeText text={review.review_body || 'No review text'} />
      </p>

      {(review.helpful_votes > 0 || isExpanded) && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs space-y-1">
          <span className="text-gray-600 dark:text-gray-400 block">
            {review.helpful_votes > 0 
              ? `👍 ${review.helpful_votes} of ${review.total_votes || review.helpful_votes} found helpful`
              : 'No helpful votes'}
          </span>
          {isExpanded && (
            <>
              {review.review_id && (
                <div className="text-gray-500 dark:text-gray-500">Review ID: {review.review_id}</div>
              )}
              {review.customer_id && (
                <div className="text-gray-500 dark:text-gray-500">Customer ID: {review.customer_id}</div>
              )}
              {review.product_title && (
                <div className="text-gray-500 dark:text-gray-500">
                  Product: <SafeText text={review.product_title} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.review.review_id === nextProps.review.review_id &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.rowNumber === nextProps.rowNumber
  );
});

ReviewCard.displayName = 'ReviewCard';

// ============================================================
// COLUMN SELECTOR COMPONENT
// ============================================================
const ColumnVisibilityControl = ({ visibleColumns, onToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
        title="Show/hide columns"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20 p-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Visible Columns</h4>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {COLUMN_CONFIG.filter(col => col.id !== 'row_number').map(col => (
                <label key={col.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleColumns[col.id]}
                    onChange={() => onToggle(col.id)}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{col.label}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================
// RESIZABLE MODAL COMPONENT
// ============================================================
const ResizableModal = ({ isOpen, onClose, children }) => {
  const [width, setWidth] = useState(80);
  const [isDragging, setIsDragging] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      if (!modalRef.current) return;
      const viewportWidth = window.innerWidth;
      const newWidth = (e.clientX / viewportWidth) * 200;
      setWidth(Math.min(Math.max(newWidth, 50), 95));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700 relative"
        style={{ width: `${width}%`, userSelect: isDragging ? 'none' : 'auto' }}
      >
        <div
          className={`absolute left-0 top-0 bottom-0 w-2 hover:bg-blue-500/20 cursor-ew-resize ${
            isDragging ? 'bg-blue-500/30' : ''
          }`}
          onMouseDown={() => setIsDragging(true)}
          title="Drag to resize"
        />
        
        <div
          className={`absolute right-0 top-0 bottom-0 w-2 hover:bg-blue-500/20 cursor-ew-resize ${
            isDragging ? 'bg-blue-500/30' : ''
          }`}
          onMouseDown={() => setIsDragging(true)}
          title="Drag to resize"
        />

        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Dataset Viewer</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Close modal"
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN DATA VIEWER COMPONENT
// ============================================================
const DatasetViewer = ({ 
  category, 
  productId, 
  taskNumber,
  reviews = [],
  reviewCount = 0,
  totalCount = 0,
  loading = false,
  loadingMore = false,
  progress = 0,
  error = null,
  onRetry = () => {}
}) => {
  // ============================================================
  // LOCAL STATE
  // ============================================================
  const [viewMode, setViewMode] = useState('cards');
  const [filter, setFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState(new Set());
  
  const [isPending, startTransition] = useTransition();
  
  const [productFilter, setProductFilter] = useState('all');
  const [helpfulVotesInput, setHelpfulVotesInput] = useState(0);
  const helpfulVotesThreshold = useDebounce(helpfulVotesInput, 300);
  
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const initial = {};
    COLUMN_CONFIG.forEach(col => {
      initial[col.id] = col.defaultVisible;
    });
    return initial;
  });
  
  // Refs for height measurement
  const contentContainerRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(600);

  // ============================================================
  // EFFECTS
  // ============================================================
  
  // Measure container height
  useEffect(() => {
    const measureHeight = () => {
      if (contentContainerRef.current) {
        const height = contentContainerRef.current.clientHeight;
        setContainerHeight(height > 100 ? height : 600);
      }
    };

    measureHeight();
    
    // Add small delay to ensure layout is settled
    const timer = setTimeout(measureHeight, 100);
    const timer2 = setTimeout(measureHeight, 300); // Extra measurement for modal
    
    window.addEventListener('resize', measureHeight);
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      window.removeEventListener('resize', measureHeight);
    };
  }, [viewMode, isModalOpen]); // Re-measure when view mode OR modal state changes
  
  // Reset expanded reviews when filters/sorting changes
  useEffect(() => {
    setExpandedReviews(new Set());
  }, [filter, productFilter, helpfulVotesThreshold, sortColumn, sortDirection]);

  // ============================================================
  // COMPUTED VALUES
  // ============================================================
  
  const uniqueProducts = useMemo(() => {
    if (!reviews || reviews.length === 0) return [];
    const products = new Map();
    reviews.forEach(r => {
      if (!products.has(r.product_id)) {
        products.set(r.product_id, sanitizeText(r.product_title) || r.product_id);
      }
    });
    return Array.from(products.entries()).map(([id, title]) => ({ id, title }));
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    if (!reviews || reviews.length === 0) return [];
    
    if (filter === 'all' && productFilter === 'all' && helpfulVotesThreshold === 0) {
      return reviews;
    }
    
    let filtered = reviews;
    
    if (productFilter !== 'all') {
      filtered = filtered.filter(r => r.product_id === productFilter);
    }
    
    if (helpfulVotesThreshold > 0) {
      filtered = filtered.filter(r => r.helpful_votes >= helpfulVotesThreshold);
    }
    
    if (filter !== 'all') {
      switch (filter) {
        case 'positive':
          filtered = filtered.filter(r => r.star_rating >= 4);
          break;
        case 'negative':
          filtered = filtered.filter(r => r.star_rating <= 2);
          break;
        case 'neutral':
          filtered = filtered.filter(r => r.star_rating === 3);
          break;
      }
    }
    
    return filtered;
  }, [reviews, filter, productFilter, helpfulVotesThreshold]);

  const sortedReviews = useMemo(() => {
    if (!sortColumn) return filteredReviews;
    
    return [...filteredReviews].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];
      
      if (['review_headline', 'review_body', 'product_title'].includes(sortColumn)) {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }
      
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredReviews, sortColumn, sortDirection]);

  const filterCounts = useMemo(() => {
    if (!reviews || reviews.length === 0) {
      return { positive: 0, neutral: 0, negative: 0 };
    }
    return {
      positive: reviews.filter(r => r.star_rating >= 4).length,
      neutral: reviews.filter(r => r.star_rating === 3).length,
      negative: reviews.filter(r => r.star_rating <= 2).length
    };
  }, [reviews]);

  // ============================================================
  // EVENT HANDLERS
  // ============================================================
  
  const toggleReview = useCallback((index) => {
    setExpandedReviews(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);
  
  const toggleColumn = useCallback((columnId) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnId]: !prev[columnId]
    }));
  }, []);
  
  const handleSort = useCallback((columnId) => {
    startTransition(() => {
      if (sortColumn === columnId) {
        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
        setSortColumn(columnId);
        setSortDirection('asc');
      }
    });
  }, [sortColumn]);

  const handleFilterChange = useCallback((newFilter) => {
    startTransition(() => {
      setFilter(newFilter);
    });
  }, []);

  const handleProductFilterChange = useCallback((newProductFilter) => {
    startTransition(() => {
      setProductFilter(newProductFilter);
    });
  }, []);

  // ============================================================
  // RENDER CONTENT
  // ============================================================
  
  const ViewerContent = ({ isModal = false }) => (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3">
        <div className="flex flex-col gap-3">
          {/* Top Row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div 
                data-tour="view-mode-toggle"
                className="view-mode-buttons flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1"
              >
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1 rounded transition-colors ${
                    viewMode === 'cards'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1 rounded transition-colors ${
                    viewMode === 'table'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>

              {viewMode === 'table' && (
                <ColumnVisibilityControl 
                  visibleColumns={visibleColumns}
                  onToggle={toggleColumn}
                />
              )}
            </div>

            <div className="flex items-center gap-3">
              {isPending && (
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-gray-400 border-t-transparent"></div>
                  <span>Updating...</span>
                </div>
              )}
              
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {sortedReviews.length} reviews
                {sortedReviews.length !== reviews.length && (
                  <span className="text-gray-500"> (filtered from {reviews.length})</span>
                )}
              </span>

              {!isModal && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  data-tour="pop-out-dataviewer-button"
                  className="pop-out-dataviewer-button p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Filter Buttons */}
          <div 
            data-tour="filter-buttons"
            className="filter-buttons flex flex-wrap items-center gap-2"
          >
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              All ({reviews.length})
            </button>
            <button
              onClick={() => handleFilterChange('positive')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'positive'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Positive ({filterCounts.positive})
            </button>
            <button
              onClick={() => handleFilterChange('neutral')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'neutral'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Neutral ({filterCounts.neutral})
            </button>
            <button
              onClick={() => handleFilterChange('negative')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'negative'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Negative ({filterCounts.negative})
            </button>

            {uniqueProducts.length > 1 && (
              <>
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
                <select
                  value={productFilter}
                  onChange={(e) => handleProductFilterChange(e.target.value)}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm border border-gray-300 dark:border-gray-600"
                >
                  <option value="all">All Products</option>
                  {uniqueProducts.map(({ id, title }) => (
                    <option key={id} value={id}>
                      {title.length > 40 ? title.substring(0, 40) + '...' : title}
                    </option>
                  ))}
                </select>
              </>
            )}

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Min. Helpful:</label>
              <input
                type="number"
                min="0"
                value={helpfulVotesInput}
                onChange={(e) => setHelpfulVotesInput(parseInt(e.target.value) || 0)}
                className="w-20 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && reviews.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 dark:border-gray-700 border-t-blue-600 mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading reviews...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-w-md">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-900 dark:text-red-200 mb-1">Error Loading Reviews</h3>
                <p className="text-sm text-red-700 dark:text-red-300 mb-3">{error}</p>
                <button
                  onClick={onRetry}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && reviews.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-gray-600 dark:text-gray-400">No reviews available</p>
          </div>
        </div>
      )}

      {/* Content Area - VIRTUAL SCROLLING */}
      {!loading && !error && reviews.length > 0 && (
        <div 
          ref={contentContainerRef}
          className="flex-1 overflow-hidden"
        >
          {viewMode === 'cards' ? (
            // CARD VIEW - Virtual Scrolling
            <FixedSizeList
              height={containerHeight}
              itemCount={Math.ceil(sortedReviews.length / CARDS_PER_ROW)}
              itemSize={CARD_ROW_HEIGHT}
              width="100%"
              overscanCount={3}
            >
              {({ index, style }) => {
                const startIdx = index * CARDS_PER_ROW;
                const reviewsInRow = sortedReviews.slice(startIdx, startIdx + CARDS_PER_ROW);
                
                return (
                  <div style={{ ...style, padding: '0 16px' }}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                      {reviewsInRow.map((review, idx) => (
                        <ReviewCard
                          key={review.review_id || (startIdx + idx)}
                          review={review}
                          isExpanded={expandedReviews.has(startIdx + idx)}
                          onToggle={() => toggleReview(startIdx + idx)}
                          rowNumber={startIdx + idx + 1}
                        />
                      ))}
                    </div>
                  </div>
                );
              }}
            </FixedSizeList>
          ) : (
            // TABLE VIEW - Virtual Scrolling with Fixed Column Widths
            <div className="h-full flex flex-col p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 h-full flex flex-col overflow-x-auto">
                {/* Fixed Header */}
                <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700">
                  <div style={{ display: 'flex', minWidth: 'fit-content' }}>
                    {COLUMN_CONFIG.filter(col => visibleColumns[col.id]).map(col => (
                      <div
                        key={col.id}
                        style={{
                          width: `${COLUMN_WIDTHS[col.id]}px`,
                          flexShrink: 0,
                          padding: '8px 12px',
                          fontWeight: 600,
                          fontSize: '14px',
                          cursor: col.sortable ? 'pointer' : 'default'
                        }}
                        className={`text-gray-700 dark:text-gray-300 ${
                          col.sortable ? 'hover:bg-gray-200 dark:hover:bg-gray-600' : ''
                        }`}
                        onClick={() => col.sortable && handleSort(col.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>{col.label}</span>
                          {col.sortable && sortColumn === col.id && (
                            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Virtual Scrolling Body */}
                <div className="flex-1 overflow-y-auto" style={{ overflowX: 'hidden' }}>
                  <FixedSizeList
                    height={containerHeight - 45}
                    itemCount={sortedReviews.length}
                    itemSize={TABLE_ROW_HEIGHT}
                    width="100%"
                    overscanCount={10}
                  >
                    {({ index, style }) => {
                      const review = sortedReviews[index];
                      
                      return (
                        <div
                          style={style}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-700"
                          onClick={() => toggleReview(index)}
                        >
                          <div style={{ display: 'flex', minWidth: 'fit-content' }}>
                            {visibleColumns.row_number && (
                              <div style={{ width: `${COLUMN_WIDTHS.row_number}px`, flexShrink: 0, padding: '12px' }} className="text-gray-600 dark:text-gray-400">
                                {index + 1}
                              </div>
                            )}
                            {visibleColumns.review_id && (
                              <div style={{ width: `${COLUMN_WIDTHS.review_id}px`, flexShrink: 0, padding: '12px' }}>
                                <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                                  {review.review_id}
                                </span>
                              </div>
                            )}
                            {visibleColumns.customer_id && (
                              <div style={{ width: `${COLUMN_WIDTHS.customer_id}px`, flexShrink: 0, padding: '12px' }} className="text-gray-700 dark:text-gray-300">
                                {review.customer_id}
                              </div>
                            )}
                            {visibleColumns.product_id && (
                              <div style={{ width: `${COLUMN_WIDTHS.product_id}px`, flexShrink: 0, padding: '12px' }}>
                                <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                                  {review.product_id}
                                </span>
                              </div>
                            )}
                            {visibleColumns.product_title && (
                              <div style={{ width: `${COLUMN_WIDTHS.product_title}px`, flexShrink: 0, padding: '12px' }} className="text-gray-700 dark:text-gray-300">
                                <div className="line-clamp-2">
                                  <SafeText text={review.product_title || '-'} />
                                </div>
                              </div>
                            )}
                            {visibleColumns.product_category && (
                              <div style={{ width: `${COLUMN_WIDTHS.product_category}px`, flexShrink: 0, padding: '12px' }} className="text-gray-700 dark:text-gray-300">
                                {review.product_category}
                              </div>
                            )}
                            {visibleColumns.star_rating && (
                              <div style={{ width: `${COLUMN_WIDTHS.star_rating}px`, flexShrink: 0, padding: '12px' }}>
                                <StarRating rating={review.star_rating} />
                              </div>
                            )}
                            {visibleColumns.review_headline && (
                              <div style={{ width: `${COLUMN_WIDTHS.review_headline}px`, flexShrink: 0, padding: '12px' }}>
                                <span className="font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                                  <SafeText text={review.review_headline || '-'} />
                                </span>
                              </div>
                            )}
                            {visibleColumns.review_body && (
                              <div style={{ width: `${COLUMN_WIDTHS.review_body}px`, flexShrink: 0, padding: '12px' }}>
                                <p className={`text-gray-700 dark:text-gray-300 ${expandedReviews.has(index) ? '' : 'line-clamp-2'}`}>
                                  <SafeText text={review.review_body || '-'} />
                                </p>
                              </div>
                            )}
                            {visibleColumns.helpful_votes && (
                              <div style={{ width: `${COLUMN_WIDTHS.helpful_votes}px`, flexShrink: 0, padding: '12px' }} className="text-xs text-gray-600 dark:text-gray-400">
                                {review.helpful_votes > 0 ? `${review.helpful_votes}/${review.total_votes || review.helpful_votes}` : '-'}
                              </div>
                            )}
                            {visibleColumns.total_votes && (
                              <div style={{ width: `${COLUMN_WIDTHS.total_votes}px`, flexShrink: 0, padding: '12px' }} className="text-xs text-gray-600 dark:text-gray-400">
                                {review.total_votes || '-'}
                              </div>
                            )}
                            {visibleColumns.verified_purchase && (
                              <div style={{ width: `${COLUMN_WIDTHS.verified_purchase}px`, flexShrink: 0, padding: '12px', textAlign: 'center' }}>
                                {review.verified_purchase ? (
                                  <span className="inline-block w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full"></span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }}
                  </FixedSizeList>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <ViewerContent />
      <ResizableModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ViewerContent isModal={true} />
      </ResizableModal>
    </>
  );
};

export {COLUMN_CONFIG, DatasetViewer}
export default DatasetViewer;