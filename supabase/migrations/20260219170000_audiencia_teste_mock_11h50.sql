-- Atualiza a audiência de teste para 11h50 (validação do cron 1 min antes às 11:49).
UPDATE public.audiencias
SET
  data = CURRENT_DATE,
  hora = '11:50:00',
  titulo = 'Audiência: [TESTE] Mock 11h50 – validação cron 1 min',
  descricao = 'Audiência fictícia para testar o lembrete faltando 1 minuto. Pode ignorar.',
  observacao = 'Lembrete de teste: disparar cron às 11:49 para validar notificação 1 min antes.',
  comissao = '[TESTE] Mock 11h50',
  updated_at = now()
WHERE splegis_chave = 'TESTE-MOCK-16H05';
