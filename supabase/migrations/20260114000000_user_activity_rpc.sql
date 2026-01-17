-- Migration: Add user activity RPC functions for admin dashboard
-- Purpose: Provide user activity stats and summary for admin analytics

-- ============================================================================
-- Function: get_user_activity_stats
-- Returns per-user activity statistics with sorting
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_activity_stats(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_sort_by TEXT DEFAULT 'last_activity',
  p_sort_order TEXT DEFAULT 'desc'
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  meditation_count BIGINT,
  voice_count BIGINT,
  last_activity TIMESTAMPTZ,
  is_active_7d BOOLEAN,
  is_active_30d BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND role = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Only admins can view user activity stats';
  END IF;

  RETURN QUERY
  WITH user_stats AS (
    SELECT
      u.id AS user_id,
      u.email,
      COALESCE(m.meditation_count, 0) AS meditation_count,
      COALESCE(v.voice_count, 0) AS voice_count,
      GREATEST(m.last_meditation, v.last_voice) AS last_activity
    FROM users u
    LEFT JOIN (
      SELECT
        user_id,
        COUNT(*) AS meditation_count,
        MAX(created_at) AS last_meditation
      FROM meditation_history
      GROUP BY user_id
    ) m ON m.user_id = u.id
    LEFT JOIN (
      SELECT
        user_id,
        COUNT(*) AS voice_count,
        MAX(created_at) AS last_voice
      FROM voice_profiles
      WHERE status != 'ARCHIVED'
      GROUP BY user_id
    ) v ON v.user_id = u.id
  )
  SELECT
    us.user_id,
    us.email,
    us.meditation_count,
    us.voice_count,
    us.last_activity,
    (us.last_activity > NOW() - INTERVAL '7 days') AS is_active_7d,
    (us.last_activity > NOW() - INTERVAL '30 days') AS is_active_30d
  FROM user_stats us
  ORDER BY
    CASE
      WHEN p_sort_by = 'email' AND p_sort_order = 'asc' THEN us.email
    END ASC,
    CASE
      WHEN p_sort_by = 'email' AND p_sort_order = 'desc' THEN us.email
    END DESC,
    CASE
      WHEN p_sort_by = 'meditation_count' AND p_sort_order = 'asc' THEN us.meditation_count
    END ASC,
    CASE
      WHEN p_sort_by = 'meditation_count' AND p_sort_order = 'desc' THEN us.meditation_count
    END DESC,
    CASE
      WHEN p_sort_by = 'voice_count' AND p_sort_order = 'asc' THEN us.voice_count
    END ASC,
    CASE
      WHEN p_sort_by = 'voice_count' AND p_sort_order = 'desc' THEN us.voice_count
    END DESC,
    CASE
      WHEN p_sort_by = 'last_activity' AND p_sort_order = 'asc' THEN us.last_activity
    END ASC NULLS LAST,
    CASE
      WHEN p_sort_by = 'last_activity' AND p_sort_order = 'desc' THEN us.last_activity
    END DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_activity_stats TO authenticated;

COMMENT ON FUNCTION get_user_activity_stats IS
  'Admin-only function to get per-user activity statistics with sorting and pagination';


-- ============================================================================
-- Function: get_user_activity_summary
-- Returns aggregated activity summary metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_activity_summary()
RETURNS TABLE (
  total_active_7d BIGINT,
  total_active_30d BIGINT,
  total_meditations_7d BIGINT,
  avg_meditations_per_user NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND role = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Only admins can view user activity summary';
  END IF;

  RETURN QUERY
  WITH activity_data AS (
    SELECT
      u.id AS user_id,
      GREATEST(
        (SELECT MAX(created_at) FROM meditation_history WHERE user_id = u.id),
        (SELECT MAX(created_at) FROM voice_profiles WHERE user_id = u.id AND status != 'ARCHIVED')
      ) AS last_activity
    FROM users u
  ),
  meditation_stats AS (
    SELECT
      COUNT(*) AS total_meditations_7d,
      COUNT(DISTINCT user_id) AS users_with_meditations
    FROM meditation_history
    WHERE created_at > NOW() - INTERVAL '7 days'
  ),
  user_counts AS (
    SELECT COUNT(*) AS total_users FROM users
  )
  SELECT
    (SELECT COUNT(*) FROM activity_data WHERE last_activity > NOW() - INTERVAL '7 days')::BIGINT,
    (SELECT COUNT(*) FROM activity_data WHERE last_activity > NOW() - INTERVAL '30 days')::BIGINT,
    COALESCE(ms.total_meditations_7d, 0)::BIGINT,
    CASE
      WHEN uc.total_users > 0 THEN
        ROUND((SELECT COUNT(*)::NUMERIC FROM meditation_history) / uc.total_users, 2)
      ELSE 0
    END
  FROM meditation_stats ms, user_counts uc;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_activity_summary TO authenticated;

COMMENT ON FUNCTION get_user_activity_summary IS
  'Admin-only function to get aggregated user activity summary metrics';


-- ============================================================================
-- Log migration completion
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration: User activity RPC functions created successfully';
  RAISE NOTICE '  - get_user_activity_stats: Per-user activity with sorting';
  RAISE NOTICE '  - get_user_activity_summary: Aggregated activity metrics';
END $$;
