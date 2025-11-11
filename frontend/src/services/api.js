// frontend/src/services/api.js
/**
 * Hybrid API Client - Seamlessly uses WebSocket or REST
 * Provides transparent fallback and optimal performance
 */
import { captureException, scrubData } from '../config/sentry';
import { API_CONFIG, ERROR_MESSAGES } from '../config/constants';
import wsClient from './websocket';

/**
 * HTTP Client for REST fallback
 */
class HttpClient {
  constructor(baseURL = API_CONFIG.BASE_URL) {
    this.baseURL = baseURL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

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
        
        captureException(error, {
          tags: {
            api_endpoint: endpoint,
            http_status: response.status,
            error_type: 'api_error'
          }
        });
        
        throw error;
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408);
      }
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(ERROR_MESSAGES.NETWORK_ERROR, 0, error);
    }
  }

  async requestStream(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      throw new ApiError(response.statusText, response.status);
    }

    return response;
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

/**
 * Hybrid API Client - Intelligently chooses WebSocket or REST
 */
class HybridApiClient {
  constructor() {
    this.http = new HttpClient();
    this.ws = wsClient;
    
    // Track which endpoints should prefer WebSocket
    this.wsPreferred = new Set([
      'session_get',
      'session_update',
      'session_quickSave',
      'session_sync',
      'session_end',
      'send',
      'chat_history',
      'chat_clear',
      'track',
      'track_batch',
      'interactions',
      'execute',
      'workflow_execute',
      'agent_execute',
      'execution_cancel',
      'get_reviews',
      'get_review_stats',
      'get_review_by_id'
    ]);
    
    // Performance metrics
    this.metrics = {
      wsRequests: 0,
      httpRequests: 0,
      wsFailures: 0,
      httpFailures: 0,
      avgWsTime: 0,
      avgHttpTime: 0
    };
  }

  /**
   * Check if WebSocket is available and connected
   */
  isWebSocketAvailable() {
    return this.ws.isConnected;
  }

  /**
   * Track request performance
   */
  trackPerformance(type, duration, success) {
    if (type === 'ws') {
      this.metrics.wsRequests++;
      if (!success) this.metrics.wsFailures++;
      this.metrics.avgWsTime = (this.metrics.avgWsTime * (this.metrics.wsRequests - 1) + duration) / this.metrics.wsRequests;
    } else {
      this.metrics.httpRequests++;
      if (!success) this.metrics.httpFailures++;
      this.metrics.avgHttpTime = (this.metrics.avgHttpTime * (this.metrics.httpRequests - 1) + duration) / this.metrics.httpRequests;
    }
  }

  /**
   * Generic request method that chooses transport
   */
  async request(operation, wsMethod, httpMethod, options = {}) {
    const startTime = Date.now();
    
    // Force HTTP if specified
    if (options.forceHttp) {
      try {
        const result = await httpMethod();
        this.trackPerformance('http', Date.now() - startTime, true);
        return result;
      } catch (error) {
        this.trackPerformance('http', Date.now() - startTime, false);
        throw error;
      }
    }

    console.log("Call: ", operation, wsMethod, httpMethod, options, "WebSocket available:", this.isWebSocketAvailable(), " WS Preferred:", this.wsPreferred.has(operation))

    // Try WebSocket first if available and preferred
    if (this.isWebSocketAvailable() && this.wsPreferred.has(operation)) {
      try {
        const result = await wsMethod();
        this.trackPerformance('ws', Date.now() - startTime, true);
        return result;
      } catch (wsError) {
        this.trackPerformance('ws', Date.now() - startTime, false);
        console.warn(`WebSocket failed for ${operation}, falling back to HTTP:`, wsError);
        
        // Fallback to HTTP
        try {
          const result = await httpMethod();
          this.trackPerformance('http', Date.now() - startTime, true);
          return result;
        } catch (httpError) {
          this.trackPerformance('http', Date.now() - startTime, false);
          throw httpError;
        }
      }
    }
    
    // Use HTTP directly if WebSocket not available
    try {
      const result = await httpMethod();
      this.trackPerformance('http', Date.now() - startTime, true);
      return result;
    } catch (error) {
      this.trackPerformance('http', Date.now() - startTime, false);
      throw error;
    }
  }
}

