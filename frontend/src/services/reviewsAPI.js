// frontend/src/services/reviewsAPI.js
/**
 * Reviews API Service
 * 
 * Handles fetching review datasets for study tasks
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ReviewsAPI {
  /**
   * Get reviews for a specific product
   * @param {string} category - 'shoes' or 'wireless'
   * @param {string} productId - Product ID to filter by
   * @param {Object} options - Additional filter options
   */
  async getReviews(category, productId, options = {}) {
    try {
      const params = new URLSearchParams({
        product_id: productId,
        limit: options.limit || 500,
        offset: options.offset || 0,
        exclude_malformed: options.excludeMalformed !== false // Default true
      });

      // Add optional filters
      if (options.minRating) params.append('min_rating', options.minRating);
      if (options.maxRating) params.append('max_rating', options.maxRating);
      if (options.verifiedOnly) params.append('verified_only', 'true');

      const response = await fetch(
        `${API_BASE_URL}/api/reviews/${category}?${params}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch reviews: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
      
    } catch (error) {
      console.error('Error fetching reviews:', error);
      throw error;
    }
  }

  /**
   * Get summary statistics for a product's reviews
   * @param {string} category - 'shoes' or 'wireless'
   * @param {string} productId - Product ID to analyze
   */
  async getReviewStats(category, productId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/reviews/${category}/${productId}/stats`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.statusText}`);
      }

      return await response.json();
      
    } catch (error) {
      console.error('Error fetching review stats:', error);
      throw error;
    }
  }

  /**
   * Get a single review by ID
   * @param {string} category - 'shoes' or 'wireless'
   * @param {string} reviewId - Review ID
   */
  async getReviewById(category, reviewId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/reviews/${category}/${reviewId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch review: ${response.statusText}`);
      }

      return await response.json();
      
    } catch (error) {
      console.error('Error fetching review:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const reviewsAPI = new ReviewsAPI();
export default reviewsAPI;