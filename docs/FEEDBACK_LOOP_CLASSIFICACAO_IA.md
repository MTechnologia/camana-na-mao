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
| Admin (`useReportsAdmin.updateManifestCategory`) | Ao salvar categoria urbana, insere linha com `source: 'admin'`. |
| `n8n-callback` | Quando a categoria validada difere da salva, insere com `source: 'n8n'`. |
| `detectEmergingCategory` | Padrões fixos (`EMERGING_PATTERNS`) + tabela `dynamic_categories` — **outro** eixo (novos temas), não o mesmo que `report_classification_feedback`. |

## Limitações atuais

- **Transporte no admin:** o drawer ainda não expõe edição de `report_type`; correções de transporte entram sobretudo via N8N.
- **Fonte `user`:** reservada na migration; falta fluxo no app (ex.: “A categoria estava errada?” após o relato).
- **Modelo de ML:** o loop **não** retreina modelo; ele **prioriza** correções salvas. Para fine-tuning ou few-shot dinâmico, seria outra etapa (exportar `report_classification_feedback` + pipeline).

## Deploy

Alterações no match e no transporte exigem `supabase functions deploy ai-orchestrator`.

## Teste manual sugerido

1. Criar relato urbano com descrição distinta; no admin, corrigir categoria e salvar.
2. Abrir **novo** relato com descrição semanticamente parecida (mesmas palavras-chave).
3. Verificar nos logs `[getNextMissingField] Category from feedback:` ou classificação esperada no preview.
