-- Migration: Add missing performance indexes
-- These indexes improve query performance for common access patterns

-- Composite index for voice_profiles ownership lookups (used in edge functions)
-- Supports queries like: SELECT * FROM voice_profiles WHERE id = $1 AND user_id = $2
CREATE INDEX IF NOT EXISTS idx_voice_profiles_id_user_id
ON voice_profiles(id, user_id);

-- Index on user_credits for RLS policy performance
-- Ensures auth.uid() = user_id checks use index
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id
ON user_credits(user_id);

-- Index on voice_usage_limits for monthly lookups
-- Supports composite key (user_id, month_start) queries
CREATE INDEX IF NOT EXISTS idx_voice_usage_limits_user_month
ON voice_usage_limits(user_id, month_start);

-- Index on audio_tag_presets for active tag filtering
-- Supports the RLS policy "is_active = true" check
CREATE INDEX IF NOT EXISTS idx_audio_tag_presets_active_sort
ON audio_tag_presets(is_active, sort_order) WHERE is_active = true;

-- Index on meditation_history for user lookups
CREATE INDEX IF NOT EXISTS idx_meditation_history_user_id
ON meditation_history(user_id);

-- Index on meditation_history for recent meditations (common query pattern)
CREATE INDEX IF NOT EXISTS idx_meditation_history_user_created
ON meditation_history(user_id, created_at DESC);

-- Index on voice_cloning_usage for user and operation type lookups
CREATE INDEX IF NOT EXISTS idx_voice_cloning_usage_user_operation
ON voice_cloning_usage(user_id, operation_type);