// Create hybrid client instance
const hybridClient = new HybridApiClient();

// Custom error class
class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// API endpoints organized by feature
export const API_ENDPOINTS = {
  sessions: {
    create: () => '/api/sessions/',
    get: (sessionId) => `/api/sessions/${sessionId}`,
    validate: (sessionId) => `/api/sessions/${sessionId}/validate`,
    update: (sessionId) => `/api/sessions/${sessionId}`,
    quickSave: (sessionId) => `/api/sessions/${sessionId}/quick-save`,
    sync: (sessionId) => `/api/sessions/${sessionId}/sync`,
    end: (sessionId) => `/api/sessions/${sessionId}/end`,
  },
  interactions: {
    create: (sessionId) => `/api/sessions/${sessionId}/interactions`,
    list: (sessionId) => `/api/sessions/${sessionId}/interactions`,
  },
  demographics: {
    create: () => '/api/demographics/',
    get: (sessionId) => `/api/demographics/${sessionId}`,
    update: (sessionId) => `/api/demographics/${sessionId}`,
    validate: () => '/api/demographics/validate',
  },
  survey: {
    submit: () => '/api/survey/submit',
    get: (surveyId) => `/api/survey/${surveyId}`,
    getByParticipant: (participantId) => `/api/survey/participant/${participantId}`,
    getBySession: (sessionId) => `/api/survey/session/${sessionId}`,
    list: (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.condition) queryParams.append('condition', params.condition);
      if (params.task_number) queryParams.append('task_number', params.task_number);
      if (params.page) queryParams.append('page', params.page);
      if (params.per_page) queryParams.append('per_page', params.per_page);
      const query = queryParams.toString();
      return `/api/survey/${query ? '?' + query : ''}`;
    },
  },
  chat: {
    send: () => '/api/ai-chat/chat',
    saveMessage: (sessionId) => `/api/ai-chat/save-message?session_id=${sessionId}`,
    history: (sessionId) => `/api/ai-chat/history/${sessionId}`,
    clear: (sessionId) => `/api/ai-chat/clear/${sessionId}`,
    stats: (sessionId) => `/api/ai-chat/stats/${sessionId}`,
  },
  orchestrator: {
    execute: () => '/api/orchestrator/execute',
    status: (executionId) => `/api/orchestrator/execution/${executionId}/status`,
    detail: (executionId) => `/api/orchestrator/execution/${executionId}`,
    cancel: (executionId) => `/api/orchestrator/execution/${executionId}/cancel`,
    sessionExecutions: (sessionId) => `/api/orchestrator/session/${sessionId}/executions`,
  },
  reviews: {
    getReviews: (category) => `/api/reviews/${category}`,
    getStats: (category, productId) => `/api/reviews/${category}/${productId}/stats`,
    getById: (category, reviewId) => `/api/reviews/${category}/${reviewId}`,
  },
  summary: {
    create: (sessionId) => `/api/sessions/${sessionId}/summary`,
    get: (sessionId, taskNumber) => `/api/sessions/${sessionId}/summary?task_number=${taskNumber}`,
    delete: (sessionId, taskNumber) => `/api/sessions/${sessionId}/summary?task_number=${taskNumber}`,
  },
  health: () => '/health',
  version: () => '/api/version',
  testCors: () => '/api/test-cors',
};

/**
 * Hybrid API wrapper functions
 * These intelligently use WebSocket or REST based on availability
 */
