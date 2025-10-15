// frontend/src/config/api.js
/**
 * Centralized API client with error handling and retry logic
 */
import * as Sentry from "@sentry/react";
import { API_CONFIG, ERROR_MESSAGES } from './constants';

class ApiClient {
  constructor(baseURL = API_CONFIG.BASE_URL) {
    this.baseURL = baseURL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  /**
   * Make an API request with error handling
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = new ApiError(
          response.statusText,
          response.status,
          await response.json().catch(() => null)
        );
        
        // Log API errors to Sentry with context
        Sentry.captureException(error, {
          tags: {
            api_endpoint: endpoint,
            http_status: response.status,
            error_type: 'api_error'
          },
          contexts: {
            api: {
              endpoint,
              method: options.method || 'GET',
              status: response.status,
            }
          }
        });
        
        throw error;
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        // Log timeout errors
        Sentry.captureException(new Error('API Request Timeout'), {
          tags: { error_type: 'timeout' },
          contexts: { api: { endpoint, timeout: this.timeout } }
        });
        throw new ApiError('Request timeout', 408);
      }
      
      // Log network errors
      if (error instanceof ApiError) {
        throw error;
      }
      
      Sentry.captureException(error, {
        tags: { error_type: 'network_error' },
        contexts: { api: { endpoint } }
      });
      
      throw new ApiError(ERROR_MESSAGES.NETWORK_ERROR, 0, error);
    }
  }
  /**
   * Make a streaming request (returns raw Response object)
   */
  async requestStream(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout * 4); // Longer timeout for streams

      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = new ApiError(
          response.statusText,
          response.status,
          await response.json().catch(() => null)
        );
        
        Sentry.captureException(error, {
          tags: {
            api_endpoint: endpoint,
            http_status: response.status,
            error_type: 'api_stream_error'
          }
        });
        
        throw error;
      }

      // Return the raw response for streaming
      return response;
    } catch (error) {
      if (error.name === 'AbortError') {
        Sentry.captureException(new Error('Stream Request Timeout'), {
          tags: { error_type: 'stream_timeout' }
        });
        throw new ApiError('Stream timeout', 408);
      }
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      Sentry.captureException(error, {
        tags: { error_type: 'stream_network_error' }
      });
      
      throw new ApiError(ERROR_MESSAGES.NETWORK_ERROR, 0, error);
    }
  }

  // Convenience methods
  get(endpoint, options) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, data, options) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  postStream(endpoint, data, options) {
    return this.requestStream(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put(endpoint, data, options) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete(endpoint, options) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  patch(endpoint, data, options) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}

// Custom error class
class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Create singleton instance
const apiClient = new ApiClient();

// API endpoints organized by feature
export const API_ENDPOINTS = {
  // Session endpoints
  sessions: {
    create: () => '/api/sessions/',
    get: (sessionId) => `/api/sessions/${sessionId}`,
    validate: (sessionId) => `/api/sessions/${sessionId}/validate`,
    update: (sessionId) => `/api/sessions/${sessionId}`,
    end: (sessionId) => `/api/sessions/${sessionId}/end`,
    quickSave: (sessionId) => `/api/sessions/${sessionId}/quick-save`,
    sync: (sessionId) => `/api/sessions/${sessionId}/sync`,
  },

  // Interaction tracking
  interactions: {
    create: (sessionId) => `/api/sessions/${sessionId}/interactions`,
    list: (sessionId) => `/api/sessions/${sessionId}/interactions`,
  },

  // Demographics endpoints
  demographics: {
    create: () => '/api/demographics/',
    get: (sessionId) => `/api/demographics/${sessionId}`,
    update: (sessionId) => `/api/demographics/${sessionId}`,
    validate: () => '/api/demographics/validate',
  },

  // AI Chat endpoints
  chat: {
    send: () => '/api/ai-chat/chat',
    saveMessage: (sessionId) => `/api/ai-chat/save-message?session_id=${sessionId}`,
    history: (sessionId) => `/api/ai-chat/history/${sessionId}`,
    clear: (sessionId) => `/api/ai-chat/clear/${sessionId}`,
    stats: (sessionId) => `/api/ai-chat/stats/${sessionId}`,
  },

  // Health & version
  health: () => '/health',
  version: () => '/api/version',
  testCors: () => '/api/test-cors',
};

// Wrapper functions for common operations
export const sessionAPI = {
  create: (data) => apiClient.post(API_ENDPOINTS.sessions.create(), data),
  get: (sessionId) => apiClient.get(API_ENDPOINTS.sessions.get(sessionId)),
  validate: (sessionId) => apiClient.get(API_ENDPOINTS.sessions.validate(sessionId)),
  update: (sessionId, data) => apiClient.put(API_ENDPOINTS.sessions.update(sessionId), data),
  end: (sessionId, data) => apiClient.post(API_ENDPOINTS.sessions.end(sessionId), data),
  quickSave: (sessionId, data) => apiClient.post(API_ENDPOINTS.sessions.quickSave(sessionId), data),
  sync: (sessionId, data) => apiClient.post(API_ENDPOINTS.sessions.sync(sessionId), data),
};

export const interactionAPI = {
  track: (sessionId, data) => apiClient.post(API_ENDPOINTS.interactions.create(sessionId), data),
  list: (sessionId) => apiClient.get(API_ENDPOINTS.interactions.list(sessionId)),
};

export const demographicsAPI = {
  create: (data) => apiClient.post(API_ENDPOINTS.demographics.create(), data),
  get: (sessionId) => apiClient.get(API_ENDPOINTS.demographics.get(sessionId)),
  update: (sessionId, data) => apiClient.put(API_ENDPOINTS.demographics.update(sessionId), data),
  validate: (data) => apiClient.post(API_ENDPOINTS.demographics.validate(), data),
};

export const chatAPI = {
  //send: (data) => apiClient.post(API_ENDPOINTS.chat.send(), data),
  send: (data) => apiClient.postStream(API_ENDPOINTS.chat.send(), data),
  saveMessage: (sessionId, message) => apiClient.post(API_ENDPOINTS.chat.saveMessage(sessionId), message),
  getHistory: (sessionId) => apiClient.get(API_ENDPOINTS.chat.history(sessionId)),
  clear: (sessionId) => apiClient.delete(API_ENDPOINTS.chat.clear(sessionId)),
  getStats: (sessionId) => apiClient.get(API_ENDPOINTS.chat.stats(sessionId)),
};

export const systemAPI = {
  health: () => apiClient.get(API_ENDPOINTS.health()),
  version: () => apiClient.get(API_ENDPOINTS.version()),
  testCors: () => apiClient.get(API_ENDPOINTS.testCors()),
};

// Export the client and error class
export { apiClient, ApiError };
export default apiClient;