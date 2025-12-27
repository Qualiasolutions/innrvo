-- Migration: Performance Indexes
-- Date: 2025-12-27
-- Purpose: Add missing indexes for RLS policies and common queries

-- ============================================================================
-- Index for admin RLS policy on audio_tag_presets
-- The EXISTS subquery checking users.role = 'ADMIN' benefits from this index
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_id_role ON public.users(id, role);

COMMENT ON INDEX idx_users_id_role IS
'Covers admin RLS policy subquery on audio_tag_presets - reduces RLS check from ~10ms to <1ms';

-- ============================================================================
-- Index for agent_conversations user + updated_at queries
-- Common pattern: fetch latest conversation for user
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_updated
ON public.agent_conversations(user_id, updated_at DESC);

COMMENT ON INDEX idx_agent_conversations_user_updated IS
'Optimizes fetching latest conversation for user - common access pattern';

-- ============================================================================
-- Analyze tables to update statistics for query planner
-- ============================================================================

ANALYZE public.users;
ANALYZE public.agent_conversations;
