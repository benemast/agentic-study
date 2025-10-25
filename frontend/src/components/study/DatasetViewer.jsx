// frontend/src/components/study/DatasetViewer.jsx
/**
 * Optimized Dataset Viewer
 * 
 * Features:
 * - Card & Table view modes
 * - Modal popout for expanded view
 * - Rating filters (positive/neutral/negative)
 * - Progressive batch loading (50 reviews at a time)
 * - Expandable review details
 * - Tooltips on all interactive elements
 * - Optimized rendering (no unnecessary re-renders)
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';

const BATCH_SIZE = 50;

// ============================================================
// STAR RATING COMPONENT
// ============================================================
const StarRating = ({ rating }) => {
  const color = rating >= 4 ? 'text-green-600' : rating === 3 ? 'text-yellow-600' : 'text-red-600';
  
  return (
    <div className="flex items-center gap-1">
      <span className={`font-bold ${color}`}>{rating}</span>
      <span className="text-yellow-400">★</span>
    </div>
  );
};

// ============================================================
// REVIEW CARD COMPONENT
// ============================================================
const ReviewCard = React.memo(({ review, isExpanded, onToggle, index }) => {
  return (
    <div 
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onToggle}
      title="Click to expand/collapse review details"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 truncate">
            {review.review_headline || 'No headline'}
          </h4>
          {review.verified_purchase && (
            <span className="inline-block text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded mt-1">
              Verified Purchase
            </span>
          )}
        </div>
        <StarRating rating={review.star_rating} />
      </div>

      {/* Body */}
      <p className={`text-sm text-gray-700 ${isExpanded ? '' : 'line-clamp-3'}`}>
        {review.review_body || 'No review text'}
      </p>

      {/* Footer */}
      {(review.helpful_votes > 0 || isExpanded) && (
        <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between text-xs">
          <span className="text-gray-600">
            {review.helpful_votes > 0 
              ? `👍 ${review.helpful_votes} of ${review.total_votes || review.helpful_votes} found helpful`
              : 'No helpful votes'}
          </span>
          {isExpanded && review.review_id && (
            <span className="text-gray-500">ID: {review.review_id.slice(0, 8)}...</span>
          )}
        </div>
      )}
    </div>
  );
});

ReviewCard.displayName = 'ReviewCard';