export const sessionAPI = {
  // Session creation always uses HTTP (one-time operation)
  create: (data) => hybridClient.http.post(API_ENDPOINTS.sessions.create(), data),
  
  // Session get can use WebSocket if available
  get: (sessionId) => hybridClient.request(
    'session_get',
    () => wsClient.getSession(),
    () => hybridClient.http.get(API_ENDPOINTS.sessions.get(sessionId))
  ),
  
  // Validation stays HTTP (simple check)
  validate: (sessionId) => hybridClient.http.get(API_ENDPOINTS.sessions.validate(sessionId)),
  
  // Updates prefer WebSocket for real-time sync
  update: (sessionId, data) => hybridClient.request(
    'session_update',
    () => wsClient.updateSession(data),
    () => hybridClient.http.put(API_ENDPOINTS.sessions.update(sessionId), data)
  ),
  
  // Session end uses WebSocket to ensure cleanup
  end: (sessionId, data) => hybridClient.request(
    'session_end',
    () => wsClient.endSession(data),
    () => hybridClient.http.post(API_ENDPOINTS.sessions.end(sessionId), data)
  ),
  
  // Quick save uses WebSocket for speed
  quickSave: (sessionId, data) => hybridClient.request(
    'session_quicksave',
    () => wsClient.quickSaveSession(data),
    () => hybridClient.http.post(API_ENDPOINTS.sessions.quickSave(sessionId), data)
  ),
  
  // Sync always tries WebSocket first
  sync: (sessionId, data) => hybridClient.request(
    'session_sync',
    () => wsClient.syncSession(data),
    () => hybridClient.http.post(API_ENDPOINTS.sessions.sync(sessionId), data)
  ),
};

export const interactionAPI = {
  // Tracking prefers WebSocket with batching
  track: (sessionId, data) => hybridClient.request(
    'track',
    () => wsClient.trackEvent(data.event_type, data.event_data),
    () => hybridClient.http.post(API_ENDPOINTS.interactions.create(sessionId), data)
  ),
  
  // Batch tracking for efficiency
  trackBatch: (sessionId, events) => hybridClient.request(
    'track_batch',
    () => wsClient.trackBatch(events),
    async () => {
      // Fallback: send individually via HTTP
      const results = await Promise.allSettled(
        events.map(event => 
          hybridClient.http.post(API_ENDPOINTS.interactions.create(sessionId), event)
        )
      );
      return results;
    }
  ),
  
  // List interactions can use cache
  list: (sessionId, options = {}) => hybridClient.request(
    'get_interactions',
    () => wsClient.getInteractions(options.limit, options.offset, options.event_type),
    () => hybridClient.http.get(API_ENDPOINTS.interactions.list(sessionId))
  ),
};

export const demographicsAPI = {
  // Demographics stay REST (form-based, one-time)
  create: (data) => hybridClient.http.post(API_ENDPOINTS.demographics.create(), data),
  get: (sessionId) => hybridClient.http.get(API_ENDPOINTS.demographics.get(sessionId)),
  update: (sessionId, data) => hybridClient.http.put(API_ENDPOINTS.demographics.update(sessionId), data),
  validate: (data) => hybridClient.http.post(API_ENDPOINTS.demographics.validate(), data),
};

export const chatAPI = {
  // Chat send uses WebSocket for streaming
  send: (data) => {
    if (hybridClient.isWebSocketAvailable()) {
      return wsClient.sendChatMessage(data.messages[data.messages.length - 1].content, data.messages);
    }
    return hybridClient.http.postStream(API_ENDPOINTS.chat.send(), data);
  },
  
  // Save message can batch via WebSocket
  saveMessage: (sessionId, message) => hybridClient.request(
    'chat_save',
    () => wsClient.send({ type: 'chat_save', message }),
    () => hybridClient.http.post(API_ENDPOINTS.chat.saveMessage(sessionId), message)
  ),
  
  // History uses WebSocket with caching
  getHistory: (sessionId, options = {}) => hybridClient.request(
    'chat_history',
    () => wsClient.getChatHistory(options.limit || 50, options.offset || 0),
    () => hybridClient.http.get(API_ENDPOINTS.chat.history(sessionId))
  ),
  
  // Clear uses WebSocket for instant update
  clear: (sessionId) => hybridClient.request(
    'chat_clear',
    () => wsClient.clearChat(),
    () => hybridClient.http.delete(API_ENDPOINTS.chat.clear(sessionId))
  ),
  
  // Stats can be cached
  getStats: (sessionId) => hybridClient.request(
    'chat_stats',
    () => wsClient.request('chat_stats', {}, { cache: true }),
    () => hybridClient.http.get(API_ENDPOINTS.chat.stats(sessionId))
  ),
};

