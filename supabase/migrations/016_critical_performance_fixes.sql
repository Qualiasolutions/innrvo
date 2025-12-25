-- Migration: Critical Performance Fixes
-- Addresses high sequential scan rates and removes unused indexes
-- Note: Uses regular CREATE INDEX (not CONCURRENTLY) for compatibility with Supabase migrations

-- ============================================================================
-- PART 1: Add Critical Indexes (Eliminates Sequential Scans)
-- ============================================================================

-- 1. voice_profiles: Edge function lookup pattern (52% seq scans → <5%)
-- Used in generate-speech, fish-audio-tts, chatterbox-tts edge functions
-- Query pattern: WHERE id = $1 AND user_id = $2
-- INCLUDE clause creates covering index (no table lookup needed)
CREATE INDEX IF NOT EXISTS idx_voice_profiles_id_user
ON voice_profiles(id, user_id)
INCLUDE (voice_sample_url, provider_voice_id, elevenlabs_voice_id, fish_audio_model_id, provider);

COMMENT ON INDEX idx_voice_profiles_id_user IS
'Covering index for edge function voice lookups. Eliminates table access entirely.';

-- 2. voice_clones: Active voice list query (100% seq scans → <5%)
-- Used in getUserVoiceClones() - lib/supabase.ts:589
-- Query pattern: WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_voice_clones_user_active_created
ON voice_clones(user_id, is_active, created_at DESC)
WHERE is_active = true;

COMMENT ON INDEX idx_voice_clones_user_active_created IS
'Optimized index for active voice clone queries with ordering. Partial index reduces size.';

-- 3. voice_cloning_usage: Usage history queries (93% seq scans → <10%)
-- Query pattern: WHERE user_id = $1 ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_voice_cloning_usage_user_created
ON voice_cloning_usage(user_id, created_at DESC);

COMMENT ON INDEX idx_voice_cloning_usage_user_created IS
'Composite index for usage history queries with time-based ordering.';

-- 4. meditation_history: Favorites filter (fix unused partial index)
-- Query pattern: WHERE user_id = $1 AND is_favorite = true ORDER BY created_at DESC
-- Note: Partial index on (user_id, created_at) is better than (user_id, is_favorite, created_at)
-- because is_favorite is already in WHERE clause - no need in index key
CREATE INDEX IF NOT EXISTS idx_meditation_favorites_optimized
ON meditation_history(user_id, created_at DESC)
WHERE is_favorite = true;

COMMENT ON INDEX idx_meditation_favorites_optimized IS
'Optimized partial index for favorite meditations. Smaller than full composite index.';

-- ============================================================================
-- PART 2: Remove Unused Indexes (Identified by Supabase Advisors)
-- ============================================================================

-- These indexes have 0 scans and add write overhead to every INSERT/UPDATE/DELETE

-- 1. idx_users_email - Email lookups go through auth.users, not public.users
DROP INDEX IF EXISTS idx_users_email;

-- 2. idx_voice_clones_user_id - Replaced by idx_voice_clones_user_active_created
DROP INDEX IF EXISTS idx_voice_clones_user_id;

-- 3. idx_voice_profiles_provider_voice_id - Never queried by provider_voice_id alone
DROP INDEX IF EXISTS idx_voice_profiles_provider_voice_id;

-- 4. idx_voice_profiles_fish_audio_model_id - Never queried by fish_audio_model_id alone
DROP INDEX IF EXISTS idx_voice_profiles_fish_audio_model_id;

-- 5. idx_meditation_history_user_favorite - Wrong definition, replaced by idx_meditation_favorites_optimized
DROP INDEX IF EXISTS idx_meditation_history_user_favorite;

-- 6. idx_audio_generations_model_id - Foreign key constraint, but never queried
DROP INDEX IF EXISTS idx_audio_generations_model_id;

-- 7. idx_voice_cloning_usage_voice_profile_id - Foreign key, but never queried
DROP INDEX IF EXISTS idx_voice_cloning_usage_voice_profile_id;

-- ============================================================================
-- PART 3: Update Table Statistics (For Better Query Planning)
-- ============================================================================

-- Analyze tables to update statistics for query planner
-- This helps Postgres choose the right indexes
ANALYZE voice_profiles;
ANALYZE voice_clones;
ANALYZE voice_cloning_usage;
ANALYZE meditation_history;

-- ============================================================================
-- PART 4: Configure Auto-Vacuum for High-Churn Tables
-- ============================================================================

-- voice_clones has extreme bloat (7.3MB index for 8KB data)
-- More aggressive auto-vacuum prevents this
ALTER TABLE voice_clones
  SET (autovacuum_vacuum_scale_factor = 0.1);  -- Vacuum when 10% changed (default: 20%)

ALTER TABLE meditation_history
  SET (autovacuum_vacuum_scale_factor = 0.1);

COMMENT ON TABLE voice_clones IS
'Auto-vacuum configured aggressively (10%) due to high delete rate. Run VACUUM FULL if bloated.';

-- ============================================================================
-- PART 5: Expected Performance Gains
-- ============================================================================
--
-- voice_profiles lookups: 5-10ms → 0.5-1ms (80-90% faster)
-- voice_clones list: 8-15ms → 0.8-2ms (75-85% faster)
-- TTS request (database portion): 50-100ms → 10-20ms (60-80% faster)
-- Write operations: +5-10% faster (from removing unused indexes)
--
-- User-facing impact:
-- - Meditation generation: -100-200ms latency
-- - Voice cloning UI: -50-100ms load time
-- - History page: -30-80ms initial load
