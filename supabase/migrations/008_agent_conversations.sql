-- Migration for AI Agent Conversations
-- Stores conversation history with the meditation agent

-- Create agent_conversations table
CREATE TABLE IF NOT EXISTS agent_conversations (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]'::jsonb NOT NULL,
  preferences JSONB DEFAULT '{}'::jsonb NOT NULL,
  session_state JSONB DEFAULT '{}'::jsonb NOT NULL,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_id ON agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_created_at ON agent_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_created ON agent_conversations(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own conversations
CREATE POLICY "Users can view own conversations" ON agent_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations" ON agent_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON agent_conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON agent_conversations
  FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_agent_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
CREATE TRIGGER update_agent_conversations_updated_at
  BEFORE UPDATE ON agent_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_conversation_timestamp();

-- Add comment for documentation
COMMENT ON TABLE agent_conversations IS 'Stores conversation history with the AI meditation agent';
COMMENT ON COLUMN agent_conversations.messages IS 'Array of conversation messages with role, content, timestamp, and metadata';
COMMENT ON COLUMN agent_conversations.preferences IS 'User preferences for this conversation (preferred traditions, teachers, etc.)';
COMMENT ON COLUMN agent_conversations.session_state IS 'Session state including current mood, selected meditation type, etc.';
COMMENT ON COLUMN agent_conversations.summary IS 'Auto-generated summary of the conversation for display in history';
