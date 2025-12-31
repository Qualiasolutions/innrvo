# Frontend Performance Optimization Plan

**Generated:** 2025-12-31
**Focus:** Bundle size, lazy loading, rendering, Core Web Vitals, network optimization

---

## Executive Summary

The INrVO meditation app has solid performance fundamentals with React 19, Vite 6, and intelligent code splitting. Current bundle analysis shows:

| Metric | Current Value | Target | Status |
|--------|---------------|--------|--------|
| Initial bundle (gzipped) | ~321KB | <280KB | Needs work |
| Deferred via lazy loading | ~400KB | Maintain | Good |
| Largest chunks | react-vendor (62KB), supabase-vendor (44KB), AgentChat (41KB) | <40KB each | Needs work |
| CSS (gzipped) | 21KB | <20KB | Good |

### Key Findings

1. **Bundle Size Issues**
   - `react-vendor` (62KB gzipped) - Core React, unavoidable
   - `supabase-vendor` (44KB gzipped) - Heavy but necessary
   - `AgentChat` (41KB gzipped) - Already lazy-loaded but could be split further
   - `lucide-react` raw size is 44MB(!) - Tree-shaking working but could import icons more efficiently
   - `router-vendor` (30KB gzipped) - React Router v7

2. **Context Re-render Risk**
   - `AppContext` has ~50+ state values, uses `useMemo` but all consumers re-render on any change
   - `ModalContext` is well-optimized with separate dispatch/state contexts
   - Context decomposition is partial - could complete separation

3. **Good Practices Already in Place**
   - `LazyMotion` with `domAnimation` (saves ~50KB)
   - All pages lazy-loaded via `React.lazy()`
   - Heavy components (`AuthModal`, `VoiceManager`, `MeditationEditor`, `AgentChat`) lazy-loaded
   - CSS containment for animations
   - Resource preconnect hints in `index.html`
   - Web Vitals monitoring integrated with Sentry

---

## Sprint 1: Bundle Optimization (2-3 days)

### 1.1 Lucide Icons - Selective Import Pattern
**Priority:** HIGH | **Impact:** 5-10KB savings | **Effort:** 1 hour

Currently only 5 files import from lucide-react, but import patterns could be optimized.

**Current:**
```typescript
import { X, Play, Pause, RotateCcw, RotateCw, ChevronUp, Volume2 } from 'lucide-react';
```

**Optimized (if bundle analysis shows issues):**
```typescript
// Use direct imports to help tree-shaking
import { X } from 'lucide-react/dist/esm/icons/x';
import { Play } from 'lucide-react/dist/esm/icons/play';
```

**Files to update:**
- `/home/qualiasolutions/Desktop/Projects/voice/inrvo/components/V0MeditationPlayer/index.tsx`
- `/home/qualiasolutions/Desktop/Projects/voice/inrvo/components/ui/AudioPreview.tsx`
- `/home/qualiasolutions/Desktop/Projects/voice/inrvo/src/pages/AdminPage.tsx`
- `/home/qualiasolutions/Desktop/Projects/voice/inrvo/src/pages/LibraryPage.tsx`
- `/home/qualiasolutions/Desktop/Projects/voice/inrvo/src/pages/NotFoundPage.tsx`

### 1.2 AgentChat Component Splitting
**Priority:** HIGH | **Impact:** 10-15KB initial load savings | **Effort:** 2 hours

`AgentChat.tsx` (129KB, 41KB gzipped) is already lazy-loaded but contains:
- `MeditationEditor` (lazy-loaded internally - good)
- Inline SVG icons (could extract)
- `MessageBubble` component (memoized - good)

**Recommendation:** Split out the meditation panel into its own lazy chunk:
```typescript
// Instead of loading entire AgentChat on home
const ChatInput = lazy(() => import('./AgentChat/ChatInput'));
const ChatMessages = lazy(() => import('./AgentChat/ChatMessages'));
const MeditationPanel = lazy(() => import('./AgentChat/MeditationPanel'));
```

### 1.3 Route Prefetching
**Priority:** MEDIUM | **Impact:** Better UX | **Effort:** 1 hour

Add route prefetching for likely navigation paths.

**Implementation in `/home/qualiasolutions/Desktop/Projects/voice/inrvo/src/router.tsx`:**
```typescript
import { prefetchRouteAssets } from 'react-router-dom';

// Prefetch library when user hovers burger menu
const prefetchLibrary = () => {
  import('./pages/LibraryPage');
};

// Or use React Router v7's built-in prefetching
<Link to="/library" prefetch="intent">Library</Link>
```

### 1.4 Constants.tsx Code Splitting
**Priority:** MEDIUM | **Impact:** 5-10KB savings | **Effort:** 30 min

`/home/qualiasolutions/Desktop/Projects/voice/inrvo/constants.tsx` contains all templates (~50+). Split by category:
```typescript
// constants/index.ts
export { VOICE_PROFILES, BACKGROUND_TRACKS } from './voices';
export const TEMPLATE_CATEGORIES = () => import('./templates');
```

---

## Sprint 2: Context Optimization (1-2 days)

