// frontend/src/components/study/DatasetViewer.jsx
/**
 * Dataset Viewer
 */

import React, { useState, useMemo, useCallback, useRef, useEffect, useLayoutEffect, useTransition } from 'react';
import { VariableSizeList } from 'react-window';
import {COLUMN_CONFIG} from '../../config/columnConfig'
import { useTranslation } from '../../hooks/useTranslation';

// Virtual scrolling configuration
const CARD_HEIGHT_COLLAPSED = 227;  // Base height for collapsed card
const CARD_HEIGHT_EXPANDED_MAX = 500;   // Maximum height when card is expanded
const CARD_SPACING = 12;            // Gap between cards
const TABLE_ROW_HEIGHT = 100;        // Collapsed table row height
const TABLE_ROW_HEIGHT_EXPANDED_MAX = 500; // Maximum expanded table row height
const CARDS_PER_ROW = 2;

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

/**
 * Custom hook to dynamically calculate available height for VariableSizeList
 * Responds to: window resize, parent resize, and content changes
 */
const useDynamicHeight = (containerRef, dependencies = []) => {
  const [height, setHeight] = useState(0); // Start with 0 to trigger immediate update
  const measurementAttempts = useRef(0);
  const maxAttempts = 10; // Try up to 10 times

  // Use useLayoutEffect for synchronous DOM measurement before paint
  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newHeight = rect.height;
        if (newHeight > 0 && newHeight !== height) {
          setHeight(newHeight);
          measurementAttempts.current = 0; // Reset on successful measurement
        }
      }
    };

    // Immediate synchronous calculation
    updateHeight();
    
    // Multiple delayed updates to catch layout changes at different timings
    // This handles cases where layout happens after initial render
    const timeoutIds = [
      setTimeout(updateHeight, 0),      // Next tick
      setTimeout(updateHeight, 10),     // After ~1 frame
      setTimeout(updateHeight, 50),     // After layout settles
      setTimeout(updateHeight, 100),    // Catch slow layouts
      setTimeout(updateHeight, 200),    // Final safety net
    ];

    // ResizeObserver for parent container changes
    const resizeObserver = new ResizeObserver(() => {
      // Use RAF to batch multiple resize notifications
      requestAnimationFrame(() => {
        updateHeight();
      });
    });

    resizeObserver.observe(containerRef.current);

    // Window resize listener
    const handleWindowResize = () => {
      requestAnimationFrame(() => {
        updateHeight();
      });
    };

    window.addEventListener('resize', handleWindowResize);

    // Cleanup
    return () => {
      timeoutIds.forEach(id => clearTimeout(id));
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [containerRef, height, ...dependencies]); // Include height to detect changes

  return height || 400; // Fallback to 400 only if still 0
};

// ============================================================
// CONTENT HEIGHT CALCULATION HELPERS
// ============================================================

/**
 * Font metrics for accurate height calculations
 * Based on standard web fonts (system-ui, -apple-system, etc.)
 */
const FONT_METRICS = {
  // Card text metrics
  card: {
    fontSize: 14,          // text-sm = 14px
    lineHeight: 1.5,       // 21px actual line height
    letterSpacing: 0,      // normal
    avgCharWidth: 7.5,     // approximate for system fonts at 14px
  },
  // Table text metrics  
  table: {
    fontSize: 14,          // text-sm/base = 14px
    lineHeight: 1.5,       // 21px actual line height
    letterSpacing: 0,      // normal
    avgCharWidth: 7.5,     // approximate for system fonts at 14px
  },
  // Headline/title metrics
  headline: {
    fontSize: 16,          // text-base = 16px (cards)
    lineHeight: 1.4,       // tighter for headlines
    avgCharWidth: 8.5,
  }
};

/**
 * Calculate how many lines text will wrap into given a width
 * @param {string} text - The text to measure
 * @param {number} availableWidth - Width in pixels available for text
 * @param {number} avgCharWidth - Average character width in pixels
 * @returns {number} Number of lines the text will take
 */
