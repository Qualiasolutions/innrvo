
import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './index.css';
import App from './App';
import { ModalProvider } from './src/contexts/ModalContext';
import ErrorBoundary from './components/ErrorBoundary';

// Initialize Sentry for error tracking
// DSN should be set via environment variable in production
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,

    // Performance monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Session replay for debugging (sample 10% of sessions, 100% of errors)
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Only enable in production
    enabled: import.meta.env.PROD,

    // Filter out noisy errors
    ignoreErrors: [
      // Browser extensions
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // Network errors (user is offline)
      'Failed to fetch',
      'NetworkError',
      'Load failed',
    ],

    // Add user context when available
    beforeSend(event) {
      // Don't send events in development
      if (import.meta.env.DEV) {
        console.log('[Sentry] Would send event:', event);
        return null;
      }
      return event;
    },
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ModalProvider>
        <App />
      </ModalProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
