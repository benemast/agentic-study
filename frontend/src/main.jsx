// frontend/src/main.jsx

import { initSentry } from './config/sentry';
initSentry();

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
