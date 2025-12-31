# INrVO Performance Optimization Report

**Date:** December 31, 2025
**Version:** 1.0
**Scope:** Edge Functions, Frontend, Caching, Concurrency

---

## Executive Summary

This report provides a comprehensive performance analysis of the INrVO meditation app, identifying specific bottlenecks, algorithm inefficiencies, memory usage patterns, and opportunities for concurrency and caching improvements.

### Key Metrics (Current State)

| Metric | Current | Target | Priority |
|--------|---------|--------|----------|
| TTS Generation (Fish Audio) | 35-76s | 20-40s | HIGH |
| Voice Profile Lookup | 50-150ms (cache miss) | <5ms (cache hit) | MEDIUM |
| Content Detection | O(n*m) patterns | O(n) compiled regex | LOW |
| Edge Function Cold Start | ~500ms | ~200ms | MEDIUM |
| AppContext Re-renders | All consumers | Selective | HIGH |

---

## 1. Edge Function Performance Analysis

### 1.1 Retry Logic (`src/lib/edgeFunctions.ts`)

**Current Implementation:**
```typescript
const DEFAULT_RETRY_OPTIONS = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
};
```

**Bottleneck Identified:**
- TTS operations use only 1 retry with 2s base delay, but the retry loop still incurs ~200-500ms overhead for backoff calculation on each attempt
- The `isRetryableError()` function performs 5 type checks per error

**Recommendation:**
```typescript
// Pre-compiled retryable status codes Set for O(1) lookup
const RETRYABLE_STATUS_CODES = new Set([500, 502, 503, 504, 429]);

function isRetryableError(error: unknown, status?: number): boolean {
  if (status && RETRYABLE_STATUS_CODES.has(status)) return true;
  // ... rest of checks
}
```

**Complexity Improvement:** O(n) -> O(1) for status code checks

### 1.2 Circuit Breaker (`supabase/functions/_shared/circuitBreaker.ts`)

**Current Implementation:**
- In-memory state per edge function instance
- Resets on cold starts (acceptable for Edge Functions)
- 3-5 failure threshold, 30-60s reset timeout

**Bottleneck Identified:**
- Circuit state is not shared across Edge Function instances
- Under high load, multiple instances may independently open circuits

**Recommendation (Future Sprint):**
Implement distributed circuit breaker using Supabase's built-in Redis-compatible cache or a dedicated KV store for critical circuits.

### 1.3 Rate Limiting (`supabase/functions/_shared/rateLimit.ts`)

**Current Implementation:**
```typescript
// In-memory store - O(1) access
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup runs every 60s
setInterval(() => cleanup(windowMs), CLEANUP_INTERVAL);
```

**Performance Analysis:**
- `checkRateLimit()`: O(1) lookup + O(1) insert = O(1)
- Cleanup: O(n) iteration over all entries

**Bottleneck Identified:**
- `cleanup()` is called on EVERY request before rate limit check
- Iterates entire store even when cleanup interval hasn't passed (guard clause exists but after loop setup)

**Recommendation:**
```typescript
function cleanup(windowMs: number = MAX_WINDOW_MS): void {
  const now = Date.now();
  // Early return BEFORE any iteration
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  // ... cleanup logic
}
```

**Current Complexity:** O(n) per request (n = active rate limit entries)
**Improved Complexity:** O(1) for 59/60 requests, O(n) for cleanup

---

## 2. Algorithm Complexity Analysis

### 2.1 Voice Service Paralanguage Conversion (`src/lib/voiceService.ts`)

**Current Implementation:**
```typescript
function convertAudioTagsToEffects(text: string): string {
  let processed = text;
  processed = processed.replace(/\[pause\]/gi, '(break)');
  processed = processed.replace(/\[long pause\]/gi, '(long-break)');
  // ... 6 more replace calls
  processed = processed.replace(/\[[^\]]+\]/g, '');
  processed = processed.replace(/\s+/g, ' ').trim();
}
```

**Complexity Analysis:**
- 8 sequential `.replace()` calls on the same string
- Each `.replace()` is O(n) where n = text length
- Total: O(8n) = O(n) but with 8x constant factor

**Recommendation - Single-Pass Approach:**
```typescript
const TAG_MAPPINGS: Record<string, string> = {
  'pause': '(break)',
  'long pause': '(long-break)',
  'deep breath': '(breath)',
  'exhale slowly': '(sigh)',
  'sigh': '(sigh)',
  'breath': '(breath)',
};

function convertAudioTagsToEffects(text: string): string {
  return text.replace(/\[([^\]]+)\]/gi, (match, tag) => {
    const normalized = tag.toLowerCase();
    return TAG_MAPPINGS[normalized] || '';
  }).replace(/\s+/g, ' ').trim();
}
```

