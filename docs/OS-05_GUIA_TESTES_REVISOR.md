# OS-05 — Guia de testes para o revisor (severidade / auditoria IA)

**Ambiente:** não há homologação separada — os testes rodam no **mesmo ambiente que o time já utiliza** (URL do app + projeto Supabase atuais). Documente no relatório qual URL/projeto foram usados.

**Implementação de referência:** tabela dedicada `public.report_severity_audit_log` (não é só `ai_classification`). Detalhes técnicos: [`OS-05_SEVERITY_AUDIT.md`](./OS-05_SEVERITY_AUDIT.md).

---

## 1. O que preparar antes

| Item | Para quê |
|------|----------|
| **Ambiente em uso** | URL do app + projeto Supabase (o que o time já usa; sem HML dedicado). |
| **Usuário cidadão** | Criar os 6 relatos pelo fluxo real (chat / coleta até gravar relato urbano e de transporte). |
| **Usuário gestor/admin** | Acessar gestão de relatos / moderação (ex.: ReportsManagement + drawer do relato). |
| **Ferramentas** | Navegador com DevTools → Rede (tempo da chamada ao `ai-orchestrator`); opcional Postman se houver chamada direta; **SQL Editor do Supabase** para validar auditoria na tabela `report_severity_audit_log`. |
| **Modelo de evidência** | Planilha ou doc: **Cenário**, **Tipo** (urbano/transporte), **Texto enviado**, **Severidade/risco final**, **ID do relato**, **Log** (JSON ou print da query), **Timestamp**, **Justificativa registrada**, **OK/NOK**. |

---

## 2. Roteiro — 6 cenários (texto sugerido para o cidadão)

Use textos claros para empurrar **baixa / média / alta (ou crítica)**, como abaixo.

### Relatos urbanos (3)

| Faixa | Texto sugerido (copiar/adaptar) |
|-------|----------------------------------|
| **Baixa** | “Sugiro pintar de novo o banco da praça na Rua X, está um pouco desbotado. Não há risco nem bloqueio.” |
| **Média** | “Há entulho na calçada da Rua Y há vários dias, dificulta a passada de pedestres.” |
| **Alta/crítica** | “Árvore inclinada com risco iminente de queda em cima da fiação elétrica na Rua Z; medo de curto ou queda na via.” |

*(Palavras como risco, imediato, fiação costumam influenciar severidade/risco no modelo.)*

### Relatos de transporte / SPTrans (3)

| Faixa | Texto sugerido |
|-------|----------------|
| **Baixa** | “Parabéns pelo atendimento na linha 6000. Só uma dúvida: qual o horário do último ônibus aos domingos?” |
| **Média** | “No ponto do Terminal X a linha Y atrasa quase todos os dias mais de 20 minutos.” |
| **Alta/crítica** | “Hoje houve acidente envolvendo o coletivo da linha Z na Av. W com passageiros; freios aparentemente falhando em via muito movimentada.” |

Em cada caso: **concluir o fluxo até o relato gravado** e anotar o **ID do relato** (URL, gestão ou SQL).

---

## 3. Como validar cada critério de aceite

### A) Log de auditoria (ID, valor, justificativa, timestamp)

1. Após cada relato, localizar o registro na tabela **`report_severity_audit_log`**:
   - **Urbano:** `urban_report_id = '<id do relato>'`
   - **Transporte:** `transport_report_id = '<id do relato>'`
2. Conferir:
   - **ID do evento:** coluna `id` (uuid do log).
   - **Valor:** `new_value`; na criação, `previous_value` costuma ser `null`.
   - **Métrica:** `risk_level` (urbano) ou `severity` (transporte).
   - **Justificativa:** `justification`.
   - **Timestamp:** `created_at`.
3. Complementar com tabela do relato (`urban_reports` / `transport_reports`): `severity`, `risk_level`, `urgency_reason`, `ai_classification` — o aceite **completo** exige linha na **tabela de log dedicada**, não só estado final.

**Query útil (substituir UUID):**

```sql
select id, metric, previous_value, new_value, justification, source_snippet,
       confidence, engine, metadata, created_at
from public.report_severity_audit_log
where urban_report_id = 'UUID-AQUI'   -- ou transport_report_id
order by created_at;
```

### B) Acurácia da justificativa

- Abrir a linha do log (campos `justification`, `source_snippet`, `metadata`).
- Verificar se a justificativa **reflete** o relato (ex.: “risco”, “atraso”, “entulho”, “acidente”).
- No relatório: **coerente / parcialmente coerente / incoerente** e por quê.

### C) Performance (ex.: p95 ≤ 3 s)

- DevTools → Rede → filtrar chamada à função **`ai-orchestrator`** (ou equivalente).
- Anotar duração por requisição relevante.
- Para p95: repetir várias vezes (ex.: 20–30 medições ou cenários + repetições) e calcular o percentil 95.
- Documentar: navegador, rede (Wi‑Fi/cabo), horário, e se a medição é **só até resposta HTTP** ou inclui outros passos.

### D) Visualização na moderação

- **Estado atual do produto:** o histórico em **`report_severity_audit_log`** pode ser validado **via SQL** com usuário que tenha role **gestor/admin** (RLS permite `SELECT`).
- **UI no drawer:** se ainda não houver seção “Histórico de severidade / IA” no detalhe do relato, registrar no relatório como **pendência de UI** ou validar o critério **D** apenas com evidência SQL + print do resultado — conforme combinado com produto.

---

## 4. Entregáveis (como montar)

1. **Documento de testes de contexto**  
   Uma seção por cenário (6 linhas na tabela mestra): input do cidadão + evidência do log (`report_severity_audit_log` ou tela, quando existir).

2. **Relatório de acurácia**  
   Tabela: cenário | severidade esperada (faixa) | severidade/risco obtido | justificativa registrada | parecer OK/NOK | observações.

3. **Referência de ambiente**  
   URL do app + projeto Supabase usados (ambiente único, sem HML separado), commit/tag ou data do deploy se aplicável.

4. **Opcional — script para o revisor**

```sql
-- Últimos logs de severidade (ambiente em uso)
select id, urban_report_id, transport_report_id, metric, new_value,
       left(justification, 120) as justification_preview, created_at
from public.report_severity_audit_log
order by created_at desc
limit 50;
```

---

## 5. Checklist rápido para “passar para ele”

- [ ] Migração `report_severity_audit_log` aplicada no projeto Supabase em uso.  
- [ ] Edge Function `ai-orchestrator` deployada com a versão que grava o log.  
- [ ] Contas: cidadão + gestor/admin disponíveis.  
- [ ] Revisor tem acesso ao SQL Editor (ou alguém do time roda as queries e exporta).  
- [ ] Planilha/modelo de evidência pronta (seção 1).  
- [ ] Roteiro dos 6 textos (seção 2).  
- [ ] Critério D alinhado: **SQL válido agora**; UI do drawer quando estiver implementada.
