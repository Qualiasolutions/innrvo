-- Migration: ElevenLabs Voice Provider Migration
-- Migrates from Fish Audio/Chatterbox to ElevenLabs as primary voice provider

-- ============================================================================
-- 1. Ensure elevenlabs_voice_id column exists with proper index
-- ============================================================================

-- The column already exists from migration 001, but may need reindexing
-- Drop old index if it exists (was dropped in migration 015)
DROP INDEX IF EXISTS idx_voice_profiles_elevenlabs_id;

-- Create new index for ElevenLabs lookups
CREATE INDEX IF NOT EXISTS idx_voice_profiles_elevenlabs_voice_id
  ON voice_profiles(elevenlabs_voice_id)
  WHERE elevenlabs_voice_id IS NOT NULL;

-- ============================================================================
-- 2. Update provider enum comment
-- ============================================================================

COMMENT ON COLUMN voice_profiles.provider IS
  'Voice provider: browser, elevenlabs (active). Legacy: fish-audio, chatterbox (deprecated)';

-- ============================================================================
-- 3. Update covering index for new ElevenLabs-focused queries
-- ============================================================================

-- Drop the old covering index that was Fish Audio focused
DROP INDEX IF EXISTS idx_voice_profiles_covering_index;

-- Create new covering index optimized for ElevenLabs
CREATE INDEX idx_voice_profiles_covering_index ON voice_profiles(
  user_id,
  status,
  elevenlabs_voice_id,
  voice_sample_url,
  name,
  created_at
) WHERE status = 'READY';

-- ============================================================================
-- 4. Mark existing Fish Audio/Chatterbox voices as needing re-clone
-- ============================================================================

-- Add a new cloning_status value for legacy voices
-- This allows users to continue using legacy voices while prompting them to re-clone
UPDATE voice_profiles
SET cloning_status = 'NEEDS_RECLONE'
WHERE provider IN ('fish-audio', 'chatterbox')
  AND elevenlabs_voice_id IS NULL
  AND status = 'READY';

-- Log how many voices were marked
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO affected_count
  FROM voice_profiles
  WHERE cloning_status = 'NEEDS_RECLONE';

  RAISE NOTICE 'Marked % voice profiles as needing re-clone for ElevenLabs migration', affected_count;
END $$;

-- ============================================================================
-- 5. Create helper function to check if voice needs ElevenLabs migration
-- ============================================================================

CREATE OR REPLACE FUNCTION needs_elevenlabs_migration(voice_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM voice_profiles
    WHERE id = voice_profile_id
      AND elevenlabs_voice_id IS NULL
      AND provider IN ('fish-audio', 'chatterbox')
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION needs_elevenlabs_migration(UUID) TO authenticated;

-- ============================================================================
-- 6. Add index for legacy provider lookup (for migration status checks)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_voice_profiles_legacy_provider
  ON voice_profiles(provider, elevenlabs_voice_id)
  WHERE provider IN ('fish-audio', 'chatterbox') AND elevenlabs_voice_id IS NULL;

-- ============================================================================
-- Migration complete
-- ============================================================================

-- Note: This migration is non-destructive:
-- - Existing Fish Audio/Chatterbox voices remain functional
-- - Users are prompted to re-clone when they access legacy voices
-- - New voices use ElevenLabs exclusively
-- - Legacy columns (fish_audio_model_id, provider_voice_id) are preserved for rollback