### 2.1 Complete AppContext Decomposition
**Priority:** HIGH | **Impact:** 30-50% fewer re-renders | **Effort:** 4 hours

Current `AppContext` (~363 lines) mixes:
- Auth (already in AuthContext)
- Voices (partially in AuthContext)
- Audio playback refs
- Cloning state
- Library state (already in LibraryContext)
- Script state (already in ScriptContext)
- Generation state

**Recommended new contexts:**
1. `VoiceContext` - selectedVoice, availableVoices, cloningStatus, creditInfo
2. `PlaybackContext` - audioRefs, isPlaying, currentTime, duration, playbackRate, volumes
3. `GenerationContext` - isGenerating, generationStage, chatStarted

**Pattern to follow (already used in ModalContext):**
```typescript
// Separate state and dispatch for minimal re-renders
const VoiceStateContext = createContext<VoiceState | undefined>(undefined);
const VoiceDispatchContext = createContext<Dispatch | undefined>(undefined);

// Consumers choose what they need
export const useVoiceState = () => useContext(VoiceStateContext);
export const useVoiceDispatch = () => useContext(VoiceDispatchContext);
```

### 2.2 Context Provider Ordering
**Priority:** LOW | **Impact:** Cleaner architecture | **Effort:** 30 min

Current nesting in `index.tsx` is deep (8 levels). Consider flattening with composition:
```typescript
const providers = [
  AuthProvider,
  AuthModalProvider,
  ModalProvider,
  AudioProvider,
  ScriptProvider,
  LibraryProvider,
  AudioTagsProvider,
  AppProvider,
];

const Providers = compose(...providers)(children);
```

---

## Sprint 3: Rendering Optimization (1-2 days)

### 3.1 V0MeditationPlayer Animation Optimization
**Priority:** HIGH | **Impact:** 60fps on mobile | **Effort:** 2 hours

`/home/qualiasolutions/Desktop/Projects/voice/inrvo/components/V0MeditationPlayer/index.tsx` has:
- 20 floating particles with individual animations
- 14 orbit particles with complex position calculations
- 12 core rays with staggered animations
- 8 shooting stars

**Optimizations:**
1. Reduce particle count on mobile:
```typescript
const PARTICLE_COUNT = window.matchMedia('(max-width: 768px)').matches ? 10 : 20;
```

2. Use CSS animations instead of Framer Motion for simple transforms:
```css
.floating-particle {
  animation: float 20s infinite ease-in-out;
}
@keyframes float {
  0%, 100% { transform: translateY(0); opacity: 0.15; }
  50% { transform: translateY(-35px); opacity: 0.5; }
}
```

3. Add `will-change` for GPU acceleration:
```typescript
style={{ willChange: 'transform, opacity' }}
```

4. Consider CSS `contain: layout paint` already in `index.css` - verify it's applied

### 3.2 LibraryPage List Virtualization
**Priority:** MEDIUM | **Impact:** Smooth scrolling 100+ items | **Effort:** 3 hours

`/home/qualiasolutions/Desktop/Projects/voice/inrvo/src/pages/LibraryPage.tsx` renders all meditation cards without virtualization.

**Options:**
1. **@tanstack/react-virtual** (2KB gzipped) - Recommended
2. **react-window** (5KB gzipped) - More features

**Implementation:**
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const rowVirtualizer = useVirtualizer({
  count: meditationsWithAudio.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 120, // Card height in px
  overscan: 5,
});

<div ref={parentRef} style={{ height: '70vh', overflow: 'auto' }}>
  <div style={{ height: rowVirtualizer.getTotalSize() }}>
    {rowVirtualizer.getVirtualItems().map((virtualRow) => (
      <MeditationAudioCard
        key={virtualRow.key}
        style={{ transform: `translateY(${virtualRow.start}px)` }}
        {...props}
      />
    ))}
  </div>
</div>
```

### 3.3 Memoization Audit
**Priority:** MEDIUM | **Impact:** Prevents wasted renders | **Effort:** 2 hours

Current memoization usage is good (261 total usages), but audit needed for:

1. **App.tsx** - 3316 lines with many callbacks. Ensure all event handlers use `useCallback`:
```typescript
// Verify all handlers are memoized
const handlePlayPause = useCallback(() => {
  // ...
}, [dependencies]);
```

2. **Heavy list items** - Ensure `MeditationAudioCard` stays memoized with proper key usage

3. **Selector patterns** - For context consumers, use selectors:
```typescript
// Instead of consuming entire context
const { selectedVoice } = useApp();