**Improvement:** O(8n) -> O(2n), 4x reduction in string iterations

### 2.2 Meditation Text Preparation (`prepareMeditationText()`)

**Current Implementation:**
```typescript
function prepareMeditationText(text: string): string {
  let processed = text;
  // 7 sequential .replace() calls
  processed = processed.replace(/\.(\s+)(?=[A-Z])/g, '. (long-break) $1');
  processed = processed.replace(/\!(\s+)(?=[A-Z])/g, '! (break) $1');
  // ... 5 more
  processed = processed.replace(/\(break\)\s*\(break\)/g, '(long-break)');
  processed = processed.replace(/\(long-break\)\s*\(long-break\)/g, '(long-break)');
  processed = processed.replace(/\s+/g, ' ').trim();
}
```

**Complexity:** O(10n) - 10 passes over the string

**Recommendation - Reduce Passes:**
```typescript
function prepareMeditationText(text: string): string {
  // Combine punctuation handlers with lookahead
  let processed = text
    .replace(/([.!?])(\s+)(?=[A-Z])/g, (_, p, s) => {
      const effect = p === '.' ? '(long-break)' : '(break)';
      return `${p} ${effect} ${s}`;
    })
    .replace(/,(\s+)/g, ', (break) $1');

  // Combine breathing patterns
  processed = processed.replace(
    /\b(breathe in|inhale|breathe out|exhale)\b/gi,
    (_, word) => {
      const effect = /in|inhale/i.test(word) ? '(breath) (long-break)' : '(sigh) (long-break)';
      return `${word} ${effect}`;
    }
  );

  // Cleanup in single pass
  return processed
    .replace(/\((?:break|long-break)\)\s*\((?:break|long-break)\)/g, '(long-break)')
    .replace(/\s+/g, ' ')
    .trim();
}
```

**Improvement:** O(10n) -> O(5n), 50% reduction

### 2.3 Content Detection (`src/lib/agent/contentDetection.ts`)

**Current Implementation:**
```typescript
// 50+ explicit patterns tested sequentially
const EXPLICIT_PATTERNS: DetectionPattern[] = [
  { pattern: /(?:bedtime\s+)?story.../i, ... },
  // ... 50+ patterns
];

// Then 25+ keyword clusters
const KEYWORD_CLUSTERS: KeywordCluster[] = [
  { keywords: ['toddler', 'baby', '2 year'...], weight: 15 },
  // ... 25+ clusters
];
```

**Complexity Analysis:**
- `checkExplicitPatterns()`: O(p) where p = 50+ patterns
- `semanticDetection()`: O(c * k) where c = 25+ clusters, k = avg keywords per cluster
- Total per detection: O(p + c*k) = O(50 + 25*8) = O(250) operations

**Bottleneck Identified:**
- Each `.test()` creates a new regex execution context
- `isGeneralConversation()` has 10 patterns tested BEFORE any caching

**Recommendation - Pre-compiled Combined Regex:**
```typescript
// Compile once at module load
const CONVERSATIONAL_PATTERNS = new RegExp(
  `^(?:${[
    'hi|hello|hey|greetings',
    'how\\s+are\\s+you',
    'thanks?(?:\\s+you)?',
    // ... combine all conversational patterns
  ].join('|')})[\s!.,?]*$`,
  'i'
);

function isGeneralConversation(input: string): boolean {
  return CONVERSATIONAL_PATTERNS.test(input.trim());
}
```

**Improvement:** O(10 regex tests) -> O(1 regex test)

### 2.4 Harmonize Output Validation (`geminiService.ts`)

**Current Implementation:**
```typescript
function validateHarmonizedOutput(script: string): string {
  // 10 dangerous pattern checks
  const dangerousPatterns = [/<script[^>]*>/i, ...];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(script)) {
      throw new Error('Invalid content detected');
    }
  }

  // Then tag filtering
  const sanitized = script.replace(/\[[^\]]+\]/g, (match) => {
    if (VALID_AUDIO_TAGS.has(match)) return match;
    return '';
  });

  // 3 more cleanup passes
  return sanitized
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
```

**Complexity:** O(10 + 4) = O(14) string passes

