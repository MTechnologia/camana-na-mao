-- Adicionar colunas para suportar múltiplas jornadas na tabela ai_conversations
ALTER TABLE ai_conversations 
  ADD COLUMN journey_id TEXT DEFAULT 'general',
  ADD COLUMN title TEXT,
  ADD COLUMN status TEXT DEFAULT 'active';

-- Índice para busca rápida por usuário + jornada + status
CREATE INDEX idx_ai_conversations_user_journey 
  ON ai_conversations(user_id, journey_id, status);

-- Comentários para documentação
COMMENT ON COLUMN ai_conversations.journey_id IS 'ID da jornada AI (general, urban_report, transport, evaluate, plan, services)';
COMMENT ON COLUMN ai_conversations.title IS 'Título auto-gerado da conversa baseado no primeiro contexto';
COMMENT ON COLUMN ai_conversations.status IS 'Status da conversa: active ou archived';