// ============================================================
// MAIN DATA VIEWER COMPONENT
// ============================================================
const DatasetViewer = ({ 
  category, 
  productId, 
  taskNumber,
  // Data passed from parent (single source of truth)
  reviews = [],
  reviewCount = 0,
  totalCount = 0,
  loading = false,
  loadingMore = false,
  progress = 0,
  hasMore = false,
  error = null,
  onRetry = () => {}
}) => {
  // ============================================================
  // DEBUG LOGGING
  // ============================================================
  useEffect(() => {
    console.log('[DatasetViewer] Props updated:', {
      reviewsLength: reviews.length,
      reviewCount,
      totalCount,
      loading,
      loadingMore,
      progress,
      hasMore,
      error,
      category,
      productId
    });
  }, [reviews, reviewCount, totalCount, loading, loadingMore, progress, hasMore, error, category, productId]);
  
  // ============================================================
  // LOCAL STATE
  // ============================================================
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [filter, setFilter] = useState('all'); // 'all' | 'positive' | 'neutral' | 'negative'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(BATCH_SIZE);
  const [expandedReviews, setExpandedReviews] = useState(new Set());
  
  const scrollContainerRef = useRef(null);
  const scrollPositionRef = useRef(0);
  const previousReviewsLengthRef = useRef(0);

  // ============================================================
  // COMPUTED VALUES (MEMOIZED)
  // ============================================================
  
  // Filter reviews by rating
  const filteredReviews = useMemo(() => {
    if (!reviews || reviews.length === 0) return [];
    
    switch (filter) {
      case 'positive':
        return reviews.filter(r => r.star_rating >= 4);
      case 'negative':
        return reviews.filter(r => r.star_rating <= 2);
      case 'neutral':
        return reviews.filter(r => r.star_rating === 3);
      default:
        return reviews;
    }
  }, [reviews, filter]);

  // Get visible reviews (batch loaded)
  const visibleReviews = useMemo(() => {
    return filteredReviews.slice(0, displayedCount);
  }, [filteredReviews, displayedCount]);

  // Calculate filter counts
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

  hasMore = displayedCount < filteredReviews.length;

  // ============================================================
  // EFFECTS
  // ============================================================
  
  // Save scroll position before reviews update (background loading)
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollPositionRef.current = scrollContainerRef.current.scrollTop;
    }
  }, [reviews.length]); // Run before length changes
  
  // Restore scroll position after reviews update (background loading)
  useEffect(() => {
    // Only restore if reviews increased (background loading)
    // AND it's not a filter change (filter resets scroll to 0)
    const reviewsIncreased = reviews.length > previousReviewsLengthRef.current;
    
    if (reviewsIncreased && scrollPositionRef.current > 0 && scrollContainerRef.current) {
      // Restore scroll position
      scrollContainerRef.current.scrollTop = scrollPositionRef.current;
    }
    
    // Update previous length
    previousReviewsLengthRef.current = reviews.length;
  }, [reviews.length]);
  
  // Reset displayed count and scroll when filter changes
  useEffect(() => {
    setDisplayedCount(BATCH_SIZE);
    scrollPositionRef.current = 0; // Reset saved position
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [filter]);

  // ============================================================
  // EVENT HANDLERS
  // ============================================================
  
  // Handle infinite scroll
  const handleScroll = useCallback((e) => {
    const element = e.target;
    
    // Save current scroll position
    scrollPositionRef.current = element.scrollTop;

    const bottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 100;
    
    if (bottom && hasMore) {
      setDisplayedCount(prev => Math.min(prev + BATCH_SIZE, filteredReviews.length));
    }
  }, [hasMore, filteredReviews.length]);

  // Toggle review expansion
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

  // ============================================================
  // RENDER HELPERS
  // ============================================================

  const FilterButton = ({ value, label, count }) => (
    <button
      onClick={() => setFilter(value)}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        filter === value
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
      title={`Show ${label.toLowerCase()} reviews (${count} available)`}
    >
      {label} ({count})
    </button>
  );

  const ViewModeButton = ({ mode, icon, label }) => (
    <button
      onClick={() => setViewMode(mode)}
      className={`p-2 rounded-lg transition-colors ${
        viewMode === mode
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
      title={`Switch to ${label} view`}
    >
      {icon}
    </button>
  );

  // ============================================================
  // LOADING STATE
  // ============================================================
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading reviews...</p>
          <p className="text-sm text-gray-500 mt-1">This may take a few moments</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // ERROR STATE
  // ============================================================
  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load reviews</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // EMPTY STATE
  // ============================================================
  if (reviewCount === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">No reviews available</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN RENDER
  // ============================================================
  
  const ViewerContent = ({ isModal = false }) => (
    <div className={`flex flex-col h-full ${isModal ? 'bg-white' : 'bg-gray-50'}`}>
      {/* Toolbar */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 p-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left: Filter buttons */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 mr-2">Filter:</span>
            <FilterButton value="all" label="All" count={reviewCount} />
            <FilterButton value="positive" label="Positive" count={filterCounts.positive} />
            <FilterButton value="neutral" label="Neutral" count={filterCounts.neutral} />
            <FilterButton value="negative" label="Negative" count={filterCounts.negative} />
          </div>

          {/* Right: View mode & modal toggle */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1 border border-gray-300 rounded-lg p-1">
              <ViewModeButton 
                mode="cards" 
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                }
                label="Card"
              />
              <ViewModeButton 
                mode="table" 
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                }
                label="Table"
              />
            </div>

            {!isModal && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                title="Open in fullscreen modal for better visibility"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Status bar */}
        <div className="mt-2 flex items-center gap-3">
          <div className="text-sm text-gray-600">
            {filter === 'all' ? (
              // No filter: Show simple counts
              <>
                Showing {visibleReviews.length} of {filteredReviews.length}
                {totalCount > reviewCount && ` • ${reviewCount}/${totalCount} loaded`}
              </>
            ) : (
              // Filter active: Show filter-specific counts
              <>
                Showing {visibleReviews.length} of {filteredReviews.length} <span className="font-medium">{filter.charAt(0).toUpperCase() + filter.slice(1)}</span> reviews
                {filteredReviews.length < reviewCount && (
                  <span className="text-gray-500"> (from {reviewCount} loaded)</span>
                )}
              </>
            )}
          </div>
          
          {/* Background loading indicator */}
          {loadingMore && (
            <div className="flex items-center gap-2 text-xs text-blue-600">
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></div>
              <span>Loading more... {progress}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4"
        onScroll={handleScroll}
      >
        {viewMode === 'cards' ? (
          // CARD VIEW
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {visibleReviews.map((review, index) => (
              <ReviewCard
                key={review.review_id || index}
                review={review}
                isExpanded={expandedReviews.has(index)}
                onToggle={() => toggleReview(index)}
                index={index}
              />
            ))}
          </div>
        ) : (
          // TABLE VIEW
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 w-20">Rating</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 w-32">Headline</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Review</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 w-24">Helpful</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700 w-20">Verified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {visibleReviews.map((review, index) => (
                  <tr 
                    key={review.review_id || index}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleReview(index)}
                    title="Click to expand/collapse review"
                  >
                    <td className="px-3 py-3 align-top">
                      <StarRating rating={review.star_rating} />
                    </td>
                    <td className="px-3 py-3 align-top">
                      <span className="font-medium text-gray-900 line-clamp-2">
                        {review.review_headline || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <p className={`text-gray-700 ${expandedReviews.has(index) ? '' : 'line-clamp-2'}`}>
                        {review.review_body || '-'}
                      </p>
                    </td>
                    <td className="px-3 py-3 align-top text-xs text-gray-600">
                      {review.helpful_votes > 0 ? `${review.helpful_votes}/${review.total_votes || review.helpful_votes}` : '-'}
                    </td>
                    <td className="px-3 py-3 align-top text-center">
                      {review.verified_purchase ? (
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full" title="Verified Purchase"></span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Load More Indicator */}
        {hasMore && (
          <div className="text-center py-6">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
            <p className="text-sm text-gray-600 mt-2">Loading more reviews...</p>
          </div>
        )}

        {/* End of List */}
        {!hasMore && visibleReviews.length > 0 && (
          <div className="text-center py-4 text-sm text-gray-500">
            End of reviews
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Main Viewer */}
      <ViewerContent />

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Dataset Viewer</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Close modal"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-hidden">
              <ViewerContent isModal={true} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DatasetViewer;