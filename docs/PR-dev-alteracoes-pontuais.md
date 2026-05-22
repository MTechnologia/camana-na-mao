## Resumo

Este PR padroniza o **painel administrativo** (hubs analíticas, visão executiva, gestão operacional e plataforma) em um layout institucional único: cabeçalho dedicado por página, faixa de KPIs, gráficos com botão **P** (parâmetros em modal), subnavegação, atalhos “Relacionado”, recorte global alinhado à barra lateral e eliminação de **card dentro de card**.

- **2 commits** em cima de `dev`:
  1. `feat(admin): reestruturar módulos analíticos e UX do painel PO` — hubs analíticas, painéis PO, relatos/encaminhamentos (~74 arquivos, +4.126 / −1.724)
  2. `feat(admin): dados executivos, guia de tela, shells operacionais e sidebar` — paridade de dados com `dev`, drill territorial, módulos de governança/plataforma, rodapé “Como usar esta tela”, sidebar recolhida (~88 arquivos)
- **~162 arquivos** no branch (frontend admin), sem mudanças de backend ou migrations

---

## Contexto

Após a entrega do novo painel PO (`dev_Novo_Painel_Admin`), as telas analíticas ainda misturavam padrões antigos (múltiplos `KpiCard`, legendas em acordeão, breadcrumbs redundantes, filtros duplicados). O primeiro commit alinha **todas as hubs analíticas** ao mesmo idioma visual.

O segundo commit fecha lacunas de **dados e drill** na visão executiva (gráficos vazios, distrito em branco, zona “Não informada”), estende o padrão a **módulos operacionais** que ainda usavam layout legado (avaliações, audiências, governança, configurações) e melhora **navegação** (sidebar recolhida, barra de recorte com cor da sidebar).

---

## Padrão de UX institucional (decisões)

| Tema | Decisão |
|------|---------|
| Recorte de período/território | Barra global no header (`AdminAnalyticsFilters`), mesma paleta da sidebar (`text-sidebar-*`); filtros locais só onde a página exige granularidade extra |
| Parâmetros de gráfico | Botão **P** → tooltip ou modal (`ParameterInfoTrigger`, `ParameterLegend` com `density="modal"`) |
| Ajuda da página | Rodapé **“Como usar esta tela”** (`PageUsageGuideFooter`) — modal estilo botão P; substitui textos longos e `DashboardHelpSection` |
| KPIs | Faixa única (`*KpiStrip`, `AnalyticsMetricsStrip`) ou cards clássicos na acurácia; evita grid de `KpiCard` aninhados |
| Breadcrumbs | Ocultos nas páginas “hub” analíticas e operacionais com header dedicado |
| Navegação lateral | Atalhos **Relacionado** (`*ExploreLinks`); sidebar recolhida com tooltips e submenus por grupo (`DropdownMenu`) |
| Painéis customizados | `PanelCanvas` em modo view sem card duplicado; widgets `embedded` na faixa KPI |
| Dados analíticos | `GlobalReportsAnalyticsProvider` — carga única compartilhada; drill/KPIs derivados de `reportsAnalyticsAggregates` |

---

## Escopo por rota / página

### Visão executiva — `/admin`
- `ExecutiveDashboardHeader`, `ExecutiveKpiStrip`, `ExecutiveTerritoryNav`, `ExecutiveChartSection`, `ExecutiveExploreLinks`
- `ExecutiveSupplementaryCharts` — tendências por métrica e volume por categoria (paridade de dados com `dev`, layout atual)
- `PageUsageGuideFooter` com legendas de homologação
- Drill territorial: detalhe por distrito e zona **“Não informada”** via `analyticsDrillFromStats` + breakdown por bairro

### Análise de relatos urbanos — `/admin/analytics`
- `UrbanAnalyticsPageHeader`, `UrbanAnalyticsKpiStrip`, `UrbanAnalyticsTabs`, `UrbanAnalyticsExploreLinks`
- Rodapé de guia da tela

### Tendências temporais — `/admin/trends`
- `TrendsPageHeader`, `TrendsSummaryStrip`, `TrendsLocalFilters`, `TrendsMainChart`, `TrendsExploreLinks`
- Resumo textual via `buildTrendSummary.ts`
- Rodapé de guia

### Mapa de calor — `/admin/reports-heatmap`
- `HeatmapPageHeader`, `HeatmapMetricsStrip`, `HeatmapMetricTabs`, `HeatmapFiltersBar`, `HeatmapPanelShell`, `HeatmapExploreLinks`
- `HeatmapMapSlot` ajustado ao shell; rodapé de guia

