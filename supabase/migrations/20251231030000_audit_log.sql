-- Migration: Add audit logging for admin operations
-- Purpose: Track admin actions for security compliance and debugging

-- Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE', 'ADMIN_DELETE', 'ADMIN_VIEW', 'DATA_EXPORT')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  request_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add comment
COMMENT ON TABLE audit_log IS 'Tracks admin operations and sensitive actions for security compliance';

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_id ON audit_log(admin_id) WHERE admin_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_operation ON audit_log(operation);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON audit_log(record_id) WHERE record_id IS NOT NULL;

-- Composite index for common admin queries
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_lookup
  ON audit_log(admin_id, created_at DESC)
  WHERE admin_id IS NOT NULL;

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'ADMIN'
    )
  );

-- Only authenticated users can insert (via RPC functions)
CREATE POLICY "System can insert audit logs"
  ON audit_log
  FOR INSERT
  WITH CHECK (true);

-- No one can update or delete audit logs (immutable)
-- (No UPDATE or DELETE policies = denied by default with RLS enabled)

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  p_table_name TEXT,
  p_record_id UUID,
  p_operation TEXT,
  p_target_user_id UUID DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_request_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_audit_id UUID;
BEGIN
  -- Get current user (admin performing the action)
  v_admin_id := auth.uid();

  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = v_admin_id AND role = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Only admins can log admin actions';
  END IF;

  -- Insert audit record
  INSERT INTO audit_log (
    table_name,
    record_id,
    operation,
    user_id,
    admin_id,
    old_data,
    new_data,
    request_id
  ) VALUES (
    p_table_name,
    p_record_id,
    p_operation,
    p_target_user_id,
    v_admin_id,
    p_old_data,
    p_new_data,
    p_request_id
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION log_admin_action TO authenticated;

-- Function to get recent admin activity (for admin dashboard)
CREATE OR REPLACE FUNCTION get_recent_admin_activity(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  table_name TEXT,
  record_id UUID,
  operation TEXT,
  target_user_email TEXT,
  admin_email TEXT,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ
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
    RAISE EXCEPTION 'Only admins can view admin activity';
  END IF;

  RETURN QUERY
  SELECT
    al.id,
    al.table_name,
    al.record_id,
    al.operation,
    target_user.email AS target_user_email,
    admin_user.email AS admin_email,
    al.old_data,
    al.new_data,
    al.created_at
  FROM audit_log al
  LEFT JOIN users target_user ON al.user_id = target_user.id
  LEFT JOIN users admin_user ON al.admin_id = admin_user.id
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_recent_admin_activity TO authenticated;

-- Data retention: Auto-delete audit logs older than 2 years (GDPR compliance)
-- Note: Requires pg_cron extension to be enabled in Supabase Dashboard
-- SELECT cron.schedule('cleanup-old-audit-logs', '0 3 * * 0',
--   $$ DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '2 years' $$
-- );
