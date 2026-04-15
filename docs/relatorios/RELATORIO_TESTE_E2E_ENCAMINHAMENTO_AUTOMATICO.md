# Relatorio Tecnico - Teste E2E Encaminhamento Automatico (OS-06)

## Contexto

Tarefa `#5457170`:
- validar fluxo E2E de encaminhamento inteligente para demandas negativas;
- cobrir gatilho de nota baixa (`<= 2`);
- validar oferta de encaminhamento no chatbot;
- confirmar encaminhamento com sucesso para sugestao apresentada.

## Arquivo implementado

- `tests/e2e/referral-auto.spec.ts`

## Estrategia de teste

O teste valida ponta a ponta da interface, com estabilizacao de partes externas:
- login reutilizando helper existente (`e2eLogin`);
- mock do `ai-orchestrator` para resposta deterministica de nota baixa e oferta de encaminhamento;
- mock de sugestao de vereador/comissao (`fetch-vereadores` e `suggest-council-members`);
- validacao de sucesso de encaminhamento no wizard e confirmacao do `council_member_id` enviado para persistencia.

Para garantir permissao de encaminhamento no ambiente de teste, o spec garante papel compativel (`cidadao_engajado`) via chamada autenticada com chave de servico, sem alterar arquivos compartilhados de configuracao.

## Criterios de aceite x cobertura

- **Spec simula avaliacao com nota baixa (`<= 2`)**: atendido.
- **Valida exibicao da oferta de encaminhamento no chatbot**: atendido.
- **Confirma encaminhamento com sucesso para sugestao correta**: atendido (UI de sucesso + verificacao do `council_member_id` encaminhado).

## Evidencias de execucao

Comando executado:

```bash
CI= CAMARA_URL="https://vjzkzsczlbtmrzewffdx.supabase.co" \
CAMARA_PUBLISHABLE_KEY="***" \
VITE_SUPABASE_URL="https://vjzkzsczlbtmrzewffdx.supabase.co" \
VITE_SUPABASE_PUBLISHABLE_KEY="***" \
VITE_SUPABASE_PROJECT_ID="vjzkzsczlbtmrzewffdx" \
VITE_GOOGLE_MAPS_API_KEY="***" \
SUPABASE_URL="https://vjzkzsczlbtmrzewffdx.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="***" \
npx playwright test tests/e2e/referral-auto.spec.ts --project=chromium --workers=1 --retries=0
```

Resultado:
- `1 passed`

Regressao relacionada (spec existente de transporte):
- `tests/e2e/transport-conversational.spec.ts` -> `2 passed`.

## Observacoes

- O conjunto `tests/e2e/evaluation-conversational.spec.ts` apresentou falhas de ambiente/dados em `servicos-proximos` e nao foi alterado nesta entrega.
- O escopo da OS-06 foi entregue com spec dedicado e validado.
