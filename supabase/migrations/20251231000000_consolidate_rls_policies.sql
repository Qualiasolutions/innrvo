-- Consolidate Multiple Permissive RLS Policies
-- Fixes performance issue where multiple permissive policies for same role/action
-- causes PostgreSQL to evaluate ALL policies for every query.
-- Solution: Merge admin checks into user policies with OR logic.

BEGIN;

-- ============================================================================
-- AUDIO_TAG_PRESETS: Consolidate admin + user policies
-- ============================================================================

-- Drop duplicate admin policies (the user policies already have admin checks)
DROP POLICY IF EXISTS "Admins can view all audio tag presets" ON audio_tag_presets;
DROP POLICY IF EXISTS "Admins can insert audio tag presets" ON audio_tag_presets;
DROP POLICY IF EXISTS "Admins can update audio tag presets" ON audio_tag_presets;
DROP POLICY IF EXISTS "Admins can delete audio tag presets" ON audio_tag_presets;

-- The existing policies already have admin logic:
-- audio_tag_presets_select: (is_active = true) OR admin_check
-- audio_tag_presets_insert/update/delete: admin_check
-- So no changes needed to those policies.

-- ============================================================================
-- MEDITATION_HISTORY: Consolidate admin + user policies
-- ============================================================================

-- Drop separate admin policies
DROP POLICY IF EXISTS "Admins can view all meditation history" ON meditation_history;
DROP POLICY IF EXISTS "Admins can delete any meditation" ON meditation_history;

-- Recreate user policies with OR is_admin()
DROP POLICY IF EXISTS "meditation_history_select_own" ON meditation_history;
CREATE POLICY "meditation_history_select_own" ON meditation_history
  FOR SELECT USING (
    (SELECT auth.uid()) = user_id
    OR is_admin()
  );

DROP POLICY IF EXISTS "meditation_history_delete_own" ON meditation_history;
CREATE POLICY "meditation_history_delete_own" ON meditation_history
  FOR DELETE USING (
    (SELECT auth.uid()) = user_id
    OR is_admin()
  );

-- ============================================================================
-- USERS: Consolidate admin + user policies
-- ============================================================================

-- Drop separate admin policy
DROP POLICY IF EXISTS "Admins can view all user profiles" ON users;

-- Recreate user policy with OR is_admin()
DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (
    (SELECT auth.uid()) = id
    OR is_admin()
  );

-- ============================================================================
-- VOICE_PROFILES: Consolidate admin + user policies
-- ============================================================================

-- Drop separate admin policies
DROP POLICY IF EXISTS "Admins can view all voice profiles" ON voice_profiles;
DROP POLICY IF EXISTS "Admins can update any voice profile" ON voice_profiles;
DROP POLICY IF EXISTS "Admins can delete any voice profile" ON voice_profiles;

-- Recreate user policies with OR is_admin()
DROP POLICY IF EXISTS "voice_profiles_select" ON voice_profiles;
CREATE POLICY "voice_profiles_select" ON voice_profiles
  FOR SELECT USING (
    (SELECT auth.uid()) = user_id
    OR is_voice_profile_public(id)
    OR is_admin()
  );

DROP POLICY IF EXISTS "voice_profiles_update_own" ON voice_profiles;
CREATE POLICY "voice_profiles_update_own" ON voice_profiles
  FOR UPDATE USING (
    (SELECT auth.uid()) = user_id
    OR is_admin()
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    OR is_admin()
  );

DROP POLICY IF EXISTS "voice_profiles_delete_own" ON voice_profiles;
CREATE POLICY "voice_profiles_delete_own" ON voice_profiles
  FOR DELETE USING (
    (SELECT auth.uid()) = user_id
    OR is_admin()
  );

COMMIT;

-- Add comment for documentation
COMMENT ON POLICY "meditation_history_select_own" ON meditation_history IS 'Users can view own meditations, admins can view all';
COMMENT ON POLICY "meditation_history_delete_own" ON meditation_history IS 'Users can delete own meditations, admins can delete any';
COMMENT ON POLICY "users_select_own" ON users IS 'Users can view own profile, admins can view all';
COMMENT ON POLICY "voice_profiles_select" ON voice_profiles IS 'Users can view own/public profiles, admins can view all';
COMMENT ON POLICY "voice_profiles_update_own" ON voice_profiles IS 'Users can update own profiles, admins can update any';
COMMENT ON POLICY "voice_profiles_delete_own" ON voice_profiles IS 'Users can delete own profiles, admins can delete any';
