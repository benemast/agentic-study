// frontend/src/config/sentry.js
import * as Sentry from "@sentry/react";

/**
 * GDPR-Compliant Sentry Configuration
 * Automatically scrubs PII and sensitive data before sending to Sentry
 */

// ============================================================
// PII DETECTION PATTERNS
// ============================================================

const PII_PATTERNS = {
  // Email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  
  // Phone numbers (various formats)
  phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  
  // IP addresses
  ipv4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  ipv6: /(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}/g,
  
  // Credit card numbers
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  
  // Social security numbers (US)
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  
  // URLs with potential tokens/keys
  urlWithToken: /(token|key|api[_-]?key|password|secret)=[^&\s]+/gi,
  
  // Common sensitive query params
  sensitiveParams: /([?&])(password|token|secret|api_key|auth)=[^&]*/gi,
};

// Sensitive field names to scrub
const SENSITIVE_FIELDS = [
  'password',
  'passwd',
  'pwd',
  'secret',
  'api_key',
  'apikey',
  'token',
  'access_token',
  'refresh_token',
  'auth',
  'authorization',
  'cookie',
  'session',
  'ssn',
  'credit_card',
  'card_number',
  'cvv',
  'pin',
  
  // User study specific
  'user_id',
  'participant_id',
  'email',
  'name',
  'first_name',
  'last_name',
  'phone',
  'address',
  'ip_address',
];

// ============================================================
// SCRUBBING FUNCTIONS
// ============================================================

/**
 * Scrub string values for PII patterns
 */
function scrubString(value) {
  if (typeof value !== 'string') return value;
  
  let scrubbed = value;
  
  // Replace each PII pattern with [REDACTED]
  scrubbed = scrubbed.replace(PII_PATTERNS.email, '[EMAIL]');
  scrubbed = scrubbed.replace(PII_PATTERNS.phone, '[PHONE]');
  scrubbed = scrubbed.replace(PII_PATTERNS.ipv4, '[IP]');
  scrubbed = scrubbed.replace(PII_PATTERNS.ipv6, '[IP]');
  scrubbed = scrubbed.replace(PII_PATTERNS.creditCard, '[CARD]');
  scrubbed = scrubbed.replace(PII_PATTERNS.ssn, '[SSN]');
  scrubbed = scrubbed.replace(PII_PATTERNS.urlWithToken, '$1=[REDACTED]');
  scrubbed = scrubbed.replace(PII_PATTERNS.sensitiveParams, '$1$2=[REDACTED]');
  
  return scrubbed;
}

/**
 * Check if field name is sensitive
 */
function isSensitiveField(fieldName) {
  if (!fieldName) return false;
  
  const lowerField = fieldName.toLowerCase();
  return SENSITIVE_FIELDS.some(sensitive => 
    lowerField.includes(sensitive)
  );
}

/**
 * Recursively scrub object
 */
function scrubObject(obj, depth = 0) {
  // Prevent infinite recursion
  if (depth > 10) return '[MAX_DEPTH]';
  
  if (!obj || typeof obj !== 'object') {
    return scrubString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => scrubObject(item, depth + 1));
  }
  
  const scrubbed = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Check if field name is sensitive
    if (isSensitiveField(key)) {
      scrubbed[key] = '[REDACTED]';
      continue;
    }
    
    // Recursively scrub nested objects
    if (typeof value === 'object' && value !== null) {
      scrubbed[key] = scrubObject(value, depth + 1);
    } else if (typeof value === 'string') {
      scrubbed[key] = scrubString(value);
    } else {
      scrubbed[key] = value;
    }
  }
  
  return scrubbed;
}

/**
 * Scrub URL for sensitive data
 */
function scrubUrl(url) {
  if (!url) return url;
  
  try {
    const urlObj = new URL(url);
    
    // Scrub query parameters
    const params = new URLSearchParams(urlObj.search);
    const scrubbedParams = new URLSearchParams();
    
    for (const [key, value] of params) {
      if (isSensitiveField(key)) {
        scrubbedParams.set(key, '[REDACTED]');
      } else {
        scrubbedParams.set(key, scrubString(value));
      }
    }
    
    urlObj.search = scrubbedParams.toString();
    return urlObj.toString();
  } catch {
    // If URL parsing fails, just scrub as string
    return scrubString(url);
  }
}

