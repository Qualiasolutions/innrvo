# Database Optimization Sprint Plan

**Date:** 2025-12-31
**Author:** Claude Code Analysis
**Status:** Ready for Implementation

## Executive Summary

The INrVO database layer is **already well-optimized** with recent migrations (007, 015, 016, 018, 023-025) implementing:
- Covering indexes for voice profiles
- Materialized views for admin analytics
- STABLE function caching for RLS policies
- Query deduplication in the client layer

This document identifies **remaining optimization opportunities** for the next sprint cycle.

---

## 1. Slow Query Identification

### 1.1 Current Query Patterns Analysis

| Query | Location | Est. Time | Issue |
|-------|----------|-----------|-------|
| `getAllUsers()` | adminSupabase.ts:47 | 10-50ms | `SELECT *` fetches all columns |
| `getAllMeditations()` | adminSupabase.ts:88 | 20-100ms | `SELECT *` with JOIN |
| `getAllVoiceProfiles()` | adminSupabase.ts:125 | 15-60ms | `SELECT *` with JOIN |
| `getMeditationHistoryPaginated()` | supabase.ts:869 | 5-20ms | Good - uses `count: 'exact'` |
| `saveMeditationHistory()` | supabase.ts:764 | 10-30ms | Two queries (INSERT + UPDATE) |

### 1.2 Recommended Query Optimizations

#### A. Admin Queries: Explicit Column Selection

```sql
-- BEFORE (getAllUsers)
SELECT * FROM users ORDER BY created_at DESC;

-- AFTER: Only fetch display columns (~40% smaller payload)
SELECT id, email, first_name, last_name, role, tier, created_at, last_login_at
FROM users ORDER BY created_at DESC;
```

**Files to update:**
- `/home/qualiasolutions/Desktop/Projects/voice/inrvo/src/lib/adminSupabase.ts` lines 47-54
- `/home/qualiasolutions/Desktop/Projects/voice/inrvo/src/lib/adminSupabase.ts` lines 88-96

#### B. Meditation Save: Single Upsert Pattern

```typescript
// CURRENT: Two queries (INSERT + conditional UPDATE)
const { data } = await supabase.from('meditation_history').insert({...}).select().single();
if (audioBase64) {
  const audioPath = await uploadMeditationAudio(audioBase64, data.id);
  await supabase.from('meditation_history').update({ audio_url: audioPath }).eq('id', data.id);
}

// RECOMMENDED: Use RPC function for atomic operation
// See Migration 026 below
```

### 1.3 EXPLAIN ANALYZE Predictions

For the most common queries, expected execution plans:

```sql
-- Voice profile lookup (uses covering index)
EXPLAIN ANALYZE
SELECT voice_sample_url, provider_voice_id, fish_audio_model_id, provider, cloning_status, status, name
FROM voice_profiles WHERE id = $1 AND user_id = $2;

-- Expected: Index Only Scan using idx_voice_profiles_id_user_covering
-- Time: 0.3-0.7ms (was 0.5-1ms before covering index)

-- Meditation history pagination
EXPLAIN ANALYZE
SELECT id, prompt, voice_name, background_track_name, duration_seconds, audio_url, is_favorite, created_at
FROM meditation_history
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;

-- Expected: Index Scan using idx_meditation_history_user_created
-- Time: 2-8ms depending on user's meditation count
```

---

## 2. Index Analysis

### 2.1 Current Index Coverage (Excellent)

| Table | Index | Covers Query Pattern | Notes |
|-------|-------|---------------------|-------|
| voice_profiles | idx_voice_profiles_id_user_covering | Edge function lookups | Covering index - no table access |
| voice_profiles | idx_voice_profiles_user_created | User's voice list | Composite with DESC ordering |
| meditation_history | idx_meditation_history_user_created | History pagination | Primary access pattern |
| meditation_history | idx_meditation_favorites_optimized | Favorites filter | Partial index on is_favorite=true |
| voice_clones | idx_voice_clones_user_active_created | Active clones list | Partial index |
| users | idx_users_id_role | Admin RLS checks | Supports is_admin() function |
| agent_conversations | idx_agent_conversations_user_updated | Latest conversation | Composite with DESC |

### 2.2 Missing Indexes (Recommended)

#### A. Meditation History: Audio URL Partial Index

