# Stack Research: INrVO Meditation App

**Researched:** December 29, 2025
**Stack:** React 19, Vite 6, Supabase Edge Functions, Tailwind CSS v4, React Router v7, Framer Motion v12

---

## React 19 Best Practices

### Official Recommendations

React 19 introduces powerful new hooks that simplify form handling and optimistic updates:

| Hook | Purpose |
|------|---------|
| `useActionState` | Manages action state (pending, result, error) without custom reducers |
| `useOptimistic` | Shows immediate UI feedback during async operations |
| `useFormStatus` | Reads form submission status from any descendant |
| `use` | Unwraps promises and context in render |

### Current Best Practices (2025)

1. **Use `useActionState` for forms** - Replaces `useFormState` with clearer semantics. Returns `[result, submitAction, isPending]` automatically.

```typescript
const [error, submitAction, isPending] = useActionState(
  async (previousState, formData) => {
    const error = await updateName(formData.get("name"));
    if (error) return error;
    redirect("/path");
    return null;
  },
  null
);
```

2. **Use `useOptimistic` for instant feedback** - Shows immediate state changes while async operations complete. Automatically reverts on failure.

```typescript
const [optimisticName, setOptimisticName] = useOptimistic(currentName);
```

3. **Use `<form action={fn}>` directly** - No extra wiring needed for form submissions.

4. **Use `useFormStatus` in submit buttons** - Read pending state without prop drilling.

```typescript
function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>Submit</button>;
}
```

5. **Resource Preloading APIs** - Use `prefetchDNS`, `preconnect`, `preload`, `preinit` for optimized loading.

6. **Ref Cleanup Functions** - Return cleanup functions from ref callbacks for explicit resource cleanup.

### Common Pitfalls

1. **Don't use `useEffect` for data fetching** - Use loaders or server components instead
2. **Don't manually track `isPending`** - Use `useTransition` or `useActionState` instead
3. **Don't use `useFormState`** - Replaced by `useActionState` in React 19

