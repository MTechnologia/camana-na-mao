# Avaliacao do fluxo de gestao de relatos admin

**Escopo:** `/admin/reports`, `/admin/referrals`, `/admin/triagem` e vinculo com `/admin/commissions`.

**Objetivo:** documentar o fluxo operacional as-is para triagem, encaminhamento e acompanhamento de relatos, confrontando com RN-REL-001/002, ciclo `pending -> sent -> acknowledged -> resolved`, RBAC, auditoria e consistencia com o mapeamento de fluxos/rotas.

## 1. Superficies mapeadas

| Superficie | Implementacao | Papel atual |
|---|---|---|
| `/admin/reports` | `src/pages/admin/ReportsManagement.tsx` + `src/hooks/useReportsAdmin.ts` | Lista unificada de manifestacoes: urbano, transporte, avaliacao e feedback. Permite filtros, KPIs, lista/kanban, detalhe, status, categoria, exportacao, exclusao e encaminhamento legado para vereador. |
| `/admin/triagem` | `src/pages/admin/TriageKanbanPage.tsx`, `src/hooks/useTriageKanban.ts`, `src/hooks/useReportTriage.ts` | Funil operacional de triagem para `urban_reports` e `transport_reports`, com status `untriaged`, `triaged`, `in_progress`, `resolved`, `closed`, prioridade P0-P3, responsavel e alertas de estagnacao. |
| `ReportDetailSheet` global | `src/components/admin/ReportDetailSheet.tsx` | Drill-through usado pelo kanban e areas analiticas. Contem abas de detalhes, autor, IA, triagem, acompanhamento e historico. E o ponto onde aparecem `TriageEditor`, `ReportTimelineTab` e `CommissionReferralDialog`. |
| `/admin/referrals` | `src/pages/admin/ReferralsManagement.tsx` + `src/hooks/useReferralsAdmin.ts` | Gestao dos encaminhamentos legados para vereador em `council_member_referrals`, com status `pending`, `sent`, `acknowledged`, `resolved`. |
| `/admin/commissions` | `src/pages/admin/LegislativeCommissionsPage.tsx` | Cadastro operacional de comissoes legislativas ativas, palavras-chave, ordem e ativacao. Alimenta o encaminhamento a comissao e o wizard legado de sugestao de vereadores. |

## 2. Fluxo as-is

### 2.1 Entrada e consolidacao dos relatos

`/admin/reports` consolida quatro tipos:

| Tipo unificado | Fonte | Dados captados/exibidos |
|---|---|---|
| `urban` | `urban_reports` com `category != feedback_camara` | `id`, `category`, `subcategory`, `description`, `severity`, `status`, `created_at`, `updated_at`, endereco/localizacao, `neighborhood`, `user_id`, `protocol_code`. No detalhe completo ha fotos, rua, numero, CEP, ponto de referencia, risco, impacto, classificacao IA e dados automacao. |
| `transport` | `transport_reports` | `report_type`, `description`, `severity`, `status`, `location`, linha, data/hora da ocorrencia, protocolo, resposta, sentimento/categoria IA, padrao detectado, frequencia, impacto, acessibilidade e fotos no detalhe global. |
| `evaluation` | `service_ratings` + `public_services` | `rating_stars`, `rating_text`, `sentiment`, `service_id`, nome/tipo de servico, `publication_status`, anonimato. O status operacional e normalizado como `completed`; nao participa da triagem HU-10. |
| `feedback` | `urban_reports` com `category = feedback_camara` | Usa a mesma tabela de relatos urbanos, mas como tipo separado. Em geral nao carrega regiao, fotos ou campos territoriais na lista. |

### 2.2 Triagem antes do encaminhamento

O fluxo novo de triagem existe em paralelo ao fluxo legado:

1. Relatos urbanos/transporte aparecem em `/admin/triagem` como `untriaged` quando ainda nao possuem registro em `report_triage`.
2. Gestor/admin pode abrir o detalhe global, definir prioridade P0-P3, responsavel, status do funil e nota interna.
3. Drag-and-drop no kanban atualiza `report_triage.triage_status`.
4. A migration `20260514130000_hu10_sync_status_triage.sql` sincroniza `triage_status` com `urban_reports.status`/`transport_reports.status` para `in_progress`, `resolved` e `closed`.
5. A aba "Acompanhamento" registra/mostra eventos em `report_status_events` e encaminhamentos para comissao em `report_commission_referrals`.