Current: `idx_meditation_history_audio` was dropped in migration 016.
Recommended: Add optimized partial index for "meditations with audio" queries.

```sql
-- Migration 026: Meditation Audio Partial Index
CREATE INDEX IF NOT EXISTS idx_meditation_history_with_audio
ON meditation_history(user_id, created_at DESC)
WHERE audio_url IS NOT NULL;

COMMENT ON INDEX idx_meditation_history_with_audio IS
  'Optimized for querying meditations that have audio files. Partial index reduces size.';
```

#### B. Agent Conversations: Messages GIN Index

For full-text search within conversation messages (future feature):

```sql
-- Migration 027: Agent Conversations Search Index
CREATE INDEX IF NOT EXISTS idx_agent_conversations_messages_gin
ON agent_conversations USING GIN (messages jsonb_path_ops);

COMMENT ON INDEX idx_agent_conversations_messages_gin IS
  'GIN index for searching within JSONB messages array. Supports @> operator.';
```

### 2.3 Index Maintenance Recommendations

```sql
-- Run monthly: Check for index bloat
SELECT
  schemaname || '.' || tablename as table,
  indexrelname as index,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  idx_scan as index_scans,
  CASE WHEN idx_scan = 0 THEN 'UNUSED' ELSE 'ACTIVE' END as status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Run after bulk operations: Update statistics
ANALYZE voice_profiles;
ANALYZE meditation_history;
ANALYZE agent_conversations;
```

---

## 3. Schema Optimization

### 3.1 Current Schema Assessment

| Table | Size Est. | JSONB Columns | Assessment |
|-------|-----------|---------------|------------|
| users | Small | audio_tag_preferences | OK - preferences rarely exceed 1KB |
| meditation_history | Medium-Large | timing_map (if exists) | Monitor - scripts can be 5-20KB |
| agent_conversations | Medium | messages, preferences, session_state | Review - messages array can grow large |
| voice_profiles | Small | None | Excellent - flat schema |
| audio_tag_presets | Tiny | None | Excellent |

### 3.2 Schema Improvement Opportunities

#### A. Agent Conversations: Message Archiving

Problem: `messages` JSONB can grow indefinitely, causing slow reads/writes.

```sql
-- Migration 028: Agent Conversation Archiving
ALTER TABLE agent_conversations
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Create archive table for old messages
CREATE TABLE IF NOT EXISTS agent_conversation_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
  messages JSONB NOT NULL,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  message_range INT4RANGE -- Stores which message indices are archived
);

-- Index for archive lookups
CREATE INDEX idx_agent_conversation_archive_conv_id
ON agent_conversation_archive(conversation_id);

-- Function to archive old messages (keep last 50 in main table)
CREATE OR REPLACE FUNCTION archive_old_messages(p_conversation_id TEXT, p_keep_recent INTEGER DEFAULT 50)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_messages INTEGER;
  v_messages_to_archive JSONB;
  v_archived_count INTEGER := 0;
BEGIN
  -- Get message count
  SELECT jsonb_array_length(messages) INTO v_total_messages
  FROM agent_conversations WHERE id = p_conversation_id;

  IF v_total_messages <= p_keep_recent THEN
    RETURN 0;
  END IF;

  -- Archive older messages
  v_archived_count := v_total_messages - p_keep_recent;

  INSERT INTO agent_conversation_archive (conversation_id, messages, message_range)
  SELECT
    p_conversation_id,
    (SELECT jsonb_agg(elem) FROM (
      SELECT elem FROM jsonb_array_elements(messages) WITH ORDINALITY arr(elem, idx)
      WHERE idx <= v_archived_count
    ) sub),
    int4range(1, v_archived_count + 1)
  FROM agent_conversations
  WHERE id = p_conversation_id;

  -- Keep only recent messages
  UPDATE agent_conversations
  SET messages = (
    SELECT jsonb_agg(elem) FROM (
      SELECT elem FROM jsonb_array_elements(messages) WITH ORDINALITY arr(elem, idx)
      WHERE idx > v_archived_count
    ) sub
  ),
  message_count = p_keep_recent
  WHERE id = p_conversation_id;

  RETURN v_archived_count;
END;
$$;
```

#### B. Meditation History: Script Storage Optimization

Problem: `enhanced_script` TEXT column can be 5-20KB per meditation.

