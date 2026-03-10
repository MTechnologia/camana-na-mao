-- Mock para teste do lembrete D-1 (24h antes): data = amanhã, hora = 11:00.
-- Dispare audiencia-reminder-d1 com for_date = (CURRENT_DATE + 1) para enviar "Lembrete: audiência amanhã".
UPDATE public.audiencias
SET
  data = CURRENT_DATE + 1,
  hora = '11:00:00',
  titulo = 'Audiência: [TESTE] Mock amanhã 11h – validação lembrete D-1',
  descricao = 'Audiência fictícia para testar o lembrete 24h antes (D-1). Pode ignorar.',
  observacao = 'Lembrete de teste: chamar audiencia-reminder-d1 com for_date=amanhã para validar notificação D-1.',
  comissao = '[TESTE] Mock amanhã 11h',
  updated_at = now()
WHERE splegis_chave = 'TESTE-MOCK-16H05';