Lacuna relevante: em `/admin/reports`, o botao "Encaminhar" abre `ReferralDialog`/`ReferralWizard`, que cria encaminhamento para vereador em `council_member_referrals` e nao exige que exista triagem previa em `report_triage`. Portanto, RN-REL-001 e atendida no fluxo `/admin/triagem -> ReportDetailSheet -> Encaminhar a comissao`, mas ainda pode ser contornada pelo caminho legado de `/admin/reports`.

### 2.3 Encaminhamentos atuais

Ha dois modelos ativos:

| Modelo | Tabela | Status | Uso atual |
|---|---|---|---|
| Encaminhamento legado para vereador | `council_member_referrals` | `pending -> sent -> acknowledged -> resolved` | Usado por `/admin/referrals`, `ReferralWizard`, gabinete e historico de encaminhamentos para vereadores. Pode vincular opcionalmente uma `legislative_commission_id`. |
| Encaminhamento operacional para comissao | `report_commission_referrals` | `pending -> accepted/rejected -> processed` | Usado pelo `CommissionReferralDialog` no `ReportDetailSheet`. Possui justificativa obrigatoria e vinculo direto com `legislative_commissions`. |

Isso cria uma divergencia de linguagem e ciclo: o requisito cita `pending -> sent -> acknowledged -> resolved`, mas o fluxo novo de comissao usa `pending -> accepted/rejected -> processed`. Se a regra RN-REL-002 se refere a qualquer encaminhamento institucional, o ciclo precisa ser harmonizado ou explicitamente separado.

### 2.4 Historico e trilha de evolucao

O projeto possui tres camadas de rastreio:

| Camada | Fonte | Cobertura |
|---|---|---|
| Status do relato | `urban_reports.status`, `transport_reports.status` | `pending`, `in_progress`, `resolved`, `rejected`; sincronizado parcialmente com triagem. |
| Timeline operacional | `report_status_events` | Eventos de triagem, prioridade, responsavel, status e encaminhamento. E append-only por desenho, mas sem trigger de imutabilidade dedicado. |
| Auditoria critica | `audit_logs` | Migration HU-12 bloqueia update/delete em `audit_logs` e adiciona triggers para `report_triage` e `report_commission_referrals`. Tambem ha inserts manuais para update/delete/export em `useReportsAdmin`. |

Ponto de atencao: comentarios/notas e mudancas de status feitas pelo footer do `ReportDetailSheet` atualizam o relato e dependem de audit/audit_logs ou eventos existentes; nem toda acao gera explicitamente `report_status_events`. Para RN-REL-002, a timeline ponta a ponta fica mais forte quando toda transicao de status e resposta tambem gera evento padronizado.

## 3. Aderencia as regras

| Regra | Status | Evidencia e lacuna |
|---|---|---|
| RN-REL-001: triagem antes de encaminhar | Parcial | O fluxo de comissao dentro do detalhe global favorece triagem, mas `/admin/reports` permite encaminhamento legado sem checar `report_triage`. |
| RN-REL-002: historico ate conclusao | Parcial | Ha `report_status_events`, `report_triage`, `report_commission_referrals` e `audit_logs`. Falta cobrir de forma uniforme todos os caminhos: wizard legado, `/admin/referrals`, resposta de vereador, mudanca de status via footer e fechamento. |
| RN-RBAC-001 | Parcial | Rotas admin sao protegidas por `ProtectedAdminRoute`; tabelas HU-10 usam `has_permission` para triagem/comissao. Mas `/admin/referrals` opera via hook sem guards finos no componente e o fluxo legado mistura permissoes de cidadao engajado/gestor/admin. |
| RN-AUD-001 | Bom, com lacunas | HU-12 torna `audit_logs` imutavel e audita `report_triage`/`report_commission_referrals`. Ainda ha exclusao fisica de relatos e encaminhamentos legados; a auditoria existe, mas a operacao apaga o registro funcional. |
| RN-ANL-001 | Parcial | `/admin/reports` usa realtime e refetch, mas KPIs globais nao respeitam todos os filtros aplicados na lista. `/admin/referrals` tambem mostra KPIs globais, nao recalculados por filtro. |
| RN-ANL-002 | Parcial | `/admin/reports` possui periodo, regiao e categoria; `/admin/referrals` nao possui periodo, regiao ou categoria. `/admin/triagem` possui prioridade, responsavel, fonte e busca, mas nao periodo/regiao/categoria. |

