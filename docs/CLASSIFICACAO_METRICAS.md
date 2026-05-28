# Métricas de acurácia da classificação

## Dashboard no painel admin

Admin e gestor: **Área Admin → Acurácia da classificação** (`/admin/classification-accuracy`) — cartões resumo, tabela por origem da predição e últimas correções avaliadas.

A medição combina também:

1. **Registro no momento da criação do relato** (chat) → tabela `report_classification_prediction_log`
2. **Correção humana ou automacao** → tabela `report_classification_feedback` (já existente)
3. **Views SQL** para acerto/erro e agregações
4. **Log estruturado** na Edge Function `ai-orchestrator`: linha `[CLASSIFICATION_METRIC]` com JSON (observabilidade nos logs do Supabase)

## Tabela `report_classification_prediction_log`

| Coluna | Significado |
|--------|-------------|
| `report_id` / `report_type` | Relato urbano ou transporte |
| `predicted_category` | Categoria (urbano) ou `report_type` (transporte) gravada no insert |
| `predicted_subcategory` | Subcategoria / rótulo quando houver |
| `classification_source` | Origem da predição (ver abaixo) |
| `user_id` | Quem registrou (RLS: insert só com `auth.uid() = user_id`) |

**Fontes (`classification_source`) — urbano**

- `feedback_loop` — prioridade do histórico de correções
- `urgent_pattern` — padrões urgentes (segurança/barulho etc.)
- `auto_heuristic` — `autoClassifyCategory` / fluxo automático
- `user_recovery` — fallback para `outro` após resposta longa no parser de categoria
- `unknown` — demais caminhos (ex.: confirmação manual sem flag)

**Fontes — transporte**

- `feedback_loop`
- `fuzzy_text` — `inferTransportTypeFromText`
- `keyword_extract` — `extractTransportFields`
- `fallback_outro` — tipo `outro` com rótulo gerado
- `unknown`

**Formulário manual (web)**

- `manual_form` — relato urbano em `/relato-urbano/manual` (`ManualReportPage`) ou transporte em novo relato via `useTransportReport` (`NewReportPage`). Implementado em `src/lib/classificationPredictionLog.ts`.

## Views

### `v_classification_prediction_vs_feedback`

Uma linha por relato que tem **predição** e **pelo menos um feedback**: compara a predição com a **última** linha de `report_classification_feedback` (por `created_at`).

- `category_match` — predição de categoria igual à **categoria corrigida**
- `subcategory_match` — idem para subcategoria

### `v_classification_accuracy_by_source`

Agrega por `report_type` + `classification_source`:

- `evaluated_reports` — relatos com predição + correção
- `category_hits` / `category_misses`
- `category_accuracy_pct` — % de acerto de **categoria**

## Consultas úteis (SQL Editor)

Acurácia global por tipo (após haver correções):

```sql
SELECT * FROM v_classification_accuracy_by_source
ORDER BY report_type, classification_source;
```

Últimos casos avaliados (auditoria):

```sql
SELECT * FROM v_classification_prediction_vs_feedback
ORDER BY corrected_at DESC
LIMIT 50;
```

Cobertura: predições ainda **sem** correção (não entram na view de acurácia):

```sql
SELECT p.report_type, p.classification_source, COUNT(*)
FROM report_classification_prediction_log p
WHERE NOT EXISTS (
  SELECT 1 FROM report_classification_feedback f
  WHERE f.report_id = p.report_id AND f.report_type = p.report_type
)
GROUP BY 1, 2;
```

## Deploy

1. Aplicar migração: `supabase db push` (ou pipeline CI).
2. Deploy da função: `supabase functions deploy ai-orchestrator`.

## Relação com o feedback loop

Ver [FEEDBACK_LOOP_CLASSIFICACAO_IA.md](./FEEDBACK_LOOP_CLASSIFICACAO_IA.md). O feedback continua alimentando classificações futuras; esta tabela mede **quão alinhada** estava a predição inicial com a validação posterior.
