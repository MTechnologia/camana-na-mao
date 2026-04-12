# Relatorio tecnico - Teste E2E diagnostico de transporte

## Escopo validado

Implementado teste E2E conversacional para o fluxo completo de diagnostico colaborativo de transporte, com foco em coleta de campos novos:

- horario da ocorrencia (`occurrence_time`)
- sentido da viagem (`direction`)
- frequencia/recorrencia (`recurrence_frequency`)
- subcategoria no resumo final (`Tipo: categoria - subcategoria`)
- impacto (mensagem de impacto fornecida pelo usuario antes da conclusao)

## Entregaveis implementados

- Spec E2E: `tests/e2e/transport-conversational.spec.ts`
- Fixtures de linhas: `tests/e2e/fixtures/transport-lines.ts`

## Estrategia de teste

- Login reutilizando helper existente (`e2eLogin`).
- Inicio da jornada em `/?journey=transport_report`.
- Mock de busca de linhas via rota Supabase `**/rest/v1/transport_lines*` para garantir previsibilidade.
- Mock do orquestrador conversacional via rota `**/functions/v1/ai-orchestrator` (SSE), para estabilizar o fluxo e evitar variacao do backend/LLM durante o E2E.
- Dois cenarios condicionais por tipo de problema:
  - atraso recorrente (sentido ida)
  - conducao insegura recorrente (sentido volta)
- Interacoes com componentes inline:
  - `LINE_PICKER` (busca e selecao de linha)
  - coleta guiada de data, horario, sentido e recorrencia (com fallback textual quando necessario)
- Confirmacao final por validacao textual do resumo exibido ao usuario.

## Evidencias esperadas no resumo final

- Linha com tipo e subcategoria: `Tipo: <categoria> - <subcategoria>`
- Linha de horario: `Horario: ...`
- Linha de sentido: `Sentido: ...`
- Linha de frequencia: `Frequencia: ...`
- Linha de gravidade inferida: `Gravidade: ...`

## Resultado da execucao

- Execucao local validada com:

```bash
CI= npx playwright test tests/e2e/transport-conversational.spec.ts --project=chromium --workers=1 --retries=0
```

- Resultado observado: `2 passed`.

## Comando para execucao

```bash
npx playwright test tests/e2e/transport-conversational.spec.ts --project=chromium --headed
```

## Laudo

- O fluxo automatizado cobre a coleta sequencial dos campos estruturados novos e valida que eles aparecem no resumo de confirmacao do relato.
- A busca/selecao de linha ficou desacoplada de dados variaveis de ambiente por fixture dedicada.
- Os cenarios exercitam comportamento condicional por tipo de problema, mantendo o padrao atual dos testes E2E do projeto.
- O teste atual valida de forma deterministica a jornada conversacional de transporte (com mocks de infraestrutura de chat e de linhas), reduzindo falsos negativos causados por variacao do backend em tempo real.
