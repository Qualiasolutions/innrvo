-- Migration: Performance Optimizations
-- Adds optimized indexes and atomic functions for better query performance

-- ============================================================================
-- Optimized Composite Indexes
-- ============================================================================

-- Voice profiles: Optimize for user queries with ordering
CREATE INDEX IF NOT EXISTS idx_voice_profiles_user_created
ON voice_profiles(user_id, created_at DESC);

-- Agent conversations: Composite index for user + ordering
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_created
ON agent_conversations(user_id, created_at DESC);

-- Meditation history: Index for favorites filter
CREATE INDEX IF NOT EXISTS idx_meditation_history_user_favorite
ON meditation_history(user_id, is_favorite)
WHERE is_favorite = true;

-- Meditation history: Composite for main query pattern
CREATE INDEX IF NOT EXISTS idx_meditation_history_user_created
ON meditation_history(user_id, created_at DESC);

-- ============================================================================
-- Atomic Toggle Favorite Function
-- Reduces 2 queries (read + write) to 1 query
-- ============================================================================

CREATE OR REPLACE FUNCTION toggle_meditation_favorite(p_meditation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_new_value BOOLEAN;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Toggle and return new value in one operation
  UPDATE meditation_history
  SET is_favorite = NOT is_favorite,
      updated_at = NOW()
  WHERE id = p_meditation_id
    AND user_id = v_user_id
  RETURNING is_favorite INTO v_new_value;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meditation not found or access denied';
  END IF;

  RETURN v_new_value;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION toggle_meditation_favorite(UUID) TO authenticated;

-- ============================================================================
-- Add updated_at column if missing (for tracking updates)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meditation_history'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE meditation_history
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ============================================================================
-- Cleanup duplicate and unused indexes
-- ============================================================================

-- Drop duplicate favorites index (keeping the new composite one)
DROP INDEX IF EXISTS idx_meditation_history_favorites;

-- Drop redundant single-column indexes replaced by composites
DROP INDEX IF EXISTS idx_meditation_history_created_at;
DROP INDEX IF EXISTS idx_agent_conversations_user_id;
DROP INDEX IF EXISTS idx_agent_conversations_created_at;

-- Drop unused indexes to reduce write overhead
DROP INDEX IF EXISTS idx_voice_profiles_status;
DROP INDEX IF EXISTS idx_voice_profiles_provider;
DROP INDEX IF EXISTS idx_voice_profiles_elevenlabs_id;
DROP INDEX IF EXISTS idx_voice_profiles_metadata;
DROP INDEX IF EXISTS idx_voice_clones_audio_path;
DROP INDEX IF EXISTS idx_voice_samples_status;
DROP INDEX IF EXISTS idx_audio_generations_text_hash;
DROP INDEX IF EXISTS idx_audio_generations_status;
DROP INDEX IF EXISTS idx_voice_models_is_active;
DROP INDEX IF EXISTS idx_training_jobs_status;
DROP INDEX IF EXISTS idx_voice_cloning_usage_created_at;
DROP INDEX IF EXISTS idx_meditation_history_audio;
DROP INDEX IF EXISTS idx_meditation_history_user_rating;

-- ============================================================================
-- Add indexes for foreign keys that were missing coverage
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_audio_generations_model_id
ON audio_generations(model_id);

CREATE INDEX IF NOT EXISTS idx_voice_cloning_usage_voice_profile_id
ON voice_cloning_usage(voice_profile_id);
