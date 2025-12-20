-- Migration: Secure credit functions with auth validation
-- This migration replaces the existing credit functions with secure versions
-- that validate the authenticated user matches the target user_id

-- Drop existing functions to replace them
DROP FUNCTION IF EXISTS deduct_credits(UUID, INTEGER);
DROP FUNCTION IF EXISTS increment_clone_count(UUID);
DROP FUNCTION IF EXISTS add_tts_usage(UUID, UUID, INTEGER);

-- Secure function to deduct credits - validates auth.uid() matches p_user_id
CREATE OR REPLACE FUNCTION deduct_credits(p_user_id UUID, p_amount INTEGER)
RETURNS void AS $$
BEGIN
  -- Security check: Ensure the authenticated user is deducting from their own account
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot deduct credits from another user';
  END IF;

  -- Validate amount is positive
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount: Credits to deduct must be positive';
  END IF;

  UPDATE user_credits
  SET
    credits_used = credits_used + p_amount,
    last_updated = NOW()
  WHERE user_id = p_user_id;

  -- Verify the update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User credits record not found';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure function to increment clone count - validates auth.uid() matches p_user_id
CREATE OR REPLACE FUNCTION increment_clone_count(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_clones_created INTEGER;
  v_max_clones INTEGER := 2; -- Free tier limit
BEGIN
  -- Security check: Ensure the authenticated user is incrementing their own count
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify another user clone count';
  END IF;

  -- Check current clone count for this month
  SELECT clones_created INTO v_clones_created
  FROM voice_usage_limits
  WHERE user_id = p_user_id
    AND month_start = DATE_TRUNC('month', CURRENT_DATE);

  -- Validate against limit (unless they have unlimited - check user_credits)
  IF v_clones_created IS NOT NULL AND v_clones_created >= v_max_clones THEN
    -- Check if user has premium/unlimited plan
    IF NOT EXISTS (
      SELECT 1 FROM user_credits
      WHERE user_id = p_user_id
      AND (monthly_limit IS NULL OR monthly_limit > 10000)
    ) THEN
      RAISE EXCEPTION 'Monthly clone limit reached';
    END IF;
  END IF;

  INSERT INTO voice_usage_limits (user_id, month_start, clones_created)
  VALUES (p_user_id, DATE_TRUNC('month', CURRENT_DATE), 1)
  ON CONFLICT (user_id, month_start)
  DO UPDATE SET
    clones_created = voice_usage_limits.clones_created + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure function to add TTS credits usage - validates auth.uid() matches p_user_id
CREATE OR REPLACE FUNCTION add_tts_usage(p_user_id UUID, p_voice_profile_id UUID, p_credits_consumed INTEGER)
RETURNS void AS $$
DECLARE
  v_available_credits INTEGER;
BEGIN
  -- Security check: Ensure the authenticated user is adding usage to their own account
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify another user TTS usage';
  END IF;

  -- Validate amount is positive
  IF p_credits_consumed <= 0 THEN
    RAISE EXCEPTION 'Invalid amount: Credits consumed must be positive';
  END IF;

  -- Verify voice profile belongs to user (if provided)
  IF p_voice_profile_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM voice_profiles
      WHERE id = p_voice_profile_id AND user_id = p_user_id
    ) THEN
      RAISE EXCEPTION 'Voice profile not found or does not belong to user';
    END IF;
  END IF;

  -- Check available credits before deducting
  SELECT (monthly_limit - credits_used) INTO v_available_credits
  FROM user_credits
  WHERE user_id = p_user_id;

  IF v_available_credits IS NULL THEN
    RAISE EXCEPTION 'User credits record not found';
  END IF;

  IF v_available_credits < p_credits_consumed THEN
    RAISE EXCEPTION 'Insufficient credits: Need %, have %', p_credits_consumed, v_available_credits;
  END IF;

  -- Update monthly usage
  INSERT INTO voice_usage_limits (user_id, month_start, credits_used)
  VALUES (p_user_id, DATE_TRUNC('month', CURRENT_DATE), p_credits_consumed)
  ON CONFLICT (user_id, month_start)
  DO UPDATE SET
    credits_used = voice_usage_limits.credits_used + p_credits_consumed;

  -- Update user credits
  UPDATE user_credits
  SET
    credits_used = credits_used + p_credits_consumed,
    last_updated = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION deduct_credits(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_clone_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_tts_usage(UUID, UUID, INTEGER) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION deduct_credits IS 'Securely deduct credits from authenticated user account. Validates auth.uid() matches p_user_id.';
COMMENT ON FUNCTION increment_clone_count IS 'Securely increment voice clone count for authenticated user. Validates auth.uid() and monthly limits.';
COMMENT ON FUNCTION add_tts_usage IS 'Securely add TTS usage for authenticated user. Validates auth.uid(), credits balance, and voice profile ownership.';
