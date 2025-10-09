// frontend/src/main.jsx
import * as Sentry from "@sentry/react";

// Initialize Sentry FIRST, before anything else
if (import.meta.env.VITE_SENTRY_DSN) {

  try{

    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || "development",
      
      // Performance Monitoring
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,  // Privacy: mask all text
          blockAllMedia: true, // Privacy: block images/videos
        }),
      ],
      
      // Performance tracing (10% of transactions)
      tracesSampleRate: 0.1,
      
      // Session Replay (10% of sessions, 100% of error sessions)
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      
      // Don't send PII (GDPR compliance)
      beforeSend(event) {
        // Remove any sensitive data here if needed
        return event;
      },
    });
    console.log("✅ Sentry initialized for frontend");
  } catch (error) {
    console.error('Failed to initialize Sentry:', error);
  }
  
} else {
  console.warn("⚠️  Sentry DSN not configured for frontend");
}

// NOW your existing React imports
import React from 'react';
import ReactDOM from 'react-dom/client';
import SentryApp from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SentryApp />
  </React.StrictMode>,
)