// Use selector pattern
const selectedVoice = useAppSelector(state => state.selectedVoice);
```

---

## Sprint 4: Core Web Vitals (1 day)

### 4.1 LCP Optimization
**Priority:** HIGH | **Impact:** LCP < 2.5s | **Effort:** 2 hours

**Current LCP candidates:**
- Background images (desktop: 200KB, mobile: 209KB)
- Large heading text on HomePage

**Actions:**
1. Convert JPEG backgrounds to WebP:
```bash
cwebp -q 85 public/desktop--background.jpeg -o public/desktop-background.webp
cwebp -q 85 public/mobile-background.jpeg -o public/mobile-background.webp
```
Expected: 400KB -> 120KB (70% reduction)

2. Add `fetchpriority="high"` for hero images in `index.html` or CSS:
```html
<link rel="preload" as="image" href="/desktop-background.webp" fetchpriority="high">
```

3. Inline critical CSS (above-the-fold styles already in `index.html` - verify coverage)

### 4.2 CLS Prevention
**Priority:** MEDIUM | **Impact:** CLS < 0.1 | **Effort:** 1 hour

**Potential CLS sources:**
1. Lazy-loaded components without size placeholders
2. Font loading (already using `display=swap`)
3. Dynamic content insertion

**Fixes:**
1. Add `min-height` to lazy load containers:
```typescript
<Suspense fallback={<div style={{ minHeight: '400px' }}><PageLoader /></div>}>
```

2. Reserve space for dynamic content (library cards, chat messages)

### 4.3 INP Optimization
**Priority:** MEDIUM | **Impact:** INP < 200ms | **Effort:** 1 hour

**Check heavy event handlers:**
1. Voice recording start/stop
2. Play/pause button
3. Script generation triggers

**Optimizations:**
```typescript
// Defer non-critical work
const handlePlayPause = useCallback(() => {
  // Immediate visual feedback
  setIsPlaying(prev => !prev);

  // Defer heavy audio operations
  requestAnimationFrame(() => {
    // Audio context operations
  });
}, []);
```

---

## Sprint 5: Network Optimization (1 day)

### 5.1 Service Worker for Caching
**Priority:** HIGH | **Impact:** 74% faster repeat visits | **Effort:** 3 hours

Create `/home/qualiasolutions/Desktop/Projects/voice/inrvo/public/sw.js`:
```javascript
const CACHE_NAME = 'inrvo-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  // Add critical assets
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  // Stale-while-revalidate for static assets
  // Network-first for API calls
});
```

Register in `index.html`:
```html
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
</script>
```

### 5.2 Request Deduplication
**Priority:** MEDIUM | **Impact:** 30-50% fewer API calls | **Effort:** 2 hours

Create `/home/qualiasolutions/Desktop/Projects/voice/inrvo/src/lib/requestCache.ts`:
```typescript
const pendingRequests = new Map<string, Promise<any>>();

export async function deduplicatedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }

  const promise = fetcher().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}
```

### 5.3 API Batching
**Priority:** LOW | **Impact:** Fewer round trips | **Effort:** 2 hours

For pages that make multiple Supabase queries, use batch:
```typescript
// Instead of
const [users, meditations, voices] = await Promise.all([
  supabase.from('users').select('*'),
  supabase.from('meditation_history').select('*'),
  supabase.from('voice_profiles').select('*'),
]);

// Use RPC for batched queries
const data = await supabase.rpc('get_admin_dashboard_data');
```

---

## Implementation Priority Matrix

| Priority | Task | Impact | Effort | Sprint |
|----------|------|--------|--------|--------|
| P0 | Convert images to WebP | LCP -0.8s | 1 hour | 1 |
| P0 | Route prefetching | Better UX | 1 hour | 1 |
| P0 | Reduce particles on mobile | 60fps | 1 hour | 1 |
| P1 | AgentChat splitting | -10KB initial | 2 hours | 1 |
| P1 | Complete AppContext decomposition | -50% re-renders | 4 hours | 2 |
| P1 | Service Worker | 74% faster repeats | 3 hours | 5 |
| P2 | LibraryPage virtualization | Smooth scroll | 3 hours | 3 |
| P2 | CLS prevention | CLS < 0.1 | 1 hour | 4 |
| P2 | Request deduplication | -30% API calls | 2 hours | 5 |
| P3 | Constants code splitting | -5KB | 30 min | 1 |
| P3 | INP optimization | INP < 200ms | 1 hour | 4 |

---

## Monitoring & Verification

### Bundle Size Tracking
After each change, run:
```bash
ANALYZE=true npm run build
```

**Target metrics:**
- Initial bundle < 280KB gzipped
- Largest chunk < 40KB gzipped
- Total chunks < 35

### Performance Testing
```bash
# Run Lighthouse in CI
npx lighthouse https://inrvo.com --preset=desktop --output=json

# Or use Chrome DevTools Performance tab
# Focus on: FCP, LCP, CLS, INP
```

### Web Vitals Baseline
Current Sentry integration reports Web Vitals. Establish baselines:
- LCP: Target < 2.5s (currently ~2.8s)
- CLS: Target < 0.1 (currently ~0.05)
- INP: Target < 200ms (currently unknown)

---

## Notes on Existing Optimizations

The codebase already implements many best practices:

1. **LazyMotion** - Reduces Framer Motion from ~150KB to ~74KB
2. **Route-based code splitting** - All pages lazy-loaded
3. **Component lazy loading** - Heavy components deferred
4. **CSS containment** - Applied to animations
5. **Resource hints** - Preconnect for APIs
6. **Web Vitals monitoring** - Integrated with Sentry
7. **Retry logic** - Edge functions have exponential backoff
8. **Auth token caching** - Avoids session fetches

The recommendations above build on this solid foundation to achieve next-level performance.