const calculateLineCount = (text, availableWidth, avgCharWidth) => {
  if (!text || availableWidth <= 0) return 0;
  
  const textLength = text.length;
  const charsPerLine = Math.floor(availableWidth / avgCharWidth);
  
  if (charsPerLine <= 0) return Math.ceil(textLength / 10); // Fallback
  
  // Account for word wrapping - actual wrapping is ~15% less efficient than character count
  const effectiveCharsPerLine = Math.floor(charsPerLine * 0.85);
  const lineCount = Math.ceil(textLength / effectiveCharsPerLine);
  
  return Math.max(lineCount, 1);
};

/**
 * Calculate the actual height needed for a card based on its content
 * Uses font metrics and card width to calculate accurate text height
 * 
 * Card layout:
 * - Header: Rating + Verified badge + Headline (2 lines max)
 * - Body: Review text (scrollable when expanded)
 * - Footer: Product info + Helpful votes (when expanded)
 * - Button: Expand/collapse
 */
const calculateCardHeight = (review, isExpanded, cardWidth = 400) => {
  if (!isExpanded) return CARD_HEIGHT_COLLAPSED;
  
  const reviewBodyText = review.review_body || '';
  const reviewHeadlineText = review.review_headline || '';
  
  // Fixed component heights
  const headerRatingHeight = 32;      // Star rating row
  const headlineHeight = 48;          // 2-line headline (line-clamp-2)
  const footerHeight = 70;            // Footer with product + helpful votes
  const buttonHeight = 36;            // Expand/collapse button
  const verticalPadding = 48;         // Total padding (p-4 top + bottom)
  const borderHeight = 2;             // Top + bottom borders
  
  // Calculate available width for text (accounting for padding and borders)
  const horizontalPadding = 32;       // p-4 on left and right = 16px each
  const scrollbarWidth = 8;           // Reserve space for scrollbar
  const availableTextWidth = cardWidth - horizontalPadding - scrollbarWidth;
  
  // Calculate body text height
  const bodyLineCount = calculateLineCount(
    reviewBodyText, 
    availableTextWidth, 
    FONT_METRICS.card.avgCharWidth
  );
  
  const bodyLineHeightPx = FONT_METRICS.card.fontSize * FONT_METRICS.card.lineHeight;
  const bodyTextHeight = bodyLineCount * bodyLineHeightPx;
  
  // Calculate total height
  const totalHeight = 
    headerRatingHeight + 
    headlineHeight + 
    verticalPadding + 
    bodyTextHeight + 
    footerHeight + 
    buttonHeight + 
    borderHeight;
  
  // Clamp between collapsed and max expanded height
  return Math.min(Math.max(totalHeight, CARD_HEIGHT_COLLAPSED), CARD_HEIGHT_EXPANDED_MAX);
};

/**
 * Calculate the actual height needed for a table row based on its content
 * Uses font metrics and column widths to calculate accurate text height
 * 
 * Table row expands based on the tallest text column (review_body or review_headline)
 */
