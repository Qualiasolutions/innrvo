-- Migration: Add audio tags support
-- This adds columns to store user audio tag preferences and tracks usage in meditation history

-- Add audio_tags column to meditation_history to track which tags were used
ALTER TABLE meditation_history
ADD COLUMN IF NOT EXISTS audio_tags_used TEXT[] DEFAULT '{}';

-- Add audio tag preferences to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS audio_tag_preferences JSONB DEFAULT '{"enabled": false, "favorite_tags": []}'::jsonb;

-- Create audio_tag_presets table for admin-managed tag definitions (optional, for future extensibility)
CREATE TABLE IF NOT EXISTS audio_tag_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_key VARCHAR(50) UNIQUE NOT NULL,
  tag_label VARCHAR(100) NOT NULL,
  tag_description TEXT,
  category VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE audio_tag_presets ENABLE ROW LEVEL SECURITY;

-- Everyone can read active presets
CREATE POLICY "Anyone can read active audio tag presets"
ON audio_tag_presets FOR SELECT
USING (is_active = true);

-- Only admins can modify presets
CREATE POLICY "Admins can manage audio tag presets"
ON audio_tag_presets FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  )
);

-- Insert default audio tag presets
INSERT INTO audio_tag_presets (tag_key, tag_label, tag_description, category, sort_order) VALUES
  ('short_pause', '[short pause]', 'A brief 1-2 second pause', 'pauses', 1),
  ('long_pause', '[long pause]', 'A longer 3-5 second pause', 'pauses', 2),
  ('silence', '[silence]', 'A moment of complete silence', 'pauses', 3),
  ('inhale', '[inhale]', 'Sound of breathing in deeply', 'breathing', 1),
  ('exhale', '[exhale]', 'Sound of breathing out slowly', 'breathing', 2),
  ('deep_breath', '[deep breath]', 'A full deep breath cycle', 'breathing', 3),
  ('whisper', '[whisper]', 'Speak in a soft whisper', 'voice', 1),
  ('soft_voice', '[soft voice]', 'Speak very gently', 'voice', 2),
  ('gentle_giggle', '[gentle giggle]', 'A soft, warm laugh', 'sounds', 1),
  ('sigh', '[sigh]', 'A relaxing sigh', 'sounds', 2),
  ('hum', '[hum]', 'A gentle humming sound', 'sounds', 3)
ON CONFLICT (tag_key) DO NOTHING;
