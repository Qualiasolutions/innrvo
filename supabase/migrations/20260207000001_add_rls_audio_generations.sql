-- ============================================================================
-- Add RLS to audio_generations table
-- This table stores user TTS generation records (user_id, text, model_id)
-- Previously had no RLS policies, allowing any authenticated user access
-- ============================================================================

ALTER TABLE public.audio_generations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own audio generations
CREATE POLICY "audio_generations_select_own"
  ON public.audio_generations
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- Users can only insert their own audio generations
CREATE POLICY "audio_generations_insert_own"
  ON public.audio_generations
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- Users can only delete their own audio generations
CREATE POLICY "audio_generations_delete_own"
  ON public.audio_generations
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- Admin can access all audio generations
CREATE POLICY "audio_generations_admin_all"
  ON public.audio_generations
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
