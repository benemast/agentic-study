// frontend/src/hooks/useReviewData.js
/**
 * Custom hook for fetching and managing review data
 * 
 * Features:
 * - Automatic data fetching on mount
 * - Loading and error state management
 * - Integrated tracking
 * - Retry functionality
 * - In-memory caching to prevent duplicate fetches
 * 
 * Usage:
 * ```
 * const { reviews, loading, error, retry, reviewCount } = useReviewData({
 *   category: 'wireless',
 *   productId: 'B001234',
 *   taskNumber: 1
 * });
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { reviewsAPI } from '../services/reviewsAPI';
import { useTracking } from './useTracking';

// Simple in-memory cache to prevent duplicate fetches
// Format: { 'category:productId': { data, timestamp } }
const reviewCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Hook for fetching and managing review data
 * @param {Object} params - Hook parameters
 * @param {string} params.category - Product category ('wireless' or 'shoes')
 * @param {string} params.productId - Product ID to fetch reviews for
 * @param {number} params.taskNumber - Current task number for tracking
 * @param {Object} params.options - Additional API options (limit, filters, etc.)
 * @param {boolean} params.enabled - Whether to fetch data (default: true)
 */
export const useReviewData = ({
  category,
  productId,
  taskNumber,
  options = {},
  enabled = true
}) => {
  const { track } = useTracking();
  
  // State
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);
  
  // Track if currently fetching to prevent concurrent requests
  const isFetching = useRef(false);
  
  // Cache key for this specific request
  const cacheKey = `${category}:${productId}`;

  /**
   * Fetch reviews from API or cache
   * Using useRef for options to prevent infinite loops
   */
  const optionsRef = useRef(options);
  
  // Update ref when options change (but don't trigger re-fetch)
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const fetchReviews = useCallback(async (isRetry = false) => {
    if (!enabled || !category || !productId) {
      setLoading(false);
      return;
    }

    // Prevent concurrent fetches
    if (isFetching.current) {
      console.log(`[useReviewData] Already fetching for ${cacheKey}, skipping...`);
      return;
    }

    try {
      isFetching.current = true;
      setLoading(true);
      setError(null);

      // Track fetch start
      track(isRetry ? 'DATASET_LOAD_RETRY' : 'DATASET_LOAD_STARTED', {
        taskNumber,
        category,
        productId
      });

      // Check cache first (skip cache on retry)
      if (!isRetry && reviewCache.has(cacheKey)) {
        const cached = reviewCache.get(cacheKey);
        const isExpired = Date.now() - cached.timestamp > CACHE_DURATION;
        
        if (!isExpired) {
          console.log(`[useReviewData] Using cached data for ${cacheKey}`);
          
          if (isMounted.current) {
            setReviews(cached.data);
            setLoading(false);
          }
          
          track('DATASET_LOADED_FROM_CACHE', {
            taskNumber,
            reviewCount: cached.data.length,
            category
          });
          
          return;
        } else {
          // Clear expired cache
          reviewCache.delete(cacheKey);
        }
      }

      // Fetch from API
      const defaultOptions = {
        excludeMalformed: true,
        limit: 500,
        ...optionsRef.current // Use ref to avoid dependency
      };

      const data = await reviewsAPI.getReviews(
        category.toLowerCase(),
        productId,
        defaultOptions
      );

      const reviewData = data.reviews || [];

      // Update cache
      reviewCache.set(cacheKey, {
        data: reviewData,
        timestamp: Date.now()
      });

      // Update state only if component is still mounted
      if (isMounted.current) {
        setReviews(reviewData);
        setError(null);
      }

      track('DATASET_LOADED', {
        taskNumber,
        reviewCount: reviewData.length,
        category,
        fromCache: false
      });

    } catch (err) {
      console.error('[useReviewData] Failed to load dataset:', err);
      
      if (isMounted.current) {
        setError(err.message || 'Failed to load reviews');
      }
      
      track('DATASET_LOAD_FAILED', {
        taskNumber,
        error: err.message || err.toString(),
        category
      });
    } finally {
      isFetching.current = false;
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [category, productId, taskNumber, enabled, track, cacheKey]);

  /**
   * Retry loading reviews
   */
  const retry = useCallback(() => {
    fetchReviews(true);
  }, [fetchReviews]);

  /**
   * Clear cache for current category/product
   */
  const clearCache = useCallback(() => {
    reviewCache.delete(cacheKey);
  }, [cacheKey]);

  /**
   * Clear all cached review data
   */
  const clearAllCache = useCallback(() => {
    reviewCache.clear();
  }, []);

  // Fetch on mount or when dependencies change
  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    // Data
    reviews,
    reviewCount: reviews.length,
    
    // State
    loading,
    error,
    
    // Actions
    retry,
    refetch: fetchReviews,
    clearCache,
    clearAllCache,
    
    // Metadata
    cacheKey,
    isCached: reviewCache.has(cacheKey)
  };
};

/**
 * Get cache statistics (useful for debugging)
 */
export const getReviewCacheStats = () => {
  return {
    size: reviewCache.size,
    keys: Array.from(reviewCache.keys()),
    entries: Array.from(reviewCache.entries()).map(([key, value]) => ({
      key,
      count: value.data.length,
      age: Math.floor((Date.now() - value.timestamp) / 1000) // seconds
    }))
  };
};

/**
 * Clear all review cache (useful for testing or manual refresh)
 */
export const clearReviewCache = () => {
  reviewCache.clear();
};

export default useReviewData;