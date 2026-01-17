-- Migration: Fix O(n²) performance issue in get_user_activity_summary
-- The original version had correlated subqueries that ran once per user row.
-- This version uses JOINs for O(n) performance.

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
  WITH
  -- Pre-aggregate meditation stats per user (O(n) instead of O(n²) subquery)
  meditation_last_activity AS (
    SELECT
      user_id,
      MAX(created_at) AS last_meditation
    FROM meditation_history
    GROUP BY user_id
  ),
  -- Pre-aggregate voice profile stats per user
  voice_last_activity AS (
    SELECT
      user_id,
      MAX(created_at) AS last_voice
    FROM voice_profiles
    WHERE status != 'ARCHIVED'
    GROUP BY user_id
  ),
  -- Combine activity data with JOIN instead of correlated subqueries
  activity_data AS (
    SELECT
      u.id AS user_id,
      GREATEST(m.last_meditation, v.last_voice) AS last_activity
    FROM users u
    LEFT JOIN meditation_last_activity m ON m.user_id = u.id
    LEFT JOIN voice_last_activity v ON v.user_id = u.id
  ),
  -- Recent meditation stats
  meditation_stats AS (
    SELECT
      COUNT(*) AS total_meditations_7d
    FROM meditation_history
    WHERE created_at > NOW() - INTERVAL '7 days'
  ),
  -- User counts
  user_counts AS (
    SELECT COUNT(*) AS total_users FROM users
  ),
  -- Total meditations count
  total_meditations AS (
    SELECT COUNT(*) AS cnt FROM meditation_history
  )
  SELECT
    (SELECT COUNT(*)::BIGINT FROM activity_data WHERE last_activity > NOW() - INTERVAL '7 days'),
    (SELECT COUNT(*)::BIGINT FROM activity_data WHERE last_activity > NOW() - INTERVAL '30 days'),
    COALESCE(ms.total_meditations_7d, 0)::BIGINT,
    CASE
      WHEN uc.total_users > 0 THEN
        ROUND(tm.cnt::NUMERIC / uc.total_users, 2)
      ELSE 0
    END
  FROM meditation_stats ms, user_counts uc, total_meditations tm;
END;
$$;

-- Add comment documenting the performance fix
COMMENT ON FUNCTION get_user_activity_summary IS
'Admin-only function to get aggregated user activity summary metrics.
Performance: Uses JOINs instead of correlated subqueries for O(n) complexity.
Fixed in migration 20260117000000.';

DO $$
BEGIN
  RAISE NOTICE 'Migration: Fixed get_user_activity_summary O(n²) → O(n) performance';
END $$;
