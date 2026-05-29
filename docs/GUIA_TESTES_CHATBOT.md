# Guia de testes do chatbot (Câmara na Mão)

Bateria automatizada em **4 camadas**, com cobertura transversal de conversação robusta, para garantir que o assistente compreende variações de linguagem do munícipe: typos, gíria, abreviações, baixa escrita, áudio transcrito, frustração, ofensa direta e risco.

**Teste manual completo (checklist para QA/PO):** [MANUAL_TESTE_CHATBOT_COMPLETO.md](./MANUAL_TESTE_CHATBOT_COMPLETO.md)

## Estrutura

```text
tests/chatbot/
  corpus-loader.ts
  turn-contract-utils.ts
  corpus/
    *-intent.json                # Fase 1 - detecção de jornada
    conversation-robust-intent.json # perfis reais de linguagem
    nlp-*.json                   # Fase 1 - parsers
    turn-accumulate.json         # Fase 2 - acumulação de campos
    turn-next-field.json         # Fase 2 - próximo campo
    turn-auto-create.json        # Fase 2 - validação determinística
  reports/                       # Fase 4 - relatórios HTML/JSON

supabase/functions/ai-orchestrator/
  lib-intent-detection.corpus.test.ts
  lib-nlp-utils.corpus.test.ts
  lib-turn-contract.corpus.test.ts
  lib-conversation-tone.test.ts

src/lib/
  *Rating*.test.ts
  gpsAccuracy.test.ts
  phoneMask.test.ts
  promiseTimeout.test.ts
  formatUserMessageHidingGpsLine.test.ts

tests/e2e/
  chatbot-typo-urban.spec.ts
  chatbot-typo-transport.spec.ts
  chat-journey-switch.spec.ts
  fixtures/chatbot-typo-scenarios.ts
  _helpers/chatOrchestratorMock.ts

scripts/
  chatbot-full-report.mjs
  chatbot-eval-nightly.mjs
```

## Comandos

```bash
# Fase 1+2 - suíte Deno completa (CI)
npm run test:chatbot

npm run test:chatbot:intent
npm run test:chatbot:nlp
npm run test:chatbot:contract

# Fase 3 - E2E com mock SSE (estável, sem LLM)
npm run test:chatbot:e2e

# Relatório completo evidenciado (Deno + Vitest complementar + E2E + corpus)
npm run test:chatbot:report

# Só regenerar o HTML, sem rodar testes
npm run test:chatbot:report:html

# Fase 4 - noturno
npm run test:chatbot:nightly

# Live opcional (orchestrator real - requer JWT de teste)
CHATBOT_EVAL_LIVE=1 CHATBOT_EVAL_JWT=<token> npm run test:chatbot:nightly
```

## Fase 1 - Intenção, NLP E Tom

| Camada | Valida |
|--------|--------|
| Intenção | `detectCollectionIntent` -> jornada correta |
| NLP | `isAffirmativeResponse`, horário flexível, `parseFieldResponse` |
| Tom | `analyzeConversationTone` e instrução para frustração, ofensa direta e risco |

Jornadas: `urban_report`, `transport_report`, `service_rating`, `services`, `audiencias`, `history`, `general`, `occupancy`, `vereadores`, `noticias`, Olho Vivo -> `general`.

### Cobertura conversacional robusta

`conversation-robust-intent.json` cobre perfis que aparecem em produção:

- `baixa_escrita`, `girias`, `audio_transcrito`
- `ofensivo_sobre_problema`: palavrão sobre a situação; classifica e continua
- `ofensivo_direto`: insulto ao app/bot/atendimento; adverte brevemente e continua
- `risco`: risco imediato; orienta canal emergencial e continua a coleta quando aplicável
- `intencao_mista`: mais de um assunto na mesma fala

O helper `lib-conversation-tone.ts` injeta instrução de tom no prompt dinâmico para preservar a política **advertir e seguir** sem encerrar a jornada.

## Fase 2 - Contrato De Turno

Valida o protocolo UI <-> backend:

- `[COLLECTION_PROGRESS:journey:{json}]`
- `[FIELD_REQUEST:campo]`
- Pickers (`[LINE_PICKER]`, `[SUBCATEGORY_PICKER:...]`)
- `accumulateFieldsFromHistory` com typos, frustração e mensagens incompletas
- `getNextMissingField` após estado parcial
- `handleDeterministicTransportAutoCreate` (subcategoria inválida)

Adicione casos em `turn-accumulate.json`, `turn-next-field.json` ou `turn-auto-create.json`.

## Cobertura Complementar - Vitest

O relatório completo também executa testes unitários de apoio em `src/lib/` para comportamentos usados no fluxo conversacional: limpeza de mensagens com GPS, máscara de telefone, timeout de promises, prazo de avaliação, dimensões de avaliação, referral e revisão de comentário.

## Fase 3 - E2E Playwright

Specs com **mock** do `ai-orchestrator`:

- `chatbot-typo-urban.spec.ts` - abertura com gíria/typos, frustração e ofensa direta
- `chatbot-typo-transport.spec.ts` - fluxo completo com `7h5`, `td semana`, baixa escrita e risco

Requer `.env.e2e.local` com credenciais de teste. O relatório completo anexa screenshots das execuções e permite abrir cada imagem em lightbox.

## Fase 4 - Relatórios E Avaliação Noturna

`scripts/chatbot-full-report.mjs` gera relatório HTML/JSON com:

- paginação de intenção, NLP, contrato e cobertura Vitest;
- distribuição por jornada, perfil de linguagem e comportamento esperado;
- resultados Deno, Vitest complementar e E2E;
- screenshots E2E clicáveis.

`scripts/chatbot-eval-nightly.mjs` executa a suíte Deno e, com `CHATBOT_EVAL_LIVE=1`, envia amostras ao orchestrator deployado.

## Adicionar Caso De Produção

1. Reproduza a frase exata do munícipe.
2. Intenção errada: `corpus/*-intent.json` ou `conversation-robust-intent.json`.
3. Campo não extraído: `turn-accumulate.json` ou `nlp-field-parsing.json`.
4. Pergunta errada no fluxo: `turn-next-field.json`.
5. Tom ofensivo ou risco: `conversation-robust-intent.json` e `lib-conversation-tone.test.ts`.
6. Rode `npm run test:chatbot` e corrija código ou corpus.

## CI Recomendado

```yaml
- run: npm run test:chatbot
# opcional em job separado com secrets E2E:
- run: npm run test:chatbot:e2e
```

Requisitos: Node.js + `npx deno` no runner.
