-- Audiência de teste para validação do cron "lembrete 1 minuto antes".
-- Data = dia da execução (CURRENT_DATE); hora = 16:05.
-- Use splegis_chave único para não conflitar com dados da API.
INSERT INTO public.audiencias (
  splegis_chave,
  titulo,
  descricao,
  data,
  hora,
  local,
  tema,
  status,
  comissao,
  vagas_disponiveis,
  inscricoes_abertas,
  link_transmissao,
  projeto_referencia,
  projeto_autores,
  projetos,
  observacao,
  convidados,
  mais_informacoes
) VALUES (
  'TESTE-MOCK-16H05',
  'Audiência: [TESTE] Mock 16h05 – validação cron 1 min',
  'Audiência fictícia para testar o lembrete faltando 1 minuto. Pode ignorar.',
  CURRENT_DATE,
  '16:05:00',
  'Sala de teste (mock)',
  'Validação de cron',
  'agendada',
  '[TESTE] Mock 16h05',
  NULL,
  true,
  NULL,
  NULL,
  NULL,
  '[]'::jsonb,
  'Lembrete de teste: disparar cron às 16:04 para validar notificação 1 min antes.',
  NULL,
  NULL
)
ON CONFLICT (splegis_chave) DO UPDATE SET
  data = CURRENT_DATE,
  hora = '16:05:00',
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  status = EXCLUDED.status,
  updated_at = now();
