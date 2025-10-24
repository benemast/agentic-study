// frontend/src/services/reviewsAPI.js
import { wsClient } from './websocket';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ReviewsAPI {
  /**
   * Get reviews - tries WebSocket first, falls back to REST
   */
  async getReviews(category, productId, options = {}) {
    try {
      // Try WebSocket first if connected
      if (wsClient.isConnected) {
        console.log('📡 Fetching reviews via WebSocket');
        const result = await wsClient.getReviews(category, productId, options);
        return result;
      }
    } catch (wsError) {
      console.warn('WebSocket fetch failed, falling back to REST:', wsError);
    }

    // Fallback to REST
    console.log('🌐 Fetching reviews via REST');
    try {
      const params = new URLSearchParams({
        product_id: productId,
        limit: options.limit || 500,
        offset: options.offset || 0,
        exclude_malformed: options.excludeMalformed !== false
      });

      if (options.minRating) params.append('min_rating', options.minRating);
      if (options.maxRating) params.append('max_rating', options.maxRating);
      if (options.verifiedOnly) params.append('verified_only', 'true');

      const response = await fetch(
        `${API_BASE_URL}/api/reviews/${category}?${params}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch reviews: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching reviews:', error);
      throw error;
    }
  }

  async getReviewStats(category, productId) {
    try {
      if (wsClient.isConnected) {
        return await wsClient.getReviewStats(category, productId);
      }
    } catch (wsError) {
      console.warn('WebSocket stats failed, falling back to REST:', wsError);
    }

    const response = await fetch(
      `${API_BASE_URL}/api/reviews/${category}/${productId}/stats`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.statusText}`);
    }

    return await response.json();
  }

  async getReviewById(category, reviewId) {
    try {
      if (wsClient.isConnected) {
        return await wsClient.getReviewById(category, reviewId);
      }
    } catch (wsError) {
      console.warn('WebSocket review fetch failed, falling back to REST:', wsError);
    }

    const response = await fetch(
      `${API_BASE_URL}/api/reviews/${category}/${reviewId}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch review: ${response.statusText}`);
    }

    return await response.json();
  }
}

export const reviewsAPI = new ReviewsAPI();
export default reviewsAPI;