// ============================================================
// SENTRY CONFIGURATION
// ============================================================

export function initSentry() {
  if (!import.meta.env.PROD) {
    console.log('🔧 Development mode - Sentry could be disabled');
    //return;
  }

  if (!import.meta.env.VITE_SENTRY_DSN) {
    console.warn('⚠️ Sentry DSN not configured');
    return;
  }
    try{
        Sentry.init({
            dsn: import.meta.env.VITE_SENTRY_DSN,
            environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || "development",
            
            // Performance tracing (10% of transactions)
            tracesSampleRate: 0.01,
            
            // Session Replay (0.1% of sessions, 10% of error sessions)
            replaysSessionSampleRate: 0.001,
            //replaysOnErrorSampleRate: 0.1,
               tracePropagationTargets: [], // Don't trace any requests automatically
            
            // ============================================================
            // CRITICAL: PII SCRUBBING
            // ============================================================
            
            /**
             * beforeSend - Scrub ALL error events
             */
            beforeSend(event, hint) {
            // 1. Scrub error message
            if (event.message) {
              event.message = scrubString(event.message);
            }
            
            // 2. Scrub exception values
            if (event.exception?.values) {
              event.exception.values = event.exception.values.map(exception => ({
                ...exception,
                value: scrubString(exception.value),
              }));
            }
            
            // 3. Scrub stack traces
            if (event.exception?.values) {
              event.exception.values.forEach(exception => {
                if (exception.stacktrace?.frames) {
                  exception.stacktrace.frames = exception.stacktrace.frames.map(frame => ({
                    ...frame,
                    // Keep function names, but scrub vars/locals
                    vars: frame.vars ? scrubObject(frame.vars) : undefined,
                    pre_context: frame.pre_context?.map(scrubString),
                    context_line: frame.context_line ? scrubString(frame.context_line) : undefined,
                    post_context: frame.post_context?.map(scrubString),
                  }));
                }
                });
            }
            
            // 4. Scrub request data
            if (event.request) {
                event.request = {
                ...event.request,
                url: scrubUrl(event.request.url),
                query_string: scrubString(event.request.query_string),
                cookies: '[REDACTED]',
                headers: event.request.headers ? scrubObject(event.request.headers) : undefined,
                data: event.request.data ? scrubObject(event.request.data) : undefined,
                };
            }
            
            // 5. Scrub breadcrumbs
            if (event.breadcrumbs) {
                event.breadcrumbs = event.breadcrumbs.map(breadcrumb => ({
                ...breadcrumb,
                message: breadcrumb.message ? scrubString(breadcrumb.message) : undefined,
                data: breadcrumb.data ? scrubObject(breadcrumb.data) : undefined,
                }));
            }
            
            // 6. Scrub user context 
            if (event.user) {
              event.user = {
                id: event.user.id ? `user_${event.user.id.slice(0, 8)}` : undefined,
                email: undefined,
                username: undefined,
                ip_address: undefined,
                metadata: event.user.metadata ? {
                  condition: event.user.metadata.condition,
                  session_duration: event.user.metadata.session_duration,
                } : undefined,
              };
            }
            
            // 7. Scrub extra context
            if (event.extra) {
              event.extra = scrubObject(event.extra);
            }
            
            // 8. Scrub tags
            if (event.tags) {
              event.tags = Object.fromEntries(
                Object.entries(event.tags).map(([key, value]) => [
                  key,
                  isSensitiveField(key) ? '[REDACTED]' : scrubString(String(value))
                ])
              );
            }
            
            // 9. Remove contexts that might contain PII
            if (event.contexts) {
                // Keep browser/OS info, remove everything else
              event.contexts = {
                browser: event.contexts.browser,
                os: event.contexts.os,
                // Remove runtime, device, etc. as they might have PII
              };
            }
            
            return event;
          },

          beforeBreadcrumb(breadcrumb, hint) {
            // Remove console breadcrumbs
            if (breadcrumb.category === 'console') {
              return null;
            }
            
            // Scrub fetch/XHR URLs
            if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
              if (breadcrumb.data?.url) {
                breadcrumb.data.url = scrubUrl(breadcrumb.data.url);
              }
              
              // Remove request/response bodies
              if (breadcrumb.data?.request_body) {
                breadcrumb.data.request_body = '[REDACTED]';
              }
              if (breadcrumb.data?.response_body) {
                breadcrumb.data.response_body = '[REDACTED]';
              }
            }
            
            // Scrub UI breadcrumbs
            if (breadcrumb.category === 'ui.click') {
              if (breadcrumb.message) {
                breadcrumb.message = scrubString(breadcrumb.message);
              }
            }
            
            // Scrub navigation URLs
            if (breadcrumb.category === 'navigation') {
              if (breadcrumb.data?.from) {
                breadcrumb.data.from = scrubUrl(breadcrumb.data.from);
              }
              if (breadcrumb.data?.to) {
                breadcrumb.data.to = scrubUrl(breadcrumb.data.to);
              }
            }
            
            return breadcrumb;
          },
            
          /*
          * beforeSendTransaction - Scrub performance transactions
          */
          beforeSendTransaction(transaction) {
            // Scrub transaction name
            if (transaction.transaction) {
              transaction.transaction = scrubString(transaction.transaction);
            }
            
            // Scrub request data
            if (transaction.request) {
              transaction.request = {
                ...transaction.request,
                url: scrubUrl(transaction.request.url),
                cookies: undefined,
                headers: transaction.request.headers ? scrubObject(transaction.request.headers) : undefined,
              };
            }
            
            // Scrub spans
            if (transaction.spans) {
              transaction.spans = transaction.spans.map(span => ({
                ...span,
                description: span.description ? scrubString(span.description) : undefined,
                data: span.data ? scrubObject(span.data) : undefined,
              }));
            }
            
            return transaction;
          },
            
            // ============================================================
            // INTEGRATIONS WITH PII PROTECTION
            // ============================================================
            
            integrations: [
              Sentry.browserTracingIntegration({
                traceFetch: false, // Disable to avoid logging sensitive requests
                traceXHR: false,
              }),
            
              Sentry.replayIntegration({
                // Mask all text by default
                maskAllText: true,
                
                // Block all media
                blockAllMedia: true,
                
                // Mask all inputs (including placeholders)
                maskAllInputs: true,
                
                // Additional privacy settings
                maskTextSelector: '*',
                blockSelector: '[data-sensitive]', // Custom attribute for extra sensitive elements
                
                // Network details
                networkDetailAllowUrls: [], // Don't capture any network details
                networkCaptureBodies: false,
                networkResponseHeaders: [],
                networkRequestHeaders: [],
              }),
            ],
            
            // ============================================================
            // IGNORE PATTERNS
            // ============================================================
            
            ignoreErrors: [
            // Browser extensions
            'top.GLOBALS',
            'atomicFindClose',
            
            // WebSocket (expected)
            'WebSocket',
            'Heartbeat timeout',
            
            // ResizeObserver (benign)
            'ResizeObserver loop',
            ],
        });
    
        console.log('✅ Sentry initialized with PII scrubbing (GDPR compliant)');

    } catch (error) {
        console.error('Failed to initialize Sentry:', error);
    } 
}

// ============================================================
// MANUAL SCRUBBING UTILITY
// ============================================================

/**
 * Manually scrub data before logging
 * Use this when manually capturing events
 */
export function scrubData(data) {
  return scrubObject(data);
}

/**
 * Safe capture exception (with automatic PII scrubbing)
 */
export function captureException(error, context = {}) {
  Sentry.captureException(error, {
    contexts: scrubObject(context),
  });
}

/**
 * Safe capture message (with automatic PII scrubbing)
 */
export function captureMessage(message, level = 'info', context = {}) {
  Sentry.captureMessage(scrubString(message), {
    level,
    contexts: scrubObject(context),
  });
}

export default { initSentry, scrubData, captureException, captureMessage };