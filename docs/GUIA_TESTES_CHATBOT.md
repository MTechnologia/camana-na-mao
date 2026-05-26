# Guia de testes do chatbot (Câmara na Mão)

Bateria automatizada em **4 camadas** para garantir que o assistente compreende variações de linguagem do munícipe (typos, gíria, abreviações) em **todas as jornadas**.

## Estrutura

```
tests/chatbot/
  corpus-loader.ts
  turn-contract-utils.ts
  corpus/
    *-intent.json              # Fase 1 — detecção de jornada
    nlp-*.json                 # Fase 1 — parsers
    turn-accumulate.json         # Fase 2 — acumulação de campos
    turn-next-field.json         # Fase 2 — próximo campo
    turn-auto-create.json        # Fase 2 — validação determinística
  reports/                     # Fase 4 — relatórios HTML/JSON (gerados)

supabase/functions/ai-orchestrator/
  lib-intent-detection.corpus.test.ts
  lib-nlp-utils.corpus.test.ts
  lib-turn-contract.corpus.test.ts

tests/e2e/
  chatbot-typo-urban.spec.ts     # Fase 3
  chatbot-typo-transport.spec.ts   # Fase 3
  fixtures/chatbot-typo-scenarios.ts
  _helpers/chatOrchestratorMock.ts

scripts/
  chatbot-eval-nightly.mjs       # Fase 4
```

## Comandos

```bash
# Fase 1+2 — suíte Deno completa (CI)
npm run test:chatbot

npm run test:chatbot:intent      # só intenção (~95 casos)
npm run test:chatbot:nlp         # só NLP
npm run test:chatbot:contract    # só contrato de turno

# Fase 3 — E2E com mock SSE (estável, sem LLM)
npm run test:chatbot:e2e

# Relatório completo evidenciado (Deno + E2E + corpus)
npm run test:chatbot:report

# Só regenerar o HTML (com paginação em intenção/NLP/contrato), sem rodar testes
npm run test:chatbot:report:html

# Fase 4 — noturno: Deno + relatório HTML
npm run test:chatbot:nightly

# Live opcional (orchestrator real — requer JWT de teste)
CHATBOT_EVAL_LIVE=1 CHATBOT_EVAL_JWT=<token> npm run test:chatbot:nightly
```

## Fase 1 — Intenção e NLP

| Camada | Valida |
|--------|--------|
| Intenção | `detectCollectionIntent` → jornada correta |
| NLP | `isAffirmativeResponse`, horário flexível, `parseFieldResponse` |

Jornadas: `urban_report`, `transport_report`, `service_rating`, `services`, `audiencias`, `history`, `general`, `occupancy`, `vereadores`, `noticias`, Olho Vivo → `general`.

## Fase 2 — Contrato de turno

Valida o protocolo UI ↔ backend:

- `[COLLECTION_PROGRESS:journey:{json}]`
- `[FIELD_REQUEST:campo]`
- Pickers (`[LINE_PICKER]`, `[SUBCATEGORY_PICKER:...]`)
- `accumulateFieldsFromHistory` com typos
- `getNextMissingField` após estado parcial
- `handleDeterministicTransportAutoCreate` (subcategoria inválida)

Adicione casos em `turn-accumulate.json`, `turn-next-field.json` ou `turn-auto-create.json`.

## Fase 3 — E2E Playwright

Specs com **mock** do `ai-orchestrator` (sem custo/flakiness de LLM):

- `chatbot-typo-urban.spec.ts` — abertura com gíria/typos
- `chatbot-typo-transport.spec.ts` — fluxo completo com `7h5`, `td semana`, etc.

Requer `.env.e2e.local` com credenciais de teste (mesmo padrão dos outros E2E).

## Fase 4 — Avaliação noturna

`scripts/chatbot-eval-nightly.mjs`:

1. Executa toda a suíte Deno
2. Grava `tests/chatbot/reports/report-<timestamp>.html` e `.json`
3. Com `CHATBOT_EVAL_LIVE=1`, envia 3 mensagens de amostra ao orchestrator deployado

Agende no CI (cron) ou rode antes de release:

```yaml
- run: npm run test:chatbot:nightly
```

## Adicionar caso de produção

1. Reproduza a frase exata do munícipe.
2. **Intenção errada?** → `corpus/*-intent.json`
3. **Campo não extraído?** → `turn-accumulate.json` ou `nlp-field-parsing.json`
4. **Pergunta errada no fluxo?** → `turn-next-field.json`
5. Rode `npm run test:chatbot` e corrija código ou corpus.

## CI recomendado

```yaml
- run: npm run test:chatbot
# opcional em job separado com secrets E2E:
- run: npm run test:chatbot:e2e
```

Requisitos: Node.js + `npx deno` no runner.