export const orchestratorAPI = {
  // Workflow execution uses WebSocket for real-time updates
  executeWorkflow: (sessionId, workflow, inputData = {}) => hybridClient.request(
    'workflow_execute',
    () => wsClient.executeWorkflow(workflow, inputData, 'workflow_builder'),
    () => hybridClient.http.post(API_ENDPOINTS.orchestrator.execute(), {
      session_id: sessionId,
      condition: 'workflow_builder',
      workflow,
      input_data: inputData
    })
  ),
  
  // Agent tasks use WebSocket
  executeAgent: (sessionId, taskDescription, inputData = {}) => hybridClient.request(
    'agent_execute',
    () => wsClient.executeAgent(taskDescription, inputData, 'ai_assistant'),
    () => hybridClient.http.post(API_ENDPOINTS.orchestrator.execute(), {
      session_id: sessionId,
      condition: 'ai_assistant',
      task_description: taskDescription,
      input_data: inputData
    })
  ),
  
  // Status polling can use WebSocket
  getExecutionStatus: (executionId) => hybridClient.request(
    'execution_status',
    () => wsClient.request('execution_status', { execution_id: executionId }),
    () => hybridClient.http.get(API_ENDPOINTS.orchestrator.status(executionId))
  ),
  
  // Cancellation uses WebSocket for speed
  cancelExecution: (executionId) => hybridClient.request(
    'execution_cancel',
    () => wsClient.cancelExecution(executionId),
    () => hybridClient.http.post(API_ENDPOINTS.orchestrator.cancel(executionId))
  ),
  
  getSessionExecutions: (sessionId, limit = 10) => hybridClient.http.get(
    `${API_ENDPOINTS.orchestrator.sessionExecutions(sessionId)}?limit=${limit}`
  ),
};
/**
 * Survey API - Handles post-task survey submission and retrieval
 */
