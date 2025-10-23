// frontend/src/components/study/DatasetViewer.jsx
/**
 * Scrollable Dataset Viewer
 * 
 * Displays review data for participants to browse during tasks
 * 
 * Features:
 * - Scrollable review list
 * - Expandable review details
 * - Rating visualization
 * - Verified purchase badges
 * - Helpful votes display
 */
import React, { useState, useMemo } from 'react';

const DatasetViewer = ({ reviews, loading, error, category, onRetry }) => {
  const [expandedReview, setExpandedReview] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'positive', 'negative', 'neutral'

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
   * Toggle review expansion
   */
  const toggleReview = (index) => {
    setExpandedReview(expandedReview === index ? null : index);
  };

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
          {onRetry && (
            <button
              onClick={onRetry}
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

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header with Filter */}
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">
            Dataset Preview
          </h3>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
            {filteredReviews.length} reviews
          </span>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2">
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
            Positive ({reviews.filter(r => r.star_rating >= 4).length})
          </button>
          <button
            onClick={() => setFilter('neutral')}
            className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
              filter === 'neutral'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Neutral ({reviews.filter(r => r.star_rating === 3).length})
          </button>
          <button
            onClick={() => setFilter('negative')}
            className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
              filter === 'negative'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Negative ({reviews.filter(r => r.star_rating <= 2).length})
          </button>
        </div>
      </div>

      {/* Scrollable Review List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredReviews.map((review, index) => (
          <div 
            key={review.review_id}
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
                <span className={`font-bold text-lg ${getRatingColor(review.star_rating)}`}>
                  {'★'.repeat(review.star_rating)}{'☆'.repeat(5 - review.star_rating)}
                </span>
                <span className="text-xs text-gray-500">
                  ({review.star_rating}/5)
                </span>
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
              {review.review_body || 'No review text provided.'}
            </p>

            {/* Footer */}
            {(review.helpful_votes > 0 || expandedReview === index) && (
              <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                {review.helpful_votes > 0 ? (
                  <div className="text-xs text-gray-600">
                    👍 {review.helpful_votes} of {review.total_votes} found helpful
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">
                    No helpful votes
                  </div>
                )}
                
                {expandedReview === index && (
                  <div className="text-xs text-gray-500">
                    ID: {review.review_id.slice(0, 8)}...
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Stats */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Showing {filteredReviews.length} of {reviews.length} reviews</span>
          <span>{category} Products</span>
        </div>
      </div>
    </div>
  );
};

export default DatasetViewer;