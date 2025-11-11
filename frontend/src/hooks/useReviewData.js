// frontend/src/hooks/useReviewData.js
/**
 * Optimized Review Data Hook
 * 
 * Features:
 * - Single load on mount (no re-triggers)
 * - Shared module-level cache
 * - Proper loading state management
 * - Prevents concurrent fetches
 * - Proper cleanup on unmount
 */

import { useState, useEffect, useRef } from 'react';
import { reviewsAPI } from '../services/api';
import { useTracking } from './useTracking';

// ============================================================
// MODULE-LEVEL CACHE
// ============================================================
// Shared across all hook instances - prevents duplicate fetches
const reviewCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Track active fetches to prevent duplicates
const activeFetches = new Map();

/**
 * Get cached data if valid
 */
const getCachedData = (cacheKey) => {
  if (!reviewCache.has(cacheKey)) return null;
  
  const cached = reviewCache.get(cacheKey);
  const isExpired = Date.now() - cached.timestamp > CACHE_DURATION;
  
  if (isExpired) {
    reviewCache.delete(cacheKey);
    return null;
  }
  
  return cached.data;
};

/**
 * Set cache data
 */
const setCachedData = (cacheKey, data) => {
  reviewCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
};

// ============================================================
// MAIN HOOK
// ============================================================

/**
 * Hook for fetching review data
 * 
 * @param {Object} params
 * @param {string} params.category - 'wireless' or 'shoes'
 * @param {string} params.productId - Product ID
 * @param {number} params.taskNumber - Task number for tracking
 * @param {Object} params.options - API options (limit, filters)
 * @param {boolean} params.enabled - Enable fetching (default: true)
 */
export const useReviewData = ({
  category,
  productId = null,
  taskNumber = null,
  options = {},
  enabled = true
}) => {
  const { track } = useTracking();
  
  // ============================================================
  // STATE
  // ============================================================
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // ============================================================
  // REFS
  // ============================================================
  const isMountedRef = useRef(true);
  const hasLoadedRef = useRef(false); // Prevent re-loads
  
  // Stabilize options to prevent re-triggers from object reference changes
  const optionsKey = JSON.stringify(options);
  const cacheKey = `${category}:${productId}:${optionsKey}`;
  
  // ============================================================
  // FETCH FUNCTION
  // ============================================================
  useEffect(() => {
    // Guard: Skip if disabled or missing params
    if (!enabled && !(category || productId)) {
      setLoading(false);
      return;
    }
    
    // Guard: Only load once per mount
    if (hasLoadedRef.current) {
      return;
    }
    
    const loadData = async () => {
      try {
        
        // Check cache first
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
          
          if (isMountedRef.current) {
            setReviews(cachedData);
            setLoading(false);
            setError(null);
          }
          
          track('dataset_loaded_from_cache', {
            taskNumber,
            reviewCount: cachedData.length,
            category
          });
          
          hasLoadedRef.current = true;
          return;
        }
        
        // Check if already fetching
        if (activeFetches.has(cacheKey)) {
          const existingPromise = activeFetches.get(cacheKey);
          const response = await existingPromise;
          
          // Extract reviews from response (not the response itself!)
          const reviewData = response?.reviews || [];
          
          if (isMountedRef.current) {
            setReviews(reviewData);
            setLoading(false);
            setError(null);
          } else {
            console.log(`[useReviewData] Component unmounted, skipping state update`);
          }
          
          hasLoadedRef.current = true;
          return;
        }
        
        // Start new fetch
        track('dataset_load_started', {
          taskNumber,
          category,
          productId
        });
        
        const fetchPromise = reviewsAPI.getReviews(
          category.toLowerCase(),
          productId,
          {
            excludeMalformed: true,
            limit: 500,
            ...options
          }
        );
        
        activeFetches.set(cacheKey, fetchPromise);
        
        const response = await fetchPromise;
        const reviewData = response?.reviews || [];
        
        // Update cache
        setCachedData(cacheKey, reviewData);
        
        // Update state
        if (isMountedRef.current) {
          setReviews(reviewData);
          setLoading(false);
          setError(null);
        } else {
          console.log(`[useReviewData] Component unmounted, skipping state update`);
        }
        
        track('dataset_loaded', {
          taskNumber,
          reviewCount: reviewData.length,
          category,
          fromCache: false
        });
        
        hasLoadedRef.current = true;
        
      } catch (err) {
        console.error('[useReviewData] Load failed:', err);
        
        if (isMountedRef.current) {
          setError(err.message || 'Failed to load reviews');
          setLoading(false);
        }
        
        track('dataset_load_failed', {
          taskNumber,
          error: err.message || err.toString(),
          category
        });
        
      } finally {
        activeFetches.delete(cacheKey);
      }
    };
    
    loadData();
    
  }, [category, productId, taskNumber, enabled, cacheKey, track, optionsKey]);
  
  // ============================================================
  // CLEANUP
  // ============================================================
  
  // Reset mounted flag on mount (important for React Strict Mode)
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // ============================================================
  // RETRY FUNCTION
  // ============================================================
  const retry = () => {
    hasLoadedRef.current = false;
    activeFetches.delete(cacheKey);
    reviewCache.delete(cacheKey);
    setLoading(true);
    setError(null);
    
    // Trigger reload by updating a dummy state
    setReviews([]);
  };
  
  return {
    reviews,
    reviewCount: reviews.length,
    loading,
    error,
    retry
  };
};

// ============================================================
// UTILITY EXPORTS
// ============================================================

export const clearReviewCache = () => {
  reviewCache.clear();
  activeFetches.clear();
};

export const getReviewCacheStats = () => ({
  size: reviewCache.size,
  keys: Array.from(reviewCache.keys()),
  entries: Array.from(reviewCache.entries()).map(([key, value]) => ({
    key,
    count: value.data.length,
    age: Math.floor((Date.now() - value.timestamp) / 1000)
  }))
});

export default useReviewData;