### Acurácia de classificação — `/admin/classification-accuracy`
- `ClassificationAccuracyKpiCards`, `PendingPredictionsTable` (mini-tabela 5 linhas + expandir)
- Rodapé de guia

### Painéis personalizados — `/paineis`, `/paineis/avancado`, `/paineis/criar`
- `paineis-page/`: header, subnav, summary strip, explore links
- `PanelCanvas` / `PanelWidgetCharts`: modo `embedded`, `kpi_quad` sem cabeçalho extra
- Rodapé de guia nas três rotas

### Relatos urbanos (operacional) — `/admin/reports`, `/admin/referrals`
- `urban-reports/`: header, subnav, explore links, `ReferralsKpiStrip`
- Fila em bloco único (toolbar + tabela `embedded`)
- Banner de fluxo em `<details>` recolhível
- Rodapé de guia; `ReferralRulesEditor` alinhado ao layout

### Avaliações de equipamentos — `/admin/equipment-ratings`
- `equipment-ratings/`: header, subnav, KPIs, fila (toolbar + tabela embutida), explore links
- Atalho para mapa de concentração

### Audiências públicas — `/admin/public-hearings`
- `public-hearings/`: header, subnav, KPIs, fila e lista no bloco único

### Governança — `/admin/audit-logs`, `/admin/users`, documentação pública, correções
- `GovernancePageShell` + `GovernancePageHeader` + `GovernanceSubNav`
- `ServiceCorrectionsKpiStrip`; gestão embutida sem header duplicado
- `users/`: `AdminUsersList`, `AdminUserListItem`, labels centralizados

### Plataforma e configurações — notificações, exportações, settings
- `PlatformPageHeader`, `PlatformSubNav`, `PlatformSectionHeading`, `PlatformAdminNotice`
- `SettingsLayout` reutiliza shell de plataforma (ambiente homologação/produção)
- Páginas: notificações, logs de exportação, IA, integrações, parâmetros, roteamento, acessibilidade

---

## Componentes e utilitários novos

### Commit 1 — hubs analíticas

| Pasta / arquivo | Função |
|-----------------|--------|
| `admin/executive/` | Header, KPIs, território, gráficos e links da visão executiva |
| `admin/urban-analytics/` | Hub da análise urbana |
| `admin/trends/` | Tendências com filtros locais e gráfico principal |
| `admin/heatmap-page/` | Shell do mapa de calor (tabs, métricas, filtros) |
| `admin/classification-accuracy/` | KPIs e tabela de previsões pendentes |
| `admin/paineis-page/` | Header, subnav e atalhos dos painéis PO |
| `admin/urban-reports/` | Gestão/análise de relatos e encaminhamentos |
| `analytics/ChartCard.tsx` | Card de gráfico com slot para botão P |
| `analytics/ChartParametersHelp.tsx` | Modal de parâmetros (`max-w-2xl`, cards internos) |
| `analytics/AnalyticsMetricsStrip.tsx` | Faixa de métricas reutilizável |
| `AdminAnalyticsFilters.tsx` / `AdminAnalyticsFilterSelect.tsx` | Filtros analíticos compartilhados |
| `adminHeaderStyles.ts` | Tokens/classes do header institucional |
| `lib/buildTrendSummary.ts` | Texto resumo para tendências |

### Commit 2 — dados, guia, shells operacionais

| Pasta / arquivo | Função |
|-----------------|--------|
| `contexts/GlobalReportsAnalyticsContext.tsx` | Provider de analytics global (uma carga para todo o admin) |
| `admin/executive/ExecutiveSupplementaryCharts.tsx` | Gráficos complementares da visão executiva |
| `admin/guide/PageUsageGuideFooter.tsx` | Rodapé “Como usar esta tela” (modal) |
| `admin/guide/adminGuideModalStyles.ts` | Estilos do modal de guia |
| `admin/governance/` | Shell de páginas de governança |
| `admin/platform/` | Header, subnav e avisos de plataforma/configurações |
| `admin/equipment-ratings/` | Shell completo de avaliações |
| `admin/public-hearings/` | Shell completo de audiências |
| `admin/service-corrections/ServiceCorrectionsKpiStrip.tsx` | Faixa KPI de correções |
| `admin/users/` | Lista e itens de usuários admin |

---

## Alterações transversais

