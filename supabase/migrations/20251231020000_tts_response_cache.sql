-- ============================================================================
-- TTS Response Cache Table
-- Stores generated audio to avoid re-generating identical content
-- Expected cache hit rate: 10-20%
-- Impact: Saves 35-76s per cache hit (Fish Audio TTS time)
-- ============================================================================

-- Create TTS cache table
CREATE TABLE IF NOT EXISTS tts_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cache key components (for lookup)
  script_hash TEXT NOT NULL,          -- SHA-256 hash of script text
  voice_id UUID NOT NULL,             -- Voice profile used
  provider TEXT NOT NULL DEFAULT 'fish-audio', -- TTS provider

  -- Cached response
  audio_base64 TEXT NOT NULL,         -- Base64-encoded audio data
  audio_format TEXT NOT NULL DEFAULT 'mp3',
  audio_duration_seconds INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  access_count INTEGER NOT NULL DEFAULT 1,

  -- TTL management
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),

  -- Unique constraint for cache key lookup
  CONSTRAINT tts_cache_unique_key UNIQUE (script_hash, voice_id, provider)
);

-- Index for cache lookups (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_tts_cache_lookup
ON tts_response_cache (script_hash, voice_id, provider)
WHERE expires_at > NOW();

-- Index for cache cleanup (expired entries)
CREATE INDEX IF NOT EXISTS idx_tts_cache_expires
ON tts_response_cache (expires_at);

-- Index for access tracking (LRU eviction)
CREATE INDEX IF NOT EXISTS idx_tts_cache_lru
ON tts_response_cache (last_accessed_at);

-- ============================================================================
-- Cache Management Functions
-- ============================================================================

-- Function to get cached TTS response
CREATE OR REPLACE FUNCTION get_tts_cache(
  p_script_hash TEXT,
  p_voice_id UUID,
  p_provider TEXT DEFAULT 'fish-audio'
)
RETURNS TABLE (
  audio_base64 TEXT,
  audio_format TEXT,
  audio_duration_seconds INTEGER
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Update access tracking
  UPDATE tts_response_cache
  SET
    last_accessed_at = NOW(),
    access_count = access_count + 1
  WHERE
    script_hash = p_script_hash
    AND voice_id = p_voice_id
    AND provider = p_provider
    AND expires_at > NOW();

  -- Return cached data
  RETURN QUERY
  SELECT
    c.audio_base64,
    c.audio_format,
    c.audio_duration_seconds
  FROM tts_response_cache c
  WHERE
    c.script_hash = p_script_hash
    AND c.voice_id = p_voice_id
    AND c.provider = p_provider
    AND c.expires_at > NOW();
END;
$$;

-- Function to set TTS cache
CREATE OR REPLACE FUNCTION set_tts_cache(
  p_script_hash TEXT,
  p_voice_id UUID,
  p_audio_base64 TEXT,
  p_audio_format TEXT DEFAULT 'mp3',
  p_audio_duration_seconds INTEGER DEFAULT NULL,
  p_provider TEXT DEFAULT 'fish-audio',
  p_ttl_hours INTEGER DEFAULT 24
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_cache_id UUID;
BEGIN
  -- Upsert cache entry
  INSERT INTO tts_response_cache (
    script_hash,
    voice_id,
    provider,
    audio_base64,
    audio_format,
    audio_duration_seconds,
    expires_at
  ) VALUES (
    p_script_hash,
    p_voice_id,
    p_provider,
    p_audio_base64,
    p_audio_format,
    p_audio_duration_seconds,
    NOW() + (p_ttl_hours || ' hours')::INTERVAL
  )
  ON CONFLICT (script_hash, voice_id, provider)
  DO UPDATE SET
    audio_base64 = EXCLUDED.audio_base64,
    audio_format = EXCLUDED.audio_format,
    audio_duration_seconds = EXCLUDED.audio_duration_seconds,
    last_accessed_at = NOW(),
    access_count = tts_response_cache.access_count + 1,
    expires_at = NOW() + (p_ttl_hours || ' hours')::INTERVAL
  RETURNING id INTO v_cache_id;

  RETURN v_cache_id;
END;
$$;

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_tts_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM tts_response_cache
  WHERE expires_at < NOW()
  RETURNING 1 INTO v_deleted_count;

  RETURN COALESCE(v_deleted_count, 0);
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON tts_response_cache TO authenticated;
GRANT EXECUTE ON FUNCTION get_tts_cache TO authenticated;
GRANT EXECUTE ON FUNCTION set_tts_cache TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_tts_cache TO service_role;

-- Add comments
COMMENT ON TABLE tts_response_cache IS
'Cache for TTS-generated audio responses.
Key: (script_hash, voice_id, provider)
TTL: 24 hours default
Expected cache hit rate: 10-20%
Saves 35-76s per cache hit (Fish Audio TTS generation time).';

COMMENT ON FUNCTION get_tts_cache IS 'Get cached TTS response and update access tracking';
COMMENT ON FUNCTION set_tts_cache IS 'Store TTS response in cache with TTL';
COMMENT ON FUNCTION cleanup_tts_cache IS 'Remove expired cache entries (run periodically)';
