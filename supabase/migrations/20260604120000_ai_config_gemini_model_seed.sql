-- Alinha model_id das versões de IA ao Gemini em uso no Vertex (AI_CHAT_MODEL).
-- O ai-orchestrator usa model_id da versão ativa quando preenchido.

UPDATE public.ai_config_versions
SET model_id = 'gemini-3.1-flash-lite-preview'
WHERE model_id = 'gpt-4o-mini';

COMMENT ON COLUMN public.ai_config_versions.model_id IS
  'ID do modelo LLM (ex.: gemini-3.1-flash-lite-preview). Usado pelo ai-orchestrator na versão ativa; fallback: secret AI_CHAT_MODEL.';
