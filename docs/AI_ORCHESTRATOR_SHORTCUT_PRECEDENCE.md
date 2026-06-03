# Precedência de atalhos — ai-orchestrator (CHB-007)

Ordem de execução no `index.ts` **antes** do turno LLM. Atalhos mais acima têm prioridade e podem encerrar o request com resposta determinística.

| # | Etapa | Handler / módulo |
|---|--------|------------------|
| 1 | Bootstrap | `initializeRequestBootstrap` |
| 2 | Vereadores / encaminhamento | `handleCouncilShortcuts` |
| 3 | Avaliação por canal | `handleChannelRatingShortcut` |
| 4 | Intent + troca de jornada | `resolveCollectionIntent` |
| 5 | Contexto acumulado + snapshot | `buildAccumulatedContext` |
| 6 | Fechamento urbano (não reclamação) | `handleUrbanNonComplaintClosingShortcut` |
| 7 | Fechamento serviços | `handleServicesJourneyClosingShortcut` |
| 8 | Fechamento geral | `handleGeneralJourneyClosingShortcut` |
| 9 | Atalhos pré-LLM | `handlePreAiShortcuts` |
| 10 | Coleta estruturada | `orchestrateCollectionTurn` |
| 11 | Fluxo serviços (leve) | `handleDeterministicServicesFlow` |
| 12 | Pipeline LLM + tools | `runAiPipeline` |

Fonte de verdade em código: `lib-index-shortcut-order.ts` (testado em Deno).

**Regra:** alterar a ordem em `index.ts` exige atualizar `ORCHESTRATOR_SHORTCUT_PIPELINE` e este documento.
