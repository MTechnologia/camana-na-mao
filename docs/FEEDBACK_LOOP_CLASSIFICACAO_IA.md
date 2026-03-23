# Feedback loop na classificação IA

Correções humanas (admin, N8N) e, no futuro, do cidadão alimentam a tabela `report_classification_feedback`. O orquestrador **reutiliza** essas correções antes da heurística/LLM para descrições **parecidas**.

## Componentes

| Peça | Função |
|------|--------|
| `public.report_classification_feedback` | Armazena `report_type`, `original_*`, `corrected_*`, `description_excerpt`, `source` (`admin` \| `n8n` \| `user`). |
| `getClassificationFromFeedback` (`lib.ts`) | Busca até 500 linhas recentes e aplica **match** entre a descrição atual e `description_excerpt`. |
| `descriptionMatchesFeedbackExcerpt` | Regras: excerpt curto (≤160 chars) contido na descrição; prefixo comum (~100 chars); ou **Jaccard** de tokens ≥ 0,28. |
| `getNextMissingField` urban (`index.ts`) | Se não há categoria, consulta feedback **antes** de `autoClassifyCategory`. |
| `getNextMissingField` transport (`index.ts`) | Se não há `report_type`, consulta feedback **antes** de `inferTransportTypeFromText`. |
| Admin (`useReportsAdmin.updateManifestCategory`) | Ao salvar categoria **urbana** ou tipo **transporte**, insere linha com `source: 'admin'` (drawer de gestão de relatos). |
| `n8n-callback` | Quando a categoria validada difere da salva, insere com `source: 'n8n'`. |
| `detectEmergingCategory` | Padrões fixos (`EMERGING_PATTERNS`) + tabela `dynamic_categories` — **outro** eixo (novos temas), não o mesmo que `report_classification_feedback`. |

## Orquestrador e RLS

A tabela tem RLS: só **admin/gestor** fazem `SELECT`. O chat do cidadão usa JWT no `ai-orchestrator`, então a leitura para `getClassificationFromFeedback` usa um cliente **`SUPABASE_SERVICE_ROLE_KEY`** (só na Edge Function), mantendo o restante das queries com o usuário autenticado. Sem a service key configurada no deploy, o fallback é o cliente com JWT (feedback pode ficar vazio).

## Limitações atuais

- **Transporte no admin:** o drawer permite corrigir `report_type` e opcionalmente um rótulo (vai para `corrected_subcategory` no feedback).
- **Fonte `user`:** reservada na migration; falta fluxo no app (ex.: “A categoria estava errada?” após o relato).
- **Modelo de ML:** o loop **não** retreina modelo; ele **prioriza** correções salvas. Para fine-tuning ou few-shot dinâmico, seria outra etapa (exportar `report_classification_feedback` + pipeline).

## Deploy

Alterações no match e no transporte exigem `supabase functions deploy ai-orchestrator`.

## Métricas de acurácia

Predições no registro (chat) e views SQL para acertos/erros por fonte: [CLASSIFICACAO_METRICAS.md](./CLASSIFICACAO_METRICAS.md).

## Teste manual sugerido

1. Criar relato urbano com descrição distinta; no admin, corrigir categoria e salvar.
2. Abrir **novo** relato com descrição semanticamente parecida (mesmas palavras-chave).
3. Verificar nos logs `[getNextMissingField] Category from feedback:` ou classificação esperada no preview.
