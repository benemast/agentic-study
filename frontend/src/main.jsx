// frontend/src/main.jsx
/**
 * Main Entry Point with Mode Routing
 * 
 * Routes between:
 * - Study Mode: For participants (default)
 * - Admin Mode: For development/testing (accessible via ?mode=admin)
 */
import * as Sentry from '@sentry/react';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

// Import both apps
import StudyApp from './StudyApp';
import App from './App';

//Import session initializer
import SessionInitializer from './components/session/SessionInitializer';

/*

const SentryApp = Sentry.withErrorBoundary(App, {
  fallback: ({ error, componentStack, resetError }) => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
        <h2 className="text-xl font-bold text-red-600 mb-4">
          Something went wrong
        </h2>
        <p className="text-gray-600 mb-4">
          The application encountered an error. We've been notified and will fix it soon.
        </p>
        <button
          onClick={resetError}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    </div>
  ),
  showDialog: false,
});

*/


// Error Fallback for Study Flow (participant-facing)
const StudyErrorFallback = ({ error, resetError }) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Etwas ist schiefgelaufen
        </h2>
        <p className="text-sm text-gray-500 mb-1">Something went wrong</p>
      </div>
      
      <div className="bg-red-50 rounded-lg p-4 mb-6">
        <p className="text-sm text-red-800">
          Die Anwendung ist auf einen Fehler gestoßen. Wir wurden benachrichtigt und werden das Problem beheben.
        </p>
        <p className="text-xs text-red-600 mt-2">
          The application encountered an error. We've been notified and will fix it soon.
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={resetError}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Erneut versuchen / Try Again
        </button>
        
        <button
          onClick={() => window.location.href = '/'}
          className="w-full px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          Zur Startseite / Go to Home
        </button>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Bei anhaltenden Problemen kontaktieren Sie bitte:{' '}
          <a 
            href={`mailto:${import.meta.env.VITE_CONTACT_EMAIL}`}
            className="text-blue-600 hover:underline"
          >
            {import.meta.env.VITE_CONTACT_EMAIL}
          </a>
        </p>
      </div>
    </div>
  </div>
);

// Error Fallback for Admin Interface (dev-facing)
const AdminErrorFallback = ({ error, resetError, componentStack }) => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
      <div className="flex items-start gap-4 mb-6">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Application Error
          </h2>
          <p className="text-gray-600">
            An error occurred in the admin interface. Details below:
          </p>
        </div>
      </div>

      {/* Error Details (admin only) */}
      <div className="bg-red-50 rounded-lg p-4 mb-4">
        <div className="text-sm font-mono text-red-900 mb-2">
          <strong>Error:</strong> {error?.message || 'Unknown error'}
        </div>
        {import.meta.env.DEV && componentStack && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-red-700 hover:text-red-900">
              View component stack
            </summary>
            <pre className="mt-2 text-xs text-red-800 overflow-auto max-h-40 bg-red-100 p-2 rounded">
              {componentStack}
            </pre>
          </details>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={resetError}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.href = '/admin'}
          className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          Reload Admin
        </button>
      </div>

      {import.meta.env.DEV && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          💡 Development Mode: Check browser console for full error details
        </div>
      )}
    </div>
  </div>
);

// Wrap components with appropriate error boundaries
const StudyAppWithErrorBoundary = Sentry.withErrorBoundary(StudyApp, {
  fallback: StudyErrorFallback,
  showDialog: false, // Don't show Sentry dialog to study participants
});

const AdminAppWithErrorBoundary = Sentry.withErrorBoundary(App, {
  fallback: AdminErrorFallback,
  showDialog: import.meta.env.DEV, // Show dialog in dev mode for admins
});

const MainApp = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Study Flow - Default Route */}
        <Route path="/*" element={<StudyAppWithErrorBoundary />} />
        
        {/* Admin/Dev Interface */}
        <Route path="/admin" element={<AdminAppWithErrorBoundary />} />
      </Routes>
    </BrowserRouter>
  );
};

// Mount app
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SessionInitializer>
      <MainApp />
    </SessionInitializer>    
  </React.StrictMode>
);