const calculateTableRowHeight = (review, isExpanded, visibleColumns = {}) => {
  if (!isExpanded) return TABLE_ROW_HEIGHT;

  const reviewBodyText = review.review_body || '';
  const reviewHeadlineText = review.review_headline || '';
  
  // Find the column configurations for text columns
  const reviewBodyCol = COLUMN_CONFIG.find(col => col.id === 'review_body');
  const reviewHeadlineCol = COLUMN_CONFIG.find(col => col.id === 'review_headline');
  
  // Get actual visible column widths (use maxWidth as it's what the columns grow to)
  const reviewBodyWidth = (visibleColumns['review_body'] !== false && reviewBodyCol) 
    ? reviewBodyCol.dataViewer?.maxWidth 
    : 0;
  const reviewHeadlineWidth = (visibleColumns['review_headline'] !== false && reviewHeadlineCol) 
    ? reviewHeadlineCol.dataViewer?.maxWidth 
    : 0;
  
  // Account for cell padding (12px on each side)
  const cellPadding = 24;
  const scrollbarWidth = 8;
  
  let maxTextHeight = 0;
  
  // Calculate height for review_body if visible
  if (reviewBodyWidth > 0 && reviewBodyText) {
    const availableWidth = reviewBodyWidth - cellPadding - scrollbarWidth;
    const lineCount = calculateLineCount(
      reviewBodyText, 
      availableWidth, 
      FONT_METRICS.table.avgCharWidth
    );
    const lineHeightPx = FONT_METRICS.table.fontSize * FONT_METRICS.table.lineHeight;
    const textHeight = lineCount * lineHeightPx;
    maxTextHeight = Math.max(maxTextHeight, textHeight);
  }
  
  // Calculate height for review_headline if visible
  if (reviewHeadlineWidth > 0 && reviewHeadlineText) {
    const availableWidth = reviewHeadlineWidth - cellPadding - scrollbarWidth;
    const lineCount = calculateLineCount(
      reviewHeadlineText, 
      availableWidth, 
      FONT_METRICS.table.avgCharWidth
    );
    const lineHeightPx = FONT_METRICS.table.fontSize * FONT_METRICS.table.lineHeight;
    const textHeight = lineCount * lineHeightPx;
    maxTextHeight = Math.max(maxTextHeight, textHeight);
  }
  
  // Add vertical padding (12px top + 12px bottom)
  const verticalPadding = 24;
  const totalHeight = maxTextHeight + verticalPadding;
  
  // Clamp between collapsed and max expanded height
  // Add minimum of 60px to ensure there's always reasonable height
  return Math.min(Math.max(totalHeight, TABLE_ROW_HEIGHT, 60), TABLE_ROW_HEIGHT_EXPANDED_MAX);
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
const sanitizeText = (text) => {
  if (!text) return '';
  return String(text).trim();
}

// OPTIMIZED: Reusable textarea for HTML entity decoding
let textareaCache = null;
const getTextarea = () => {
  if (!textareaCache) {
    textareaCache = document.createElement('textarea');
  }
  return textareaCache;
};

const decodeHtmlEntities = (text) => {
  if (!text) return '';
  
  // Use cached textarea element instead of creating new one each time
  const textarea = getTextarea();
  textarea.innerHTML = text;
  let decoded = textarea.value;
  
  // Handle escaped backslashes (e.g., 5'10\\" becomes 5'10")
  decoded = decoded.replace(/\\\\/g, '\\');
  decoded = decoded.replace(/\\"/g, '"');
  decoded = decoded.replace(/\\'/g, "'");
  
  // Convert HTML line breaks to actual line breaks
  decoded = decoded.replace(/<br\s*\/?>/gi, '\n');
  decoded = decoded.replace(/<\/p>/gi, '\n\n');
  decoded = decoded.replace(/<p>/gi, '');
  
  // Remove any other HTML tags
  decoded = decoded.replace(/<[^>]+>/g, '');
  
  return decoded;
};

const escapeHtml = (text) => {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = sanitizeText(text);
  return div.innerHTML;
};

const SafeText = React.memo(({ text, className = '' }) => {
  const decodedText = useMemo(() => decodeHtmlEntities(sanitizeText(text)), [text]);

  return (
    <span 
      className={className} 
      style={{ whiteSpace: className.includes('truncate') ? 'nowrap' : 'pre-line' }}
    >
      {decodedText}
    </span>
  );
});

SafeText.displayName = 'SafeText';
// Helper function to determine text alignment based on column data type
const getColumnAlignment = (column) => {
  // Use explicit alignment from config if provided, otherwise fall back to dataType logic
  if (column.dataViewer?.alignment) return column.dataViewer?.alignment;
  
  // Fallback logic (should not be needed with alignment in config)
  if (column.dataViewer?.dataType === 'boolean') return 'center';
  if (column.dataViewer?.dataType === 'int64') return 'right';
  return 'left';
};

// ============================================================
// STAR RATING COMPONENT
// ============================================================
const StarRating = React.memo(({ rating }) => {
  const color = rating >= 4 
    ? 'text-green-600 dark:text-green-400' 
    : rating === 3 
    ? 'text-yellow-600 dark:text-yellow-400'
    : 'text-red-600 dark:text-red-400';

  return (
    <div className={`flex items-center gap-1 ${color}`}>
      {[1, 2, 3, 4, 5].map(star => (
        <svg
          key={star}
          className={`w-4 h-4 ${star <= rating ? 'fill-current' : 'stroke-current fill-none'}`}
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      <span className="ml-1 text-sm font-medium">{rating}</span>
    </div>
  );
});

StarRating.displayName = 'StarRating';

// ============================================================
// POP OUT MODAL
// ============================================================
const SimpleModal = ({ isOpen, onClose, children }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };    
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" 
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden"
        style={{ width: '90vw', height: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <div className="absolute top-0 right-0 p-2 z-10">
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 bg-white/80 dark:bg-gray-800/80 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="h-full overflow-hidden p-2">
          {children}
        </div>
      </div>
    </div>
  );
};

const ColumnVisibilityControl = ({ visibleColumns, onToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        title="Show/hide columns"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20 p-2 max-h-80 overflow-y-auto">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 px-2">Columns</div>
            <div className="space-y-0.5">
              {COLUMN_CONFIG.filter(col => col.id !== 'row_number').map(col => (
                <label 
                  key={col.id} 
                  className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={visibleColumns[col.id]}
                    onChange={() => onToggle(col.id)}
                    className="w-3 h-3 rounded border-gray-300 dark:border-gray-600 text-blue-600"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{col.label}</span>
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
// MAIN COMPONENT
// ============================================================
const DatasetViewer = ({ reviews = [], isModal = false, containerKey }) => {
  // Core state
  const [viewMode, setViewMode] = useState('cards');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState(new Set());
  const [visibleColumns, setVisibleColumns] = useState(
    COLUMN_CONFIG.reduce((acc, col) => ({ ...acc, [col.id]: col.dataViewer?.defaultVisible }), {})
  );
  const { t } = useTranslation();

  // Rating filter state
  const [ratingFilter, setRatingFilter] = useState('all'); // 'all', 'positive', 'neutral', 'negative'
  const [productFilter, setProductFilter] = useState('all');
  const [helpfulVotesInput, setHelpfulVotesInput] = useState(0);
  const helpfulVotesThreshold = useDebounce(helpfulVotesInput, 600);

  // Refs for list management
  const cardListRef = useRef(null);
  const tableListRef = useRef(null);
  const headerScrollRef = useRef(null);
  const bodyScrollRef = useRef(null);
  
  // Refs for dynamic height calculation
  const cardBodyContainerRef = useRef(null);
  const tableBodyContainerRef = useRef(null);

  // Dynamic heights using custom hook
  const cardBodyHeight = useDynamicHeight(cardBodyContainerRef, [viewMode, expandedReviews, containerKey]);
  const tableBodyHeight = useDynamicHeight(tableBodyContainerRef, [viewMode, expandedReviews, containerKey]);

  // Force list recalculation when container resizes
  useEffect(() => {
    if (containerKey !== undefined) {
      // Small delay to ensure DOM has updated
      const timeoutId = setTimeout(() => {
        if (viewMode === 'cards' && cardListRef.current) {
          cardListRef.current.resetAfterIndex(0);
        } else if (viewMode === 'table' && tableListRef.current) {
          tableListRef.current.resetAfterIndex(0);
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [containerKey, viewMode]);

  // Toggle review expansion and reset list item sizes
  const toggleReview = useCallback((index) => {
    setExpandedReviews(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });

    // Reset cache after state update to ensure proper height recalculation
    setTimeout(() => {
      if (viewMode === 'cards' && cardListRef.current) {
        cardListRef.current.resetAfterIndex(0);
      } else if (viewMode === 'table' && tableListRef.current) {
        tableListRef.current.resetAfterIndex(0);
      }
    }, 0);
  }, [viewMode]);

  // Clear expanded reviews when switching view modes
  useEffect(() => {
    setExpandedReviews(new Set());
  }, [viewMode]);

  // ============================================================
  // FILTERING LOGIC
  // ============================================================
  const filteredReviews = useMemo(() => {
    let result = [...reviews];
        
    // Filter by rating
    if (ratingFilter !== 'all') {
      if (ratingFilter === 'positive') {
        result = result.filter(r => r.star_rating >= 4);
      } else if (ratingFilter === 'neutral') {
        result = result.filter(r => r.star_rating === 3);
      } else if (ratingFilter === 'negative') {
        result = result.filter(r => r.star_rating <= 2);
      }
    }

    // Filter by product
    if (productFilter && productFilter !== 'all') {
      result = result.filter(r => r.product_id === productFilter);
    }

    // Filter by helpful votes
    if (helpfulVotesThreshold > 0) {
      result = result.filter(r => (r.helpful_votes || 0) >= helpfulVotesThreshold);
    }
    
    return result;
  }, [reviews, ratingFilter, productFilter, helpfulVotesThreshold]);

  // Calculate filter counts for buttons
  const filterCounts = useMemo(() => {
    // Start with all reviews
    let result = [...reviews];
    
    
    // Apply product filter
    if (productFilter && productFilter !== 'all') {
      result = result.filter(r => r.product_id === productFilter);
    }
    
    // Apply helpful votes filter
    if (helpfulVotesThreshold > 0) {
      result = result.filter(r => (r.helpful_votes || 0) >= helpfulVotesThreshold);
    }
    
    // Now count by rating from the filtered set
    if (!result || result.length === 0) {
      return { positive: 0, neutral: 0, negative: 0 };
    }
    
    return {
      total: result.length,
      positive: result.filter(r => r.star_rating >= 4).length,
      neutral: result.filter(r => r.star_rating === 3).length,
      negative: result.filter(r => r.star_rating <= 2).length
    };
  }, [reviews, productFilter, helpfulVotesThreshold]);

  // Get unique products for product filter dropdown
  const uniqueProducts = useMemo(() => {
    if (!reviews || reviews.length === 0) return [];
    const productMap = new Map();
    reviews.forEach(r => {
      if (r.product_id && !productMap.has(r.product_id)) {
        productMap.set(r.product_id, r.product_title || r.product_id);
      }
    });
    return Array.from(productMap.entries()).map(([id, title]) => ({ id, title }));
  }, [reviews]);

  // ============================================================
  // SORTING LOGIC
  // ============================================================
  const sortedReviews = useMemo(() => {
    if (!sortColumn) return filteredReviews;

    return [...filteredReviews].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      // Handle null/undefined values
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      // Numeric comparison
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // String comparison
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
      
      if (sortDirection === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  }, [filteredReviews, sortColumn, sortDirection]);

  // Handle sorting
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

  // Column visibility toggle
  const toggleColumnVisibility = useCallback((columnId) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnId]: !prev[columnId]
    }));
  }, []);

  // ============================================================
  // CARD VIEW ROW RENDERER
  // ============================================================
  const CardRow = useCallback(({ index, style }) => {
    const startIdx = index * CARDS_PER_ROW;
    const cardsInRow = sortedReviews.slice(startIdx, startIdx + CARDS_PER_ROW);

    return (
      <div style={{ ...style, display: 'flex', gap: `${CARD_SPACING}px`, padding: `${CARD_SPACING}px` }}>
        {cardsInRow.map((review, cardIndex) => {
          const globalIndex = startIdx + cardIndex;
          const isExpanded = expandedReviews.has(globalIndex);

          return (
            <div
              key={review.review_id || globalIndex}
              className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700 overflow-hidden"
              style={{ 
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                height: '100%' // Fill the row height (which is calculated based on content)
              }}
            >
              {/* Card Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between mb-2">
                  <StarRating rating={review.star_rating} />
                  {review.verified_purchase && (
                    <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded">
                      Verified
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
                  <SafeText text={review.review_headline || 'No headline'} />
                </h3>
              </div>

              {/* Card Body - Scrollable when expanded */}
              <div 
                className="p-4 flex-1 overflow-hidden"
                style={{
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div 
                  className={`text-gray-700 dark:text-gray-300 text-sm ${
                    isExpanded ? 'overflow-y-auto flex-1' : 'line-clamp-4'
                  }`}
                  style={isExpanded ? {
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#CBD5E0 transparent'
                  } : {}}
                  onClick={(e) => isExpanded && e.stopPropagation()}
                >
                  <SafeText text={review.review_body || 'No review text'} />
                </div>

                {/* Footer - Only show when expanded */}
                {isExpanded && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
                    <div className="truncate">
                      <span className="font-medium">Product:</span> <SafeText text={review.product_title} />
                    </div>
                    <div className="flex justify-between">
                      <span>
                        <span className="font-medium">Helpful:</span> {review.helpful_votes || 0}
                      </span>
                      <span>
                        <span className="font-medium">ID:</span> {review.review_id?.slice(0, 8)}...
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Expand/Collapse Button */}
              <button
                onClick={() => toggleReview(globalIndex)}
                className="w-full py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 border-t border-gray-200 dark:border-gray-700"
              >
                {isExpanded ? '▲ Show Less' : '▼ Read More'}
              </button>
            </div>
          );
        })}
        {/* Fill empty space if last row has fewer cards */}
        {cardsInRow.length < CARDS_PER_ROW && (
          <div style={{ flex: CARDS_PER_ROW - cardsInRow.length, minWidth: 0 }} />
        )}
      </div>
    );
  }, [sortedReviews, expandedReviews, toggleReview]);

  // ============================================================
  // RENDER
  // ============================================================
  const ViewerContent = useCallback(({ isModal = false } = {}) => (
    <div className={`flex flex-col ${isModal ? 'h-full' : 'h-full'} bg-white dark:bg-gray-900`}>
      {/* Compact Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Title + View Mode + Count */}
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {t('dataViewer.title', 'Data Viewer')}
            </h3>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            
            {/* View Mode Toggle - Compact */}
            <div 
              data-tour="view-mode-toggle"
              className="view-mode-buttons flex bg-gray-100 dark:bg-gray-700 rounded-md p-0.5 gap-0.5"
            >
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                title={t('dataViewer.viewMode.cards', 'Card view')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                title={t('dataViewer.viewMode.table', 'Table view')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>

            {viewMode === 'table' && (
              <ColumnVisibilityControl 
                visibleColumns={visibleColumns}
                onToggle={toggleColumnVisibility}
              />
            )}
            
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {sortedReviews.length.toLocaleString()} {t('dataViewer.reviewsCount', 'reviews')}
            </span>
          </div>

          {/* Right: Pop-out button */}
          {!isModal && (
            <button
              onClick={() => setIsModalOpen(true)}
              data-tour="pop-out-dataviewer-button"
              className="pop-out-dataviewer-button p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
              title={t('dataViewer.openModal', 'Open in modal')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter Buttons Row - Compact */}
        <div 
          data-tour="filter-buttons"
          className="filter-buttons flex flex-wrap items-center gap-2 mt-2"
        >
          <button
            onClick={() => startTransition(() => setRatingFilter('all'))}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              ratingFilter === 'all'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('dataViewer.filters.all', 'All')} ({filterCounts.total})
          </button>
          <button
            onClick={() => startTransition(() => setRatingFilter('positive'))}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              ratingFilter === 'positive'
                ? 'bg-green-600 dark:bg-green-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('dataViewer.filters.positive', 'Positive')} ({filterCounts.positive})
          </button>
          <button
            onClick={() => startTransition(() => setRatingFilter('neutral'))}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              ratingFilter === 'neutral'
                ? 'bg-yellow-600 dark:bg-yellow-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('dataViewer.filters.neutral', 'Neutral')} ({filterCounts.neutral})
          </button>
          <button
            onClick={() => startTransition(() => setRatingFilter('negative'))}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              ratingFilter === 'negative'
                ? 'bg-red-600 dark:bg-red-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('dataViewer.filters.negative', 'Negative')} ({filterCounts.negative})
          </button>

          {uniqueProducts.length > 1 && (
            <>
              <div className="hidden sm:block h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1" />
              <select
                value={productFilter}
                onChange={(e) => startTransition(() => setProductFilter(e.target.value))}
                className="px-2 py-1 rounded-md text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 w-auto min-w-[100px] max-w-[150px] sm:max-w-[200px] lg:max-w-[250px]"
              >
                <option value="all">{t('dataViewer.filters.allProducts', 'All Products')}</option>
                {uniqueProducts.map(product => {
                  // Adaptive truncation based on screen size
                  const truncateAt = window.innerWidth < 640 ? 20 : window.innerWidth < 1024 ? 30 : 40;
                  const displayTitle = product.title.length > truncateAt 
                    ? `${product.title.substring(0, truncateAt)}...` 
                    : product.title;
                  
                  return (
                    <option key={product.id} value={product.id} title={product.title}>
                      {displayTitle}
                    </option>
                  );
                })}
              </select>
            </>
          )}
        </div>

        {isPending && (
          <div className="mt-1.5 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
            <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-400 border-t-transparent"></div>
            <span>{t('dataViewer.updating', 'Updating...')}</span>
          </div>
        )}
      </div>

      {/* Content Area - Flexible Height */}
      {sortedReviews.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
          {t('dataViewer.noReviews', 'No reviews found')}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden">
          {viewMode === 'cards' ? (
            /* CARD VIEW with VariableSizeList */
            <div 
              ref={cardBodyContainerRef}
              className="h-full w-full"
            >
              <VariableSizeList
                ref={cardListRef}
                height={cardBodyHeight}
                itemCount={Math.ceil(sortedReviews.length / CARDS_PER_ROW)}
                itemSize={(index) => {
                  // Calculate the maximum height needed for this row
                  // based on actual content of cards in the row
                  const startIdx = index * CARDS_PER_ROW;
                  const endIdx = Math.min(startIdx + CARDS_PER_ROW, sortedReviews.length);
                  
                  let maxHeight = CARD_HEIGHT_COLLAPSED;
                  
                  // Calculate card width: container width divided by cards per row, minus spacing
                  // Assuming typical container width, accounting for padding and gaps
                  const containerRef = cardBodyContainerRef.current;
                  const containerWidth = containerRef ? containerRef.offsetWidth : 1200;
                  const totalGaps = CARD_SPACING * (CARDS_PER_ROW + 1); // Gaps between cards and edges
                  const cardWidth = (containerWidth - totalGaps) / CARDS_PER_ROW;
                  
                  // Check each card in the row and calculate its actual needed height
                  for (let i = startIdx; i < endIdx; i++) {
                    const review = sortedReviews[i];
                    const isExpanded = expandedReviews.has(i);
                    
                    if (isExpanded) {
                      const cardHeight = calculateCardHeight(review, true, cardWidth);
                      maxHeight = Math.max(maxHeight, cardHeight);
                    }
                  }
                  
                  return maxHeight + CARD_SPACING;
                }}
                width="100%"
                overscanCount={2}
              >
                {CardRow}
              </VariableSizeList>
            </div>
          ) : (
            /* TABLE VIEW with VariableSizeList */
            <div className="flex flex-col h-full">
              {/* Fixed Header - Synced Horizontal Scroll */}
              <div className="flex-none overflow-hidden border-b border-gray-300 dark:border-gray-600">
                <div
                  ref={headerScrollRef}
                  className="overflow-x-auto scrollbar-hide"
                  style={{ overflowY: 'hidden' }}
                >
                  <div style={{ display: 'flex', minWidth: 'fit-content', backgroundColor: 'rgb(243 244 246)', /* dark mode handled by class below */ }}>
                    {COLUMN_CONFIG.filter(col => visibleColumns[col.id]).map(col => {
                      const alignment = getColumnAlignment(col);
                      const justifyContent = alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start';
                      
                      return (
                        <div
                          key={col.id}
                          style={{
                            minWidth: `${col.dataViewer?.minWidth}px`,
                            width: `${col.dataViewer?.minWidth}px`,
                            flexGrow: 1,
                            flexShrink: 1,
                            flexBasis: `${col.dataViewer?.minWidth}px`,
                            maxWidth: `${col.dataViewer?.maxWidth}px`,
                            padding: '8px 12px',
                            fontWeight: 600,
                            fontSize: '14px',
                            cursor: col.dataViewer?.sortable ? 'pointer' : 'default',
                            textAlign: alignment
                          }}
                          className={`text-gray-700 dark:text-gray-300 dark:bg-gray-700 ${
                            col.dataViewer?.sortable ? 'hover:bg-gray-200 dark:hover:bg-gray-600' : ''
                          }`}
                          onClick={() => col.dataViewer?.sortable && handleSort(col.id)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent, gap: '4px' }}>
                            <span>{col.label}</span>
                            {col.dataViewer?.sortable && sortColumn === col.id && (
                              <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Virtual Scrolling Body - FixedSizeList handles ALL scrolling */}
              <div 
                ref={tableBodyContainerRef}
                className="flex-1 min-h-0"
                style={{ overflow: 'hidden' }}
              >
                <VariableSizeList
                  ref={tableListRef}
                  height={tableBodyHeight}
                  itemCount={sortedReviews.length}
                  itemSize={(index) => {
                    // Calculate actual height needed based on content and column widths
                    const review = sortedReviews[index];
                    const isExpanded = expandedReviews.has(index);
                    
                    return calculateTableRowHeight(review, isExpanded, visibleColumns);
                  }}
                  width="100%"
                  overscanCount={10}
                  outerRef={(ref) => {
                    bodyScrollRef.current = ref;
                    // Attach scroll listener to sync header
                    if (ref) {
                      ref.addEventListener('scroll', (e) => {
                        if (headerScrollRef.current) {
                          headerScrollRef.current.scrollLeft = e.target.scrollLeft;
                        }
                      });
                    }
                  }}
                >
                  {({ index, style }) => {
                    const review = sortedReviews[index];
                    const isExpanded = expandedReviews.has(index);
                    
                    return (
                      <div
                        style={style}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-700"
                        onClick={() => toggleReview(index)}
                      >
                        <div style={{ display: 'flex', minWidth: 'fit-content', height: '100%' }}>
                          {COLUMN_CONFIG.filter(col => visibleColumns[col.id]).map(col => {
                            const alignment = getColumnAlignment(col);
                            let cellContent = review[col.id];
                            
                            // Format cell content based on column type
                            if (col.id === 'star_rating' && cellContent) {
                              cellContent = '⭐'.repeat(cellContent);
                            } else if (col.id === 'verified_purchase') {
                              cellContent = cellContent ? '✓' : !cellContent ? '✗' : '-';
                            } else if (cellContent === null || cellContent === undefined || cellContent === '') {
                              cellContent = '-';
                            }
                            
                            // Special handling for review_body and review_headline to show full text when expanded
                            const isTextColumn = col.id === 'review_body' || col.id === 'review_headline';
                            
                            return (
                              <div
                                key={col.id}
                                style={{
                                  minWidth: `${col.dataViewer?.minWidth}px`,
                                  width: `${col.dataViewer?.minWidth}px`,
                                  flexGrow: 1,
                                  flexShrink: 1,
                                  flexBasis: `${col.dataViewer?.minWidth}px`,
                                  maxWidth: `${col.dataViewer?.maxWidth}px`,
                                  padding: '12px',
                                  textAlign: alignment,
                                  display: 'flex',
                                  alignItems: isTextColumn ? 'flex-start' : 'center',
                                  overflow: 'hidden'
                                }}
                                className={`${
                                  col.id === 'row_number' 
                                    ? 'text-gray-600 dark:text-gray-400' 
                                    : 'text-gray-900 dark:text-gray-100'
                                }`}
                              >
                                {col.id === 'row_number' ? (
                                  // Row number with expand indicator
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                                    <span>{index + 1}</span>
                                  </div>
                                ) : isTextColumn && isExpanded ? (
                                  // Expanded text with scrolling - height controlled by row
                                  <div 
                                    className="overflow-y-auto pr-2 w-full h-full"
                                    style={{
                                      scrollbarWidth: 'thin',
                                      scrollbarColor: '#CBD5E0 transparent'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <SafeText text={cellContent} />
                                  </div>
                                ) : isTextColumn ? (
                                  // Collapsed text with truncation - override SafeText's pre-line
                                  <div className="truncate w-full overflow-hidden" style={{ lineHeight: '1.5' }}>
                                    <SafeText text={cellContent} className="block truncate" />
                                  </div>
                                ) : col.dataType === 'string' ? (
                                  // Other string columns (IDs, product titles, etc.)
                                  <div className={col.id === 'product_title' ? 'truncate w-full' : 'w-full'}>
                                    <SafeText text={cellContent} />
                                  </div>
                                ) : (
                                  // Non-string cells (numbers, stars, verified badge, etc.)
                                  <span>{cellContent}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }}
                </VariableSizeList>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  ), [
    sortedReviews,
    viewMode,
    isPending,
    expandedReviews,
    visibleColumns,
    sortColumn,
    sortDirection,
    cardBodyHeight,
    tableBodyHeight,
    toggleReview,
    handleSort,
    toggleColumnVisibility,
    CardRow,
    reviews,
    ratingFilter,
    filterCounts,
    uniqueProducts,
    productFilter,
    helpfulVotesInput,
    setViewMode,
    setIsModalOpen,
    setRatingFilter,
    setProductFilter,
    setHelpfulVotesInput
  ]);

  return (
    <>
      <ViewerContent key="embed" />
      <SimpleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ViewerContent key="modal" isModal />
      </SimpleModal>
    </>
  );
};

export default DatasetViewer;