## 4. Gaps prioritarios

**P0 - Bloquear bypass de triagem antes do encaminhamento**

O botao de encaminhar em `/admin/reports` deve verificar se existe `report_triage` com pelo menos `triage_status = triaged` ou equivalente antes de permitir encaminhamento. Alternativas:

- redirecionar para `ReportDetailSheet`/aba triagem quando nao houver triagem;
- substituir o `ReferralDialog` legado por `CommissionReferralDialog` para relatos urbanos/transporte;
- manter vereador apenas como fluxo separado, mas com aviso claro e regra de pre-condicao.

**P0 - Harmonizar os ciclos de status**

Definir se o ciclo canonico de encaminhamento institucional e:

- `pending -> sent -> acknowledged -> resolved` para todos os encaminhamentos; ou
- `pending -> accepted/rejected -> processed` apenas para comissoes e o ciclo legado apenas para gabinete/vereador.

Sem essa decisao, `/admin/referrals` e `report_commission_referrals` seguem modelos diferentes e RN-REL-002 fica ambigua.

**P1 - Unificar a timeline ponta a ponta**

Todo evento relevante deveria gravar `report_status_events`: criacao, triagem, prioridade, atribuicao, status, encaminhamento, resposta, rejeicao, resolucao, reabertura e exclusao/anulacao logica. Hoje parte disso existe, mas nao cobre igualmente `/admin/referrals` e alteracoes diretas de status.

**P1 - Vincular `/admin/referrals` a comissoes ou renomear escopo**

Hoje `/admin/referrals` gerencia encaminhamentos para vereadores, embora o escopo operacional fale em comissoes. O ideal e:

- criar uma aba/lista para `report_commission_referrals`; ou
- expandir `/admin/referrals` com abas "Comissoes" e "Vereadores"; ou
- renomear o fluxo legado para "Encaminhamentos a gabinetes".

**P1 - Ajustar KPIs aos filtros**

KPIs de `/admin/reports` e `/admin/referrals` devem recalcular com periodo, regiao, categoria, tipo e status ativos. Hoje a lista filtra, mas os KPIs sao globais.

**P2 - Soft delete operacional**

Trocar exclusao fisica de relatos/encaminhamentos por estado operacional (`deleted`, `archived`, `voided`) ou tabela de tombstone. A auditoria imutavel ajuda, mas a perda do registro funcional dificulta investigacao operacional.

**P2 - Expandir filtros globais**

Adicionar periodo/regiao/categoria em `/admin/referrals` e periodo/regiao/categoria em `/admin/triagem`, quando aplicavel. Para transporte, regiao pode vir de zona/bairro derivado; para avaliacao, de `public_services`/localizacao do equipamento.

## 5. Recomendacao operacional priorizada

1. Definir o modelo canonico de encaminhamento e publicar no codigo como enum/labels compartilhados.
2. Fazer `/admin/reports` deixar de encaminhar sem triagem: abrir triagem primeiro ou exigir `report_triage`.
3. Trazer `report_commission_referrals` para uma tela operacional propria ou para `/admin/referrals`.
4. Padronizar `report_status_events` como fonte da timeline, com triggers/functions para nao depender de cada componente lembrar de inserir evento.
5. Recalcular KPIs conforme filtros em `/admin/reports`, `/admin/referrals` e `/admin/triagem`.
6. Converter exclusoes administrativas para fluxo auditavel de arquivamento/anulacao.

## 6. Conclusao

O sistema ja tem uma base forte para HU-10: triagem estruturada, kanban, responsavel, prioridade, timeline, encaminhamento a comissao, RBAC granular e auditoria imutavel. O principal risco nao e ausencia de estrutura, mas duplicidade operacional: `/admin/reports` e `/admin/referrals` ainda preservam o caminho legado de vereadores, enquanto a triagem/comissao vive no `ReportDetailSheet` e em `/admin/triagem`.

Para cumprir integralmente RN-REL-001/002, a operacao precisa de um unico caminho feliz: relato entra, e triado, recebe responsavel/prioridade, e encaminhado a comissao/gabinete conforme regra, acompanha status ate resolucao, e cada transicao entra na timeline e na auditoria.
