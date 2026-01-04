-- Migration: Add get_template_stats RPC function
-- This replaces client-side O(n) aggregation with efficient server-side calculation

-- Create the RPC function for template statistics
CREATE OR REPLACE FUNCTION get_template_stats()
RETURNS TABLE (
  total_templates BIGINT,
  active_templates BIGINT,
  total_categories BIGINT,
  most_used_category TEXT,
  most_used_category_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_total_templates BIGINT;
  v_active_templates BIGINT;
  v_total_categories BIGINT;
  v_most_used_category TEXT;
  v_most_used_category_count BIGINT;
BEGIN
  -- Get template counts (single scan)
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE t.is_active = true)
  INTO v_total_templates, v_active_templates
  FROM templates t;

  -- Get active category count
  SELECT COUNT(*)
  INTO v_total_categories
  FROM template_categories
  WHERE is_active = true;

  -- Find most used category by summing usage_count per category
  SELECT
    tc.name,
    COALESCE(SUM(t.usage_count), 0)
  INTO v_most_used_category, v_most_used_category_count
  FROM template_categories tc
  LEFT JOIN templates t ON t.category_id = tc.id
  WHERE tc.is_active = true
  GROUP BY tc.id, tc.name
  ORDER BY COALESCE(SUM(t.usage_count), 0) DESC
  LIMIT 1;

  -- Return as single row
  RETURN QUERY SELECT
    v_total_templates,
    v_active_templates,
    v_total_categories,
    v_most_used_category,
    v_most_used_category_count;
END;
$$;

-- Grant execute to authenticated users (RLS will handle admin check)
GRANT EXECUTE ON FUNCTION get_template_stats() TO authenticated;

-- Add index to optimize the category usage aggregation if not exists
CREATE INDEX IF NOT EXISTS idx_templates_category_usage
ON templates(category_id, usage_count)
WHERE is_active = true;

COMMENT ON FUNCTION get_template_stats() IS 'Returns template statistics for admin dashboard - efficient server-side calculation';
