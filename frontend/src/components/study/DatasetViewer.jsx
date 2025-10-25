// frontend/src/components/study/DatasetViewer.jsx
/**
 * Scrollable Dataset Viewer  
 * Displays review data for participants to browse during tasks
 * 
 * Features:
 * - Batch loading (infinite scroll)
 * - Card/Table view toggle
 * - Fullscreen modal view
 * - Rating filters
 * - Expandable reviews
 * 
 * Usage Modes:
 * 1. STANDALONE (fetches own data): <DatasetViewer category="wireless" productId="B001" taskNumber={1} />
 * 2. PROP-DRIVEN (receives data): <DatasetViewer reviews={data} loading={loading} error={error} category="wireless" />
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useReviewData } from '../../hooks/useReviewData';

const BATCH_SIZE = 50; // Load 50 reviews at a time

const DatasetViewer = ({ 
  // STANDALONE MODE props
  category,
  productId,
  taskNumber,
  
  // PROP-DRIVEN MODE props
  reviews: reviewsProp,
  loading: loadingProp,
  error: errorProp,
  onRetry: onRetryProp,
}) => {
  // ============================================================
  // SMART DATA FETCHING
  // ============================================================
  // If reviews are passed as props, use them (prop-driven mode)
  // Otherwise, fetch using hook (standalone mode)
  
  const shouldFetchOwnData = !reviewsProp && category && productId;
  
  const hookData = useReviewData({
    category,
    productId,
    taskNumber,
    enabled: shouldFetchOwnData
  });
  
  // Use prop data if available, otherwise use hook data
  const reviews = reviewsProp || hookData.reviews || [];
  const loading = reviewsProp !== undefined ? loadingProp : hookData.loading;
  const error = reviewsProp !== undefined ? errorProp : hookData.error;
  const retry = onRetryProp || hookData.retry;

  // ============================================================
  // LOCAL STATE
  // ============================================================
  const [expandedReview, setExpandedReview] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'positive', 'negative', 'neutral'
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(BATCH_SIZE);
  const scrollRef = useRef(null);

  // ============================================================
  // COMPUTED VALUES
  // ============================================================
  
  /**
   * Filter reviews by rating
   */
  const filteredReviews = useMemo(() => {
    if (!reviews) return [];
    
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

  /**
   * Get visible reviews (batch loaded)
   */
  const visibleReviews = useMemo(() => {
    return filteredReviews.slice(0, displayedCount);
  }, [filteredReviews, displayedCount]);

  /**
   * Get filter counts
   */
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
  // EFFECTS
  // ============================================================
  
  /**
   * Reset displayed count when filter changes
   */
  useEffect(() => {
    setDisplayedCount(BATCH_SIZE);
  }, [filter]);

  // ============================================================
  // EVENT HANDLERS
  // ============================================================
  
  /**
   * Handle scroll to load more reviews
   */
  const handleScroll = (e) => {
    const element = e.target;
    const bottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 100;
    
    if (bottom && displayedCount < filteredReviews.length) {
      setDisplayedCount(prev => Math.min(prev + BATCH_SIZE, filteredReviews.length));
    }
  };

  /**
   * Toggle review expansion
   */
  const toggleReview = (index) => {
    setExpandedReview(expandedReview === index ? null : index);
  };

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================
  
  /**
   * Get color class based on rating
   */
  const getRatingColor = (rating) => {
    if (rating >= 4) return 'text-green-600';
    if (rating === 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  /**
   * Get background color based on rating
   */
  const getRatingBg = (rating) => {
    if (rating >= 4) return 'bg-green-50 border-green-200';
    if (rating === 3) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  /**
   * Render star rating
   */
  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <span key={star} className={star <= rating ? getRatingColor(rating) : 'text-gray-300'}>
            ★
          </span>
        ))}
        <span className="text-xs text-gray-500 ml-1">({rating}/5)</span>
      </div>
    );
  };

  // ============================================================
  // VIEW RENDERERS
  // ============================================================
  
  /**
   * Render Card View
   */
  const renderCardView = () => (
    <div className="space-y-3">
      {visibleReviews.map((review, index) => (
        <div 
          key={review.review_id || index}
          className={`rounded-lg p-4 border-2 transition-all cursor-pointer ${
            expandedReview === index
              ? getRatingBg(review.star_rating) + ' shadow-md'
              : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow-sm'
          }`}
          onClick={() => toggleReview(index)}
        >
          {/* Header Row */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              {renderStars(review.star_rating)}
            </div>
            
            <div className="flex items-center gap-2">
              {review.verified_purchase && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                  ✓ Verified
                </span>
              )}
              {expandedReview === index ? (
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
          </div>

          {/* Headline */}
          {review.review_headline && (
            <h4 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2">
              {review.review_headline}
            </h4>
          )}

          {/* Review Body */}
          <p className={`text-sm text-gray-700 leading-relaxed ${
            expandedReview === index ? '' : 'line-clamp-3'
          }`}>
            {review.review_body || '-'}
          </p>

          {/* Footer */}
          {(review.helpful_votes > 0 || expandedReview === index) && (
            <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
              {review.helpful_votes > 0 ? (
                <div className="text-xs text-gray-600">
                  👍 {review.helpful_votes} of {review.total_votes || review.helpful_votes} found helpful
                </div>
              ) : (
                <div className="text-xs text-gray-400">
                  No helpful votes
                </div>
              )}
              
              {expandedReview === index && review.review_id && (
                <div className="text-xs text-gray-500">
                  ID: {review.review_id.slice(0, 8)}...
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      
      {/* Load More Indicator */}
      {displayedCount < filteredReviews.length && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
          <p className="text-sm text-gray-600 mt-2">Loading more reviews...</p>
        </div>
      )}
    </div>
  );

  /**
   * Render Table View
   */
  const renderTableView = () => (
    <div className="overflow-x-auto">
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
            >
              <td className="px-3 py-3 align-top">
                <div className="flex items-center gap-1">
                  <span className={`font-bold ${getRatingColor(review.star_rating)}`}>
                    {review.star_rating}
                  </span>
                  <span className="text-gray-400">★</span>
                </div>
              </td>
              <td className="px-3 py-3 align-top">
                <span className="font-medium text-gray-900 line-clamp-2">
                  {review.review_headline || '-'}
                </span>
              </td>
              <td className="px-3 py-3 align-top">
                <p className={`text-gray-700 ${expandedReview === index ? '' : 'line-clamp-2'}`}>
                  {review.review_body || '-'}
                </p>
              </td>
              <td className="px-3 py-3 align-top text-center">
                <span className="text-xs text-gray-600">
                  {review.helpful_votes > 0 ? `👍 ${review.helpful_votes}` : '-'}
                </span>
              </td>
              <td className="px-3 py-3 align-top text-center">
                {review.verified_purchase ? (
                  <span className="text-blue-600 font-bold">✓</span>
                ) : (
                  <span className="text-gray-300">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Load More Indicator */}
      {displayedCount < filteredReviews.length && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
          <p className="text-sm text-gray-600 mt-2">Loading more reviews...</p>
        </div>
      )}
    </div>
  );

  /**
   * Render Dataset Content (shared between normal and modal view)
   */
  const renderContent = () => (
    <>
      {/* Header with Controls */}
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">
            Dataset Preview
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
              {visibleReviews.length} of {filteredReviews.length} shown
            </span>
            
            {/* View Toggle */}
            <div className="flex bg-gray-200 rounded p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Card View"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Table View"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>

            {/* Enlarge Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              title="Enlarge view"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All ({reviews.length})
          </button>
          <button
            onClick={() => setFilter('positive')}
            className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
              filter === 'positive'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Positive ({filterCounts.positive})
          </button>
          <button
            onClick={() => setFilter('neutral')}
            className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
              filter === 'neutral'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Neutral ({filterCounts.neutral})
          </button>
          <button
            onClick={() => setFilter('negative')}
            className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
              filter === 'negative'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Negative ({filterCounts.negative})
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4"
        onScroll={handleScroll}
      >
        {viewMode === 'cards' ? renderCardView() : renderTableView()}
      </div>

      {/* Footer Stats */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Total: {filteredReviews.length} reviews</span>
          {category && <span>{category} Products</span>}
        </div>
      </div>
    </>
  );

  // ============================================================
  // RENDER STATES
  // ============================================================

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mb-3"></div>
          <p className="text-gray-600 font-medium">Loading dataset...</p>
          <p className="text-sm text-gray-500 mt-1">This may take a moment</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 p-6">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-3">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Failed to Load Dataset
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {error}
          </p>
          {retry && (
            <button
              onClick={retry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  // Empty state
  if (!reviews || reviews.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 p-6">
        <div className="text-center">
          <div className="text-5xl mb-3">📭</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Reviews Available
          </h3>
          <p className="text-sm text-gray-600">
            No reviews found for this product
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN RENDER
  // ============================================================
  
  return (
    <>
      {/* Normal View */}
      <div className="h-full flex flex-col bg-white">
        {renderContent()}
      </div>

      {/* Modal View */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Dataset - Full View</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Close"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 flex flex-col min-h-0">
              {renderContent()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DatasetViewer;