### Commit 1
- **`AdminAppLayout`**: breadcrumbs ocultos em rotas hub analíticas e operacionais
- **`adminRouteUtils.ts`**: rotas de reports/referrals na barra analítica global
- **`analyticsParameterLegends.ts` / `analyticsLabels.ts`**: legendas e rótulos para o modal P
- **`ParameterLegend`**: densidade `modal` com melhor espaçamento
- **`ChartShell`**, **`VolumeByRegionChart`**, painéis heatmap: adaptados ao shell e modal P
- **`KpiCard`**: ajustes para uso em faixas
- **`AdminHeader`**: refinamentos de navegação/contexto analítico

### Commit 2
- **`AdminAppLayout`**: `GlobalReportsAnalyticsProvider` envolvendo o admin
- **`useSectionChartData`**, **`useReportsAnalytics`**, **`AnalyticsDrillContext`**: consomem stats globais
- **`reportsAnalyticsAggregates.ts`**: `buildMetricTrendsFromStats`, volume por zona, breakdown por bairro, filtro por lat/lng
- **`analyticsDrillFromStats.ts`**: drill por distrito/zona, KPIs por região, “Não informada” / `unknown`
- **`analyticsLabels.ts`**: mapeamento de zona desconhecida
- **`AdminHeader` / `AdminAnalyticsFilters`**: barra de recorte com tokens `sidebar-*`
- **`AdminSidebar` / `AdminSidebarNav`**: sidebar recolhida (tooltips, `DropdownMenu` nos grupos, contraste de ícones)
- **`ParameterInfoTrigger`**: botão P unificado; remoção de `?` soltos nos headers
- **Removido** `DashboardHelpSection.tsx`
- **`SettingsLayout`**: passa a usar `PlatformPageHeader` + `PlatformSubNav`
- Legendas ampliadas em `analyticsParameterLegends.ts` (executivo, recorte, avaliações, etc.)

---

## O que não está neste PR

- Sem alterações em Edge Functions, Supabase migrations ou APIs
- Sem mudança de regras de negócio de classificação ou roteamento de encaminhamentos
- Foco exclusivo em **frontend admin** (layout, composição de componentes, UX e agregação de dados no cliente)

---

## Test plan

### Hubs analíticas (commit 1)
- [ ] `/admin` — header executivo, faixa KPI, território, gráficos com **P**, links Relacionado
- [ ] `/admin/analytics` — KPIs, abas Volume/Padrões/IA/Demográficos, barra de recorte global
- [ ] `/admin/trends` — resumo, filtros locais, gráfico principal, modal P
- [ ] `/admin/reports-heatmap` — 4 abas de métrica, strip de KPIs, mapas carregam com filtros
- [ ] `/admin/classification-accuracy` — KPIs, tabela 5 linhas + expandir, sem card duplicado
- [ ] `/paineis` — listagem com header/subnav; canvas view sem card dentro de card
- [ ] `/paineis/avancado` e `/paineis/criar` — widgets embedded e `kpi_quad` limpo
- [ ] `/admin/reports` — faixa KPI, fila única, banner `<details>` recolhido por padrão
- [ ] `/admin/referrals` — mesmo padrão + `ReferralsKpiStrip`

### Dados, guia e operacional (commit 2)
- [ ] `/admin` — gráficos complementares preenchem com recortes variados; drill em todas as zonas (incl. **Não informada**)
- [ ] `/admin` — rodapé “Como usar esta tela” e modal de homologação
- [ ] Sidebar recolhida (desktop) — ícones visíveis, tooltips e submenus por grupo
- [ ] Barra **Recorte** — legível sobre fundo da sidebar; botão P do recorte
- [ ] `/admin/equipment-ratings` — KPIs, fila única, moderação, atalho mapa
- [ ] `/admin/public-hearings` — KPIs, fila, layout sem nesting
- [ ] `/admin/audit-logs`, `/admin/users`, correções, documentação — `GovernancePageShell`
- [ ] Notificações, exportações, settings — `PlatformPageHeader` + subnav
- [ ] Rodapé de guia nas páginas analíticas e painéis listadas no commit 2

### Geral
- [ ] Breadcrumbs ausentes nas rotas hub; presentes onde esperado
- [ ] Botão **P** e modais de ajuda legíveis em desktop e mobile
- [ ] Tema claro/escuro — headers, faixas KPI e gráficos sem regressão
- [ ] `npm run build` (ou pipeline CI) sem erros de TypeScript
