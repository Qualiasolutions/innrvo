import { lazy, Suspense, useEffect, ComponentType } from 'react';
import { createBrowserRouter, RouterProvider, Outlet, ScrollRestoration, useLocation } from 'react-router-dom';

// ============================================================================
// Chunk Loading Error Recovery
// ============================================================================

/**
 * Wraps lazy imports to handle chunk loading failures after deployments.
 * When a new version is deployed, old chunk hashes become invalid.
 * This detects the error and refreshes once to get the new chunks.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(() =>
    importFn().catch((error: Error) => {
      // Check if this is a chunk loading error
      const isChunkError =
        error.message.includes('dynamically imported module') ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('Loading chunk');

      if (isChunkError) {
        // Check if we already tried refreshing (prevent infinite loops)
        const hasRefreshed = sessionStorage.getItem('chunk_refresh');
        if (!hasRefreshed) {
          sessionStorage.setItem('chunk_refresh', 'true');
          window.location.reload();
          // Return a never-resolving promise while reloading
          return new Promise(() => {});
        }
        // Already refreshed once, clear flag and let error propagate
        sessionStorage.removeItem('chunk_refresh');
      }
      throw error;
    })
  );
}

// Clear refresh flag on successful page load
if (typeof window !== 'undefined') {
  sessionStorage.removeItem('chunk_refresh');
}

// Lazy load all pages for code splitting (with chunk error recovery)
const HomePage = lazyWithRetry(() => import('./pages/HomePage'));
const PlayerPage = lazyWithRetry(() => import('./pages/PlayerPage'));
const LibraryPage = lazyWithRetry(() => import('./pages/LibraryPage'));
const TemplatesPage = lazyWithRetry(() => import('./pages/TemplatesPage'));
const VoicesPage = lazyWithRetry(() => import('./pages/VoicesPage'));
const ClonePage = lazyWithRetry(() => import('./pages/ClonePage'));
const HowItWorksPage = lazyWithRetry(() => import('./pages/HowItWorksPage'));
const AboutPage = lazyWithRetry(() => import('./pages/AboutPage'));
const TermsPage = lazyWithRetry(() => import('./pages/TermsPage'));
const PrivacyPage = lazyWithRetry(() => import('./pages/PrivacyPage'));
const PricingPage = lazyWithRetry(() => import('./pages/PricingPage'));
const AdminPage = lazyWithRetry(() => import('./pages/AdminPage'));
const MarketingPage = lazyWithRetry(() => import('./pages/marketing/MarketingPage'));
const ResetPasswordPage = lazyWithRetry(() => import('./pages/ResetPasswordPage'));
const EmailVerifiedPage = lazyWithRetry(() => import('./pages/EmailVerifiedPage'));
const ErrorPage = lazyWithRetry(() => import('./pages/ErrorPage'));
const NotFoundPage = lazyWithRetry(() => import('./pages/NotFoundPage'));

// ============================================================================
// Route Prefetching for instant navigation
// ============================================================================

// Map of routes to their import functions for prefetching
const routeImports: Record<string, () => Promise<unknown>> = {
  '/': () => import('./pages/HomePage'),
  '/play': () => import('./pages/PlayerPage'),
  '/my-audios': () => import('./pages/LibraryPage'),
  '/templates': () => import('./pages/TemplatesPage'),
  '/your-voices': () => import('./pages/VoicesPage'),
  '/clone': () => import('./pages/ClonePage'),
  '/how-it-works': () => import('./pages/HowItWorksPage'),
  '/about': () => import('./pages/AboutPage'),
  '/pricing': () => import('./pages/PricingPage'),
  '/marketing': () => import('./pages/marketing/MarketingPage'),
};

// Prefetch a route's chunk
const prefetchRoute = (path: string) => {
  const importFn = routeImports[path];
  if (importFn) {
    // Use requestIdleCallback for non-blocking prefetch
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => importFn().catch(() => {}));
    } else {
      setTimeout(() => importFn().catch(() => {}), 100);
    }
  }
};

// Routes to prefetch from each page (adjacency map)
const prefetchMap: Record<string, string[]> = {
  '/': ['/my-audios', '/templates', '/your-voices', '/play'],
  '/my-audios': ['/', '/play', '/templates'],
  '/templates': ['/', '/my-audios'],
  '/your-voices': ['/', '/clone', '/my-audios'],
  '/clone': ['/your-voices', '/my-audios'],
  '/pricing': ['/', '/my-audios'],
  '/marketing': ['/', '/admin'],
};

// Hook to prefetch adjacent routes when a page loads
const usePrefetchAdjacent = () => {
  const location = useLocation();

  useEffect(() => {
    const currentPath = location.pathname;
    const adjacentRoutes = prefetchMap[currentPath] || [];

    // Prefetch adjacent routes after a short delay
    const timer = setTimeout(() => {
      adjacentRoutes.forEach(prefetchRoute);
    }, 1000); // Wait 1s after page load

    return () => clearTimeout(timer);
  }, [location.pathname]);
};

// Simple loading spinner - minimal and fast
const PageLoader = () => (
  <div className="fixed inset-0 z-[100] bg-[#020617] flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-500 border-t-transparent" />
  </div>
);

// Root layout with scroll restoration and route prefetching
const RootLayout = () => {
  // Prefetch adjacent routes for instant navigation
  usePrefetchAdjacent();

  return (
    <>
      <ScrollRestoration />
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </>
  );
};

// Router configuration
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'play/:id?',
        element: <PlayerPage />,
      },
      {
        path: 'my-audios',
        element: <LibraryPage />,
      },
      {
        path: 'templates',
        element: <TemplatesPage />,
      },
      {
        path: 'your-voices',
        element: <VoicesPage />,
      },
      {
        path: 'clone',
        element: <ClonePage />,
      },
      {
        path: 'how-it-works',
        element: <HowItWorksPage />,
      },
      {
        path: 'about',
        element: <AboutPage />,
      },
      {
        path: 'terms',
        element: <TermsPage />,
      },
      {
        path: 'privacy',
        element: <PrivacyPage />,
      },
      {
        path: 'pricing',
        element: <PricingPage />,
      },
      {
        path: 'admin',
        element: <AdminPage />,
      },
      {
        path: 'marketing',
        element: <MarketingPage />,
      },
      {
        path: 'auth/reset-password',
        element: <ResetPasswordPage />,
      },
      {
        path: 'auth/verified',
        element: <EmailVerifiedPage />,
      },
      {
        path: 'error',
        element: <ErrorPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);

// Router provider component
export const AppRouter = () => <RouterProvider router={router} />;