export const surveyAPI = {
  /**
   * Submit a completed survey
   * @param {Object} surveyData - Complete survey response data
   * @returns {Promise<Object>} Submission confirmation with survey_id
   */
  submit: (surveyData) => {
    return hybridClient.http.post(API_ENDPOINTS.survey.submit(), surveyData);
  },

  /**
   * Get a specific survey by ID with computed scores
   * @param {number} surveyId - Survey ID
   * @returns {Promise<Object>} Complete survey data with hypothesis scores
   */
  get: (surveyId) => {
    return hybridClient.http.get(API_ENDPOINTS.survey.get(surveyId));
  },

  /**
   * Get all surveys for a participant
   * @param {string} participantId - Participant identifier
   * @returns {Promise<Object>} List of surveys with summaries
   */
  getByParticipant: (participantId) => {
    return hybridClient.http.get(API_ENDPOINTS.survey.getByParticipant(participantId));
  },

  /**
   * Get all surveys for a session
   * @param {string} sessionId - Session UUID
   * @returns {Promise<Object>} List of surveys for the session
   */
  getBySession: (sessionId) => {
    return hybridClient.http.get(API_ENDPOINTS.survey.getBySession(sessionId));
  },

  /**
   * List all surveys with optional filtering (admin)
   * @param {Object} params - Filter parameters
   * @param {string} params.condition - Filter by condition ('workflow_builder' or 'ai_assistant')
   * @param {number} params.task_number - Filter by task (1 or 2)
   * @param {number} params.page - Page number
   * @param {number} params.per_page - Results per page
   * @returns {Promise<Object>} Paginated list of surveys
   */
  list: (params = {}) => {
    return hybridClient.http.get(API_ENDPOINTS.survey.list(params));
  },

  /**
   * Format survey data for submission
   * Transforms questionnaire component state to API schema
   */
  formatForSubmission: ({
    participantId,
    sessionId,
    taskNumber,
    condition,
    startedAt,
    completedAt,
    responses,
    openEnded,
    language = 'en'
  }) => {
    // Map response IDs to database column names
    const nasaTlxMapping = {
      'mental_demand': 'nasa_tlx_mental_demand',
      'temporal_demand': 'nasa_tlx_temporal_demand',
      'performance': 'nasa_tlx_performance',
      'effort': 'nasa_tlx_effort',
      'frustration': 'nasa_tlx_frustration'
    };

    const likertMapping = {
      // Section 2
      'control_task': 'control_task',
      'agency_decisions': 'agency_decisions',
      'engagement': 'engagement',
      'confidence_quality': 'confidence_quality',
      'trust_results': 'trust_results',
      // Section 3
      'process_transparency': 'process_transparency',
      'predictability': 'predictability',
      'understood_choices': 'understood_choices',
      'understood_reasoning': 'understood_reasoning',
      'could_explain': 'could_explain',
      // Section 4
      'ease_of_use': 'ease_of_use',
      'efficiency': 'efficiency',
      'found_insights': 'found_insights',
      'explored_thoroughly': 'explored_thoroughly',
      'discovered_insights': 'discovered_insights',
      'accurate_reliable': 'accurate_reliable',
      'recommend': 'recommend'
    };

    const openEndedMapping = {
      'positive': 'feedback_positive',
      'negative': 'feedback_negative',
      'improvements': 'feedback_improvements'
    };

    // Build formatted data
    const formattedData = {
      participant_id: participantId,
      session_id: sessionId,
      task_number: taskNumber,
      condition: condition,
      started_at: startedAt,
      completed_at: completedAt,
      language: language
    };

    // Map NASA-TLX responses
    Object.entries(nasaTlxMapping).forEach(([questionId, dbColumn]) => {
      if (responses[questionId] !== undefined) {
        formattedData[dbColumn] = responses[questionId];
      }
    });

    // Map Likert responses
    Object.entries(likertMapping).forEach(([questionId, dbColumn]) => {
      if (responses[questionId] !== undefined) {
        formattedData[dbColumn] = responses[questionId];
      }
    });

    // Map open-ended responses
    Object.entries(openEndedMapping).forEach(([key, dbColumn]) => {
      if (openEnded[key] && openEnded[key].trim()) {
        formattedData[dbColumn] = openEnded[key].trim();
      }
    });

    return formattedData;
  },

  /**
   * Validate survey data before submission
   */
  validate: (responses, openEnded) => {
    const errors = [];

    // Check NASA-TLX (5 required)
    const nasaTlxQuestions = ['mental_demand', 'temporal_demand', 'performance', 'effort', 'frustration'];
    const missingNasaTlx = nasaTlxQuestions.filter(q => responses[q] === undefined);
    
    if (missingNasaTlx.length > 0) {
      errors.push(`Missing NASA-TLX responses: ${missingNasaTlx.join(', ')}`);
    }

    // Check Likert (17 required)
    const likertQuestions = [
      'control_task', 'agency_decisions', 'engagement', 'confidence_quality', 'trust_results',
      'process_transparency', 'predictability', 'understood_choices', 'understood_reasoning', 'could_explain',
      'ease_of_use', 'efficiency', 'found_insights', 'explored_thoroughly', 'discovered_insights', 
      'accurate_reliable', 'recommend'
    ];
    const missingLikert = likertQuestions.filter(q => responses[q] === undefined);
    
    if (missingLikert.length > 0) {
      errors.push(`Missing Likert responses: ${missingLikert.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};
/**
 * Reviews API - Handles fetching review datasets for study tasks
 * Supports both WebSocket (preferred) and REST (fallback) communication
 */
export const reviewsAPI = {
  /**
   * Get reviews for a specific product
   * @param {string} category - 'shoes' or 'wireless'
   * @param {string} productId - Product ID to filter by
   * @param {Object} options - Additional filter options
   */
  getReviews: (category, productId, options = {}) => {
    const params = new URLSearchParams({
      limit: options.limit || 500,
      offset: options.offset || 0,
      exclude_malformed: options.excludeMalformed || false // Default false
    });

    // Add optional filters
    if (options.minRating) params.append('min_rating', options.minRating);
    if (options.maxRating) params.append('max_rating', options.maxRating);
    if (options.verifiedOnly) params.append('verified_only', 'true');

    return hybridClient.request(
      'get_reviews',
      () => wsClient.request('get_reviews', { 
        category, 
        ...(productId && { product_id: productId }),
        ...options 
      }, { cache: true }),
      () => hybridClient.http.get(`${API_ENDPOINTS.reviews.getReviews(category)}?${params}`)
    );
  },

  /**
   * Get summary statistics for a product's reviews
   * @param {string} category - 'shoes' or 'wireless'
   * @param {string} productId - Product ID to analyze
   */
  getReviewStats: (category, productId) => hybridClient.request(
    'get_review_stats',
    () => wsClient.request('get_review_stats', { category, product_id: productId }, { cache: true }),
    () => hybridClient.http.get(API_ENDPOINTS.reviews.getStats(category, productId))
  ),

  /**
   * Get a single review by ID
   * @param {string} category - 'shoes' or 'wireless'
   * @param {string} reviewId - Review ID
   */
  getReviewById: (category, reviewId) => hybridClient.request(
    'get_review_by_id',
    () => wsClient.request('get_review_by_id', { category, review_id: reviewId }),
    () => hybridClient.http.get(API_ENDPOINTS.reviews.getById(category, reviewId))
  ),
};
 /* Summary API - Handles task execution summary documents
 * Summaries are stored per session with separate columns for task 1 and task 2
 */
export const summaryAPI = {
  /**
   * Create or update summary for a task
   * @param {string} sessionId - Session ID
   * @param {Object} summaryData - Summary data to save
   * @param {number} summaryData.task_number - Task number (1 or 2)
   * @param {string} summaryData.execution_id - Workflow execution ID
   * @param {Object} summaryData.sections - Results sections
   * @param {Object} summaryData.metadata - Metadata
   * @returns {Promise<Object>} API response
   */
  create: (sessionId, summaryData) => {    
    return hybridClient.http.post(
      API_ENDPOINTS.summary.create(sessionId), 
      summaryData
    );
  },

  /**
   * Get summary for a specific task
   * @param {string} sessionId - Session ID
   * @param {number} taskNumber - Task number (1 or 2)
   * @returns {Promise<Object>} API response with summary data
   */
  get: (sessionId, taskNumber) => {
    return hybridClient.http.get(
      API_ENDPOINTS.summary.get(sessionId, taskNumber)
    );
  },

  /**
   * Check if summary exists for a task
   * @param {string} sessionId - Session ID
   * @param {number} taskNumber - Task number (1 or 2)
   * @returns {Promise<boolean>} True if summary exists
   */
  exists: async (sessionId, taskNumber) => {
    try {
      const response = await summaryAPI.get(sessionId, taskNumber);
      return response.success && response.data !== null;
    } catch (error) {
      console.error('[summaryAPI] Error checking existence:', error);
      return false;
    }
  },

  /**
   * Delete summary for a task
   * @param {string} sessionId - Session ID
   * @param {number} taskNumber - Task number (1 or 2)
   * @returns {Promise<Object>} API response
   */
  delete: (sessionId, taskNumber) => {
    return hybridClient.http.delete(
      API_ENDPOINTS.summary.delete(sessionId, taskNumber)
    );
  },
};

export const systemAPI = {
  health: () => hybridClient.http.get(API_ENDPOINTS.health()),
  version: () => hybridClient.http.get(API_ENDPOINTS.version()),
  testCors: () => hybridClient.http.get(API_ENDPOINTS.testCors()),
  
  // Get API metrics
  getMetrics: () => ({
    api: hybridClient.metrics,
    websocket: wsClient.getMetrics()
  })
};

// Export the clients and utilities
export { hybridClient, wsClient, ApiError };
export default hybridClient;