Options:
1. **Keep as-is** - PostgreSQL handles TEXT efficiently, not a bottleneck
2. **Move to Storage** - Store scripts in Supabase Storage bucket (adds latency)
3. **Compress in app** - LZ77 compression in JS before storing (adds complexity)

**Recommendation:** Keep current design. TEXT columns are not causing issues.

### 3.3 Denormalization Opportunities

#### A. Voice Profile Display Cache

Add `display_name` to meditation_history to avoid JOIN on read:

```sql
-- Already implemented: voice_name column exists in meditation_history
-- This is good denormalization - no JOIN needed for history display
```

---

## 4. Connection Pool Tuning

### 4.1 Supabase Client Configuration

Current client in `lib/supabase.ts` uses default configuration.

**Recommended settings for Vite/React:**

```typescript
// lib/supabase.ts - Enhanced configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: { 'x-application-name': 'inrvo' },
  },
  // Supabase handles connection pooling server-side (pgbouncer)
  // No client-side pool configuration needed
});
```

### 4.2 Edge Function Connection Pattern

Current pattern (good):
```typescript
// Lazy-load Supabase client
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
  }
  return supabaseClient;
}
```

**This is optimal** - reuses client across warm function invocations.

### 4.3 Query Deduplication Assessment

Current implementation in `lib/supabase.ts`:

```typescript
const pendingQueries = new Map<string, Promise<any>>();

export async function deduplicatedQuery<T>(
  key: string,
  operation: () => Promise<T>
): Promise<T> {
  if (pendingQueries.has(key)) {
    return pendingQueries.get(key)! as Promise<T>;
  }
  // ...
}
```

**Usage:** Currently only applied to `getUserVoiceProfiles()`.

**Recommendation:** Extend to:
- `getMeditationHistory()`
- `getFavoriteMeditations()`
- `getCurrentUserProfile()`

---

## 5. Caching Strategy

### 5.1 Current Caching Layers

| Layer | Cache | TTL | Location |
|-------|-------|-----|----------|
| Edge Functions | Voice profile in-memory | 1 hour | fish-audio-tts, generate-speech |
| Client | Audio tags localStorage | 1 hour | src/lib/audioTagCache.ts |
| Database | Admin analytics materialized view | 5 min | admin_analytics_cache |
| Query | Deduplicated queries (in-flight) | Request duration | lib/supabase.ts |

### 5.2 Recommended Cache Improvements

#### A. Meditation History Cache (New)

```typescript
// src/lib/historyCache.ts
const HISTORY_CACHE_KEY = 'inrvo_meditation_history';
const HISTORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedHistory {
  data: MeditationHistory[];
  totalCount: number;
  timestamp: number;
}

export function getCachedHistory(): CachedHistory | null {
  try {
    const cached = sessionStorage.getItem(HISTORY_CACHE_KEY);
    if (!cached) return null;

    const parsed: CachedHistory = JSON.parse(cached);
    if (Date.now() - parsed.timestamp > HISTORY_CACHE_TTL) {
      sessionStorage.removeItem(HISTORY_CACHE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function setCachedHistory(data: MeditationHistory[], totalCount: number): void {
  try {
    sessionStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify({
      data,
      totalCount,
      timestamp: Date.now(),
    }));
  } catch (e) {
    console.warn('[historyCache] Failed to cache:', e);
  }
}

export function invalidateHistoryCache(): void {
  sessionStorage.removeItem(HISTORY_CACHE_KEY);
}
```

#### B. Voice Profile Cache (Client-Side)

Extend the edge function cache pattern to client-side:

```typescript
// src/lib/voiceProfileCache.ts
const VOICE_CACHE_KEY = 'inrvo_voice_profiles';
const VOICE_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Similar pattern to audioTagCache.ts
// Cache voice profiles after getUserVoiceProfiles()
// Invalidate on create/update/delete
```

#### C. Consider Supabase Realtime for Cache Invalidation

For multi-tab/device sync, use Supabase Realtime:

```typescript
// Setup realtime subscription for cache invalidation
supabase
  .channel('db-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'meditation_history',
    filter: `user_id=eq.${userId}`,
  }, () => {
    invalidateHistoryCache();
  })
  .subscribe();
```

---

## 6. Migration Scripts

### Migration 026: Atomic Meditation Save Function