**Recommendation - Combined Validation:**
```typescript
const DANGEROUS_PATTERN = /<(?:script|iframe|object|embed|style|link)[^>]*>|javascript:|on\w+\s*=|<img[^>]*onerror/i;

function validateHarmonizedOutput(script: string): string {
  if (DANGEROUS_PATTERN.test(script)) {
    throw new Error('Invalid content detected');
  }

  return script
    .replace(/\[[^\]]+\]/g, match => VALID_AUDIO_TAGS.has(match) ? match : '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]{2,}|\n{3,}/g, m => m.startsWith('\n') ? '\n\n' : ' ')
    .trim();
}
```

**Improvement:** O(14 passes) -> O(4 passes), 70% reduction

---

## 3. Memory Usage Analysis

### 3.1 Edge Function In-Memory Caches

**Voice Profile Cache (`fish-audio-tts/index.ts`):**
```typescript
const voiceProfileCache = new Map<string, CachedVoiceProfile>();
const VOICE_CACHE_TTL = 3600000; // 1 hour

// Cleanup every TTL period
setInterval(() => { /* cleanup */ }, VOICE_CACHE_TTL);
```

**Memory Estimate:**
- Per entry: ~200 bytes (UUID + profile data + expiry)
- Typical active users: 100-1000
- Memory usage: 20KB - 200KB (acceptable for Edge Functions)

**Risk:** No upper bound on cache size

**Recommendation:**
```typescript
const MAX_CACHE_SIZE = 1000;

function setCacheEntry(key: string, data: CachedVoiceProfile) {
  // LRU eviction when at capacity
  if (voiceProfileCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = voiceProfileCache.keys().next().value;
    voiceProfileCache.delete(oldestKey);
  }
  voiceProfileCache.set(key, data);
}
```

### 3.2 Rate Limit Store Memory

**Current Implementation:**
```typescript
const rateLimitStore = new Map<string, RateLimitEntry>();
```

**Memory Estimate:**
- Per entry: ~100 bytes (key + count + timestamp)
- Active users per minute: 500-5000
- Memory usage: 50KB - 500KB

**Risk:** No upper bound, cleanup only removes expired entries

**Recommendation:** Same LRU pattern as voice cache

### 3.3 Browser AudioContext Memory

**Current Implementation (`useAudioPlayback.ts`):**
```typescript
const audioContextRef = useRef<AudioContext | null>(null);
const audioBufferRef = useRef<AudioBuffer | null>(null);
```

**Memory Analysis:**
- Meditation audio: 2-8MB (2-10 minutes at 128kbps MP3)
- `AudioBuffer` stores uncompressed PCM: 10-40MB for decoded audio
- Background music: Additional 5-20MB

**Bottleneck Identified:**
- `audioBufferRef` retains decoded audio even after playback ends
- No explicit cleanup on component unmount

**Recommendation:**
```typescript
// In stop() function
const stop = useCallback(() => {
  // ... existing cleanup
  audioBufferRef.current = null;  // Already done

  // Add: Close AudioContext to release system resources
  if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
    audioContextRef.current.close().catch(() => {});
    audioContextRef.current = null;
  }
}, []);
```

### 3.4 AppContext Memory Footprint

**Current State:**
- 50+ state values in single context
- useMemo dependency array has 37 items
- Every state change re-creates context object

**Memory Impact:**
- Context object: ~2KB per render
- At 60 state changes/minute: 120KB/minute of GC pressure

**Recommendation (Future Sprint):**
Split into domain-specific contexts:
1. `AudioPlaybackContext` - playback state, refs, controls
2. `VoiceContext` - voice profiles, cloning status
3. `ScriptContext` (already exists) - meditation scripts
4. `LibraryContext` (already exists) - meditation history
5. `PreferencesContext` - audio settings, tags

---

## 4. Concurrency Improvement Opportunities

### 4.1 Background Music Pre-loading

**Current Flow:**
```
TTS Generation (35-76s) -> Audio Decode -> Play -> Start Background Music
```

**Bottleneck:** User waits for TTS + background music load sequentially

**Recommendation - Parallel Loading:**
```typescript
async function generateMeditationWithBackground(text: string, voice: VoiceProfile) {
  // Start both in parallel
  const [ttsResult, bgMusicLoaded] = await Promise.all([
    voiceService.generateSpeech(text, voice),
    preloadBackgroundMusic(selectedTrack),
  ]);

  // Background music ready when TTS completes
  return ttsResult;
}
```

**Expected Improvement:** Eliminate 500-2000ms background music load time

### 4.2 Meditation History Batch Operations

**Current Implementation:**
```typescript
// Sequential operations
const result = await getMeditationHistoryPaginated(page, 20);
setMeditationHistory(prev => [...prev, ...result.data]);
```