### Resources
- [React 19 Release Blog](https://react.dev/blog/2024/12/05/react-19)
- [useOptimistic Reference](https://react.dev/reference/react/useOptimistic)

---

## Supabase Edge Functions Best Practices

### Official Recommendations

Edge Functions are server-side TypeScript functions distributed globally at the edge for low latency. Key characteristics:
- Cold starts are possible — design for short-lived, idempotent operations
- No persistent state; each run is stateless
- CPU time limited to 200ms
- Memory limits enforced

### Current Best Practices (2025)

1. **Move initialization outside the handler** - Avoid reinitializing on every request.

```typescript
// ✅ Good - initialized once
const supabase = createClient(url, key);

Deno.serve(async (req) => {
  // Use pre-initialized client
});

// ❌ Bad - reinitializes every request
Deno.serve(async (req) => {
  const supabase = createClient(url, key);
});
```

2. **Implement in-memory caching** - Use Map to avoid redundant database fetches.

3. **Use connection pooling** - Treat Postgres as a remote, pooled service.

4. **Keep functions lean** - Large functions take longer to load and initialize.

5. **Run parallel operations** - Don't await sequentially if operations are independent.

6. **Handle shutdown events** - Monitor for CPUTime and Memory shutdowns.

### Common Pitfalls

1. **Sequential scans on large tables** - Add proper indexes
2. **Buffering large files in memory** - Stream instead
3. **Heavy computation in edge functions** - Move to background workers
4. **Not monitoring shutdown reasons** - Export logs to Sentry

### Performance Metrics to Track
- Invocation duration
- Cold start frequency
- Memory usage
- CPU time consumption

### Resources
- [Edge Functions Architecture](https://supabase.com/docs/guides/functions/architecture)
- [Edge Function Shutdown Reasons](https://supabase.com/docs/guides/troubleshooting/edge-function-shutdown-reasons-explained)
- [Persistent Storage for Faster Cold Starts](https://supabase.com/blog/persistent-storage-for-faster-edge-functions)

---

## Tailwind CSS v4 Best Practices

### Key Changes from v3

| v3 | v4 |
|----|-----|
| `tailwind.config.js` | `@theme` directive in CSS |
| `@tailwind base;` | `@import "tailwindcss";` |
| `tailwindcss` package | `@tailwindcss/postcss` or `@tailwindcss/vite` |
| `shadow-sm` | `shadow-xs` |
| `shadow` | `shadow-sm` |
| `outline-none` | `outline-hidden` |
| `!flex` (prefix) | `flex!` (suffix) |

### Current Best Practices (2025)

1. **Use CSS-first configuration** - Define design system with `@theme` directive:

```css
@import "tailwindcss";

@theme {
  --color-brand: oklch(0.7 0.15 200);
  --font-display: "Satoshi", sans-serif;
}
```

2. **Use `@utility` for custom utilities** - Replaces `@layer utilities`:

```css
@utility tab-4 {
  tab-size: 4;
}
```

3. **Use `@tailwindcss/vite` for Vite projects** - Better performance than PostCSS plugin.

4. **Use CSS variables directly** - Instead of `@apply` in Vue/Svelte components:

```css
h1 {
  color: var(--text-red-500);
}
```

5. **Enable automatic content detection** - No manual content paths needed.

### Migration Checklist

- [ ] Update PostCSS config to use `@tailwindcss/postcss`
- [ ] Or install `@tailwindcss/vite` for Vite projects
- [ ] Replace `@tailwind` directives with `@import "tailwindcss"`
- [ ] Migrate `tailwind.config.js` to `@theme` in CSS
- [ ] Update `shadow-sm` → `shadow-xs`, `shadow` → `shadow-sm`
- [ ] Update `outline-none` → `outline-hidden`
- [ ] Move `!` from prefix to suffix

### Browser Requirements
Safari 16.4+, Chrome 111+, Firefox 128+

### Resources
- [Tailwind CSS v4 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide)
- [Tailwind CSS v4 New Features](https://daily.dev/blog/tailwind-css-40-everything-you-need-to-know-in-one-place)

---

## Vite 6 Best Practices

### Current Best Practices (2025)

1. **Use manual chunks for vendor splitting** - Improves caching:

```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom'],
        'router-vendor': ['react-router-dom'],
      }
    }
  }
}
```

2. **Use Oxc minifier** - Default in Vite 6, 30-90x faster than Terser.

3. **Enable glob patterns for deep imports** - Pre-bundle all at once:

```typescript
optimizeDeps: {
  include: ['my-lib/components/**/*.vue']
}
```

4. **Don't transform SVGs to components** - Import as strings or URLs instead.

5. **Use SWC instead of Babel** - Significantly faster compilation.

6. **Disable compressed size reporting for large projects**:

```typescript
build: {
  reportCompressedSize: false
}
```

7. **Use `mergeConfig` for environment-specific configs**.

### Bundle Size Optimization

| Strategy | Impact |
|----------|--------|
| Vendor splitting | Better caching |
| Dynamic imports | Smaller initial bundle |
| Tree shaking | Remove unused code |
| Cherry-pick imports | Avoid importing entire libraries |

### Performance Metrics

- GitLab achieved 7x faster builds with rolldown-vite (2.5min → 22s)
- Rolldown's `inlineConst` feature reduces bundle size

### Resources
- [Vite Performance Guide](https://vite.dev/guide/performance)
- [Vite 6 Build Optimization](https://markaicode.com/vite-6-build-optimization-guide/)

---

## React Router v7 Best Practices

### Three Modes

| Mode | Use Case |
|------|----------|
| Declarative | Simple client-side routing |
| Data | Client-side with loaders/actions |
| Framework | Full-stack with SSR support |

### Current Best Practices (2025)

1. **Use object-based lazy loading (v7.5+)** - More granular than function-based:

```typescript
{
  path: "/dashboard",
  lazy: {
    loader: async () => (await import("./dashboard")).loader,
    Component: async () => (await import("./dashboard")).Component,
  }
}
```

2. **Run parallel data fetching in loaders**:

```typescript
loader: async () => {
  const [users, posts] = await Promise.all([
    fetchUsers(),
    fetchPosts()
  ]);
  return { users, posts };
}
```

3. **Use `loaderData` prop instead of `useLoaderData`** - Better type safety:

```typescript
export default function Route({ loaderData }: Route.ComponentProps) {
  return <div>{loaderData.title}</div>;
}
```

4. **Use `useFetcher` for mutations** - Better than form actions for complex interactions.

5. **Handle lazy routes for SSR hydration** - Load all matched lazy routes before hydrating.

### Type Safety

React Router v7 has enhanced TypeScript integration with better type checking and autocompletion.

### Resources
- [React Router Data Loading](https://reactrouter.com/start/framework/data-loading)
- [Faster Lazy Loading in v7.5+](https://remix.run/blog/faster-lazy-loading)
- [Speed Up Your Loaders](https://www.epicweb.dev/4-practical-ways-to-speed-up-your-loaders-in-react-router-v7-9z8as)

---

## Framer Motion Best Practices

### Current Best Practices (2025)

1. **Use `m` and `LazyMotion` for smaller bundles** - Reduces from 34kb to ~4.6kb:

```typescript
import { LazyMotion, domAnimation, m } from "framer-motion";

function App() {
  return (
    <LazyMotion features={domAnimation}>
      <m.div animate={{ opacity: 1 }} />
    </LazyMotion>
  );
}
```

2. **Animate GPU-accelerated properties only**:
   - ✅ `x`, `y`, `scale`, `rotate`, `opacity`
   - ❌ `width`, `height`, `top`, `left`

3. **Use `layoutId` for shared element transitions** - Not manual animations.

4. **Use built-in gesture props** - `whileHover`, `whileTap` are internally optimized.

5. **Use `useInView` for lazy animations** - Only animate when visible.

6. **Memoize animation variants** - Define outside render to prevent recreation.

```typescript
// ✅ Good - defined once
const variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
};

function Component() {
  return <motion.div variants={variants} />;
}
```

7. **Use `willChange` sparingly** - Over-optimization can hurt performance.

### Mobile Performance

- Simplify animations on mobile devices
- Reduce number of simultaneously animated elements
- Consider using Motion One for lower-end devices

### Resources
- [Motion Bundle Size Reduction](https://motion.dev/docs/react-reduce-bundle-size)
- [Framer Motion Performance Tips](https://tillitsdone.com/blogs/framer-motion-performance-tips/)

---

## Recommendations for INrVO

### ✅ Already Following Best Practices

1. **Lazy loading pages** - All pages use `React.lazy()` in router
2. **Manual chunks for vendors** - React, Router, Supabase, Framer Motion separated
3. **Edge function retry logic** - Exponential backoff with jitter
4. **Error boundaries** - Wrapping lazy-loaded components
5. **Debug logging gated by DEV flag** - No console noise in production
6. **Connection pooling awareness** - Using Supabase client properly

### 🔄 Should Update

1. **Migrate to Tailwind CSS v4** - Currently on v4.1.18, but may not be using CSS-first config
   - Use `@tailwindcss/vite` instead of PostCSS plugin
   - Move config to `@theme` directive

2. **Consider `useActionState` for forms** - Replace manual `useState` + `setIsPending` patterns in voice cloning and chat

3. **Use `LazyMotion` for Framer Motion** - Reduce bundle from 34kb to ~4.6kb
   - Currently importing full `framer-motion` package

4. **React Router v7.5+ object-based lazy** - More granular code splitting

### 🆕 Should Add

1. **Resource preloading** - Use `prefetchDNS`, `preconnect` for Fish Audio, Gemini APIs

2. **Edge Function monitoring** - Track shutdown reasons (CPUTime, Memory) in Sentry

3. **Optimistic updates for chat** - Use `useOptimistic` for instant message display

4. **`useFormStatus` in submit buttons** - Replace manual `disabled={isPending}` patterns

5. **Consider Oxc minifier** - Already default in Vite 6, verify it's being used

---

## Next Steps

1. **Apply LazyMotion optimization** - Immediate bundle size win (~30kb savings)
2. **Audit Tailwind config** - Ensure using Vite plugin, not PostCSS
3. **Add resource preloading** - For external API domains
4. **Migrate forms to useActionState** - Start with SimpleVoiceClone.tsx
5. **Add edge function monitoring** - Track shutdown reasons

---

## Sources

### React 19
- [React 19 Release](https://react.dev/blog/2024/12/05/react-19)
- [useOptimistic Reference](https://react.dev/reference/react/useOptimistic)
- [React 19 Migration Guide](https://levelup.gitconnected.com/react-19-in-2025-whats-new-why-it-matters-and-how-to-migrate-from-react-18-c904abde4c37)

### Supabase
- [Edge Functions Architecture](https://supabase.com/docs/guides/functions/architecture)
- [Supabase Best Practices](https://www.leanware.co/insights/supabase-best-practices)
- [Edge Function Performance](https://www.dhiwise.com/post/how-do-supabase-edge-functions-improve-app-speed)

### Tailwind CSS
- [Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide)
- [v4 Migration Guide](https://medium.com/@mernstackdevbykevin/tailwind-css-v4-0-complete-migration-guide-breaking-changes-you-need-to-know-7f99944a9f95)

### Vite
- [Vite Performance](https://vite.dev/guide/performance)
- [Bundle Optimization](https://shaxadd.medium.com/optimizing-your-react-vite-application-a-guide-to-reducing-bundle-size-6b7e93891c96)

### React Router
- [Data Loading](https://reactrouter.com/start/framework/data-loading)
- [Faster Lazy Loading](https://remix.run/blog/faster-lazy-loading)
- [v7 Modes](https://blog.logrocket.com/react-router-v7-modes/)

### Framer Motion
- [Bundle Size Reduction](https://motion.dev/docs/react-reduce-bundle-size)
- [Performance Tips](https://tillitsdone.com/blogs/framer-motion-performance-tips/)