```sql
-- File: supabase/migrations/026_atomic_meditation_save.sql

-- Atomic function to save meditation with audio in one transaction
CREATE OR REPLACE FUNCTION save_meditation_with_audio(
  p_prompt TEXT,
  p_enhanced_script TEXT DEFAULT NULL,
  p_voice_id UUID DEFAULT NULL,
  p_voice_name TEXT DEFAULT NULL,
  p_background_track_id TEXT DEFAULT NULL,
  p_background_track_name TEXT DEFAULT NULL,
  p_duration_seconds INTEGER DEFAULT NULL,
  p_audio_tags_used TEXT[] DEFAULT '{}',
  p_audio_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_meditation_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO meditation_history (
    user_id, prompt, enhanced_script, voice_id, voice_name,
    background_track_id, background_track_name, duration_seconds,
    audio_tags_used, audio_url
  ) VALUES (
    v_user_id, p_prompt, p_enhanced_script, p_voice_id, p_voice_name,
    p_background_track_id, p_background_track_name, p_duration_seconds,
    p_audio_tags_used, p_audio_url
  )
  RETURNING id INTO v_meditation_id;

  RETURN v_meditation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION save_meditation_with_audio(TEXT, TEXT, UUID, TEXT, TEXT, TEXT, INTEGER, TEXT[], TEXT)
TO authenticated;

COMMENT ON FUNCTION save_meditation_with_audio IS
  'Atomically saves meditation history with audio URL. Reduces 2 queries to 1.';
```

### Migration 027: Query Deduplication Index

```sql
-- File: supabase/migrations/027_meditation_with_audio_index.sql

-- Partial index for meditations with audio
CREATE INDEX IF NOT EXISTS idx_meditation_history_with_audio
ON meditation_history(user_id, created_at DESC)
WHERE audio_url IS NOT NULL;

COMMENT ON INDEX idx_meditation_history_with_audio IS
  'Optimized index for "My Audios" page - only includes meditations with audio files.';

ANALYZE meditation_history;
```

---

## 7. Performance Benchmarks

### Expected Improvements After Optimizations

| Operation | Current | After Optimization | Improvement |
|-----------|---------|-------------------|-------------|
| Admin dashboard load | 30-50ms | 2-5ms | 90% (materialized view - already done) |
| Voice profile lookup | 0.5-1ms | 0.3-0.7ms | 30% (covering index - already done) |
| Meditation history (first page) | 5-20ms | 3-10ms | 40% (with client cache) |
| Save meditation | 30-50ms | 15-25ms | 50% (atomic function) |
| Admin user list | 10-50ms | 8-40ms | 20% (explicit columns) |

### Monitoring Recommendations

1. **Enable pg_stat_statements** (if not already enabled):
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
   ```

2. **Weekly slow query review**:
   ```sql
   SELECT
     query,
     calls,
     mean_exec_time,
     total_exec_time
   FROM pg_stat_statements
   WHERE mean_exec_time > 10 -- queries > 10ms
   ORDER BY total_exec_time DESC
   LIMIT 20;
   ```

3. **Supabase Dashboard**: Monitor API latency in the Logs Explorer

---

## 8. Implementation Priority

### Sprint 1 (High Impact, Low Risk)

1. **Client-side caching for meditation history** - historyCache.ts
2. **Extend query deduplication** to more endpoints
3. **Apply Migration 026** (atomic meditation save)

### Sprint 2 (Medium Impact)

1. **Agent conversation archiving** (if conversations grow large)
2. **Voice profile client cache** (voiceProfileCache.ts)
3. **Realtime cache invalidation** setup

### Sprint 3 (Maintenance)

1. **Monthly index health check** script
2. **ANALYZE automation** after bulk operations
3. **Documentation update** for caching patterns

---

## Appendix: Files to Modify

| File | Change |
|------|--------|
| `src/lib/adminSupabase.ts` | Explicit column selection in getAllUsers, getAllMeditations |
| `lib/supabase.ts` | Extend deduplicatedQuery usage, use atomic save function |
| `src/lib/historyCache.ts` | NEW - meditation history cache |
| `src/lib/voiceProfileCache.ts` | NEW - voice profile client cache |
| `supabase/migrations/026_*.sql` | NEW - atomic meditation save |
| `supabase/migrations/027_*.sql` | NEW - meditation with audio index |