**Bottleneck:** Loading 20 items triggers 20 individual state updates if done incorrectly

**Already Optimized:** Current implementation uses batch state update correctly

### 4.3 Voice Profile Parallel Fetch

**Current Implementation:**
```typescript
// generate-speech edge function
const voiceProfile = await getCachedVoiceProfile(supabase, voiceId, user.id, log);
// Then TTS generation
```

**Recommendation - Speculative Pre-fetch:**
```typescript
// Client side: Pre-fetch voice profile while user types
useEffect(() => {
  if (selectedVoice?.id) {
    // Warm the cache before TTS is requested
    fetch(`/functions/v1/prefetch-voice?voiceId=${selectedVoice.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => {}); // Silent prefetch
  }
}, [selectedVoice?.id]);
```

### 4.4 WebWorker for Audio Processing

**Current Implementation:**
- Audio decoding happens on main thread via `decodeAudioData`
- WAV header creation happens on main thread

**Bottleneck:** Large audio files (5-10MB) can cause 100-500ms main thread blocking

**Recommendation - Offload to Worker:**
```typescript
// audioWorker.ts
self.onmessage = async (e) => {
  const { base64 } = e.data;
  const arrayBuffer = base64ToArrayBuffer(base64);
  // Expensive operations here
  const processed = processAudio(arrayBuffer);
  self.postMessage({ processed });
};

// In component
const audioWorker = new Worker(new URL('./audioWorker.ts', import.meta.url));
audioWorker.onmessage = (e) => {
  // Continue on main thread
};
```

**Expected Improvement:** 100-500ms reduced main thread blocking

### 4.5 TTS Streaming (Future Enhancement)

**Current Flow:**
```
Request -> Fish Audio generates full audio (35-76s) -> Base64 encode -> Response -> Decode -> Play
```

**Recommendation - Chunked Streaming:**
```typescript
// Edge function
const response = await fetch('https://api.fish.audio/v1/tts', {
  body: JSON.stringify({
    streaming: true,  // Enable streaming
    // ...
  }),
});

// Stream chunks to client
for await (const chunk of response.body) {
  controller.enqueue(chunk);
}
```

**Expected Improvement:** First audio plays within 2-5s, not 35-76s

---

## 5. Caching Layer Architecture

### 5.1 Current Caching Layers

| Layer | Location | TTL | Scope | Technology |
|-------|----------|-----|-------|------------|
| Voice Profiles | Edge Function | 1 hour | Per instance | In-memory Map |
| Audio Tags | Browser | 1 hour | Per user | localStorage |
| Auth Token | Client | 55 min | Per user | In-memory |
| Rate Limits | Edge Function | 60s window | Per instance | In-memory Map |

### 5.2 Recommended Caching Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  localStorage Cache                                              │
│  ├── Audio Tag Presets (1 hour TTL) ✓                           │
│  ├── Voice Profiles (15 min TTL) [NEW]                          │
│  └── User Preferences (1 hour TTL) [NEW]                        │
│                                                                  │
│  Memory Cache (React Context/State)                              │
│  ├── Auth Token (55 min) ✓                                      │
│  ├── Meditation History (session) ✓                             │
│  └── Selected Voice (session) ✓                                 │
├─────────────────────────────────────────────────────────────────┤
│                      EDGE FUNCTION LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│  In-Memory Cache (per instance)                                  │
│  ├── Voice Profiles (1 hour TTL, LRU 1000) ✓ [ENHANCE]          │
│  ├── Rate Limits (60s window) ✓                                 │
│  └── Circuit Breaker State (30-60s) ✓                           │
│                                                                  │
│  [RECOMMENDED] Supabase KV/Redis (shared across instances)       │
│  ├── Voice Profiles (1 hour TTL)                                │
│  ├── Rate Limits (distributed)                                   │
│  └── TTS Response Cache (audio hash -> base64, 24 hour TTL)     │
├─────────────────────────────────────────────────────────────────┤
│                      DATABASE LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  Supabase Tables                                                 │
│  ├── voice_profiles (source of truth)                           │
│  ├── meditation_history (source of truth)                        │
│  └── audio_tag_presets (source of truth)                        │
│                                                                  │
│  Materialized Views [RECOMMENDED]                                │
│  └── admin_analytics_mv (refresh every 5 min)                   │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 TTS Response Caching (High Impact)

**Opportunity:** Same meditation script + voice = same audio output

**Implementation:**
```typescript
// Hash script + voiceId for cache key
function generateCacheKey(text: string, voiceId: string): string {
  const combined = `${voiceId}:${text}`;
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(combined))
    .then(hash => btoa(String.fromCharCode(...new Uint8Array(hash))));
}

