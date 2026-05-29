-- CHB-026: coluna metadata para journey_snapshot (complementa append_ai_conversation_message da 20260529120000).

ALTER TABLE public.ai_conversations
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.ai_conversations.metadata IS
  'Metadados da conversa (ex.: journey_snapshot.v1 para retomada do tracker).';