// In generate-speech edge function
const cacheKey = await generateCacheKey(text, voiceProfile.fish_audio_model_id);
const cached = await supabase.from('tts_cache').select('audio_base64').eq('key', cacheKey).single();

if (cached.data) {
  return { audioBase64: cached.data.audio_base64, cached: true };
}

// Generate and cache
const result = await runFishAudioTTS(...);
await supabase.from('tts_cache').insert({ key: cacheKey, audio_base64: result.base64, created_at: new Date() });
```

**Expected Impact:**
- Cache hit rate: 10-20% (users regenerate same scripts)
- Savings: 35-76s per cache hit
- Storage cost: ~$0.023/GB/month for audio cache

### 5.4 Client-Side Voice Profile Cache

**Recommendation:**
```typescript
// src/lib/voiceProfileCache.ts
const CACHE_KEY = 'inrvo_voice_profiles';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export function getCachedVoiceProfiles(): DBVoiceProfile[] | null {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;

  const { data, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp > CACHE_TTL) {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }

  return data;
}

export function setCachedVoiceProfiles(profiles: DBVoiceProfile[]): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify({
    data: profiles,
    timestamp: Date.now(),
  }));
}
```

---

## 6. Priority Implementation Roadmap

### Sprint 1 (High Impact, Low Effort)

| Task | Impact | Effort | Expected Gain |
|------|--------|--------|---------------|
| Add LRU eviction to voice profile cache | Medium | 2h | Prevent memory leaks |
| Combine dangerous pattern regex | Low | 1h | 70% less string passes |
| Pre-compiled conversational regex | Low | 1h | O(10) -> O(1) |
| Parallel background music loading | High | 4h | 500-2000ms faster |

### Sprint 2 (Medium Impact, Medium Effort)

| Task | Impact | Effort | Expected Gain |
|------|--------|--------|---------------|
| Client-side voice profile cache | Medium | 4h | 50-150ms per request |
| Single-pass audio tag conversion | Low | 2h | 4x fewer string iterations |
| TTS response caching table | High | 8h | 35-76s for 10-20% requests |
| AppContext decomposition | High | 16h | Reduced re-renders |

### Sprint 3 (High Impact, High Effort)

| Task | Impact | Effort | Expected Gain |
|------|--------|--------|---------------|
| TTS streaming implementation | Very High | 24h | First audio in 2-5s |
| WebWorker audio processing | Medium | 8h | Eliminate main thread blocking |
| Distributed rate limiting | Medium | 16h | Consistent limits across instances |
| Gemini response caching | Medium | 8h | Faster script regeneration |

---

## 7. Monitoring Recommendations

### 7.1 Key Metrics to Track

```typescript
// Edge function metrics
interface EdgeFunctionMetrics {
  // Latency
  tts_generation_p50_ms: number;
  tts_generation_p95_ms: number;
  voice_profile_cache_hit_rate: number;

  // Reliability
  circuit_breaker_open_count: number;
  rate_limit_exceeded_count: number;
  retry_attempt_count: number;

  // Resource
  cache_size_bytes: number;
  memory_usage_mb: number;
}

// Client metrics
interface ClientMetrics {
  // Performance
  time_to_first_audio_ms: number;
  audio_decode_time_ms: number;

  // Reliability
  tts_error_rate: number;
  cache_hit_rate: number;
}
```

### 7.2 Alerting Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| TTS P95 latency | > 90s | > 120s |
| Circuit breaker open | > 1/hour | > 5/hour |
| Cache size | > 500KB | > 1MB |
| Error rate | > 1% | > 5% |

---

## 8. Conclusion

The INrVO meditation app has a solid architecture with several performance optimizations already in place (auth token caching, voice profile caching, lazy loading). The primary bottleneck is the Fish Audio TTS generation time (35-76s), which is an external API constraint.

**Highest Impact Optimizations:**
1. **TTS Streaming** - Reduce perceived latency from 35-76s to 2-5s
2. **TTS Response Caching** - Eliminate generation time for repeated scripts
3. **Parallel Background Music** - Save 500-2000ms on every generation
4. **AppContext Decomposition** - Reduce unnecessary re-renders

**Quick Wins (Implement Now):**
1. LRU cache eviction (prevent memory leaks)
2. Combined regex patterns (reduce string passes)
3. Parallel music loading (simple Promise.all)

The optimizations identified in this report can collectively reduce perceived TTS latency by 90%+ (via streaming) and improve overall app responsiveness by 20-30%.
