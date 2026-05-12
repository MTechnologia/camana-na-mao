# Avaliação — Leitura tática mobile Admin / Analytics (OS-07 × CUS-07.1)

| Campo | Valor |
|--------|--------|
| Referência de demanda | 6103247 |
| Produto | Câmara na Mão (CMSP Connect) |
| Data do documento | 2026-05-11 |
| Autor | Equipe técnica (revisão estática + heurísticas; validação manual recomendada) |

---

## 1. Relatório padrão (síntese executiva)

**Objetivo:** verificar aderência ao caso de uso **CUS-07.1** (leitura tática web/mobile para gestores) no recorte **Admin → analytics**, comparando com a expectativa da **OS-07** de consumo tático fora do desktop.

**Escopo verificado em código (referência):**

- Rotas sob `ProtectedAdminRoute` relacionadas ao menu de análise/gestão: `/admin`, `/admin/analytics`, `/admin/trends`, `/admin/reports-heatmap`, `/admin/avaliacoes-polarizacao`, `/admin/intensidade-demanda`, `/admin/classification-accuracy` (ver `src/App.tsx` e `src/components/admin/AdminSidebar.tsx`).
- Redirects legados para `/admin/analytics`: `/admin/reports-analytics`, `/admin/analytics/advanced`, `/admin/sentiment-analysis`.

**Conclusão preliminar:** a aplicação **expõe** as telas e o `AdminLayout` já trata menu lateral em mobile (`useIsMobile`, drawer). Para **leitura tática** em viewport estreito, a **Análise de Relatos** (`ReportsAnalyticsPage`) concentra **muitas abas**, **vários hooks de dados** e **gráficos densos**; isso tende a **aumentar scroll** e **tempo até insight**. Em **2026-05-11** foram aplicados **ajustes mínimos de UX** (seção 9) para reduzir scroll horizontal na área principal e melhorar a navegação por abas em `<md`. Recomenda-se **sessão de teste manual** (DevTools + aparelho real) para fechar status com evidência (screenshots, build, ambiente).

**Os artefatos oficiais OS-07 e CUS-07.1** (texto de negócio) não estão versionados neste repositório: ao fechar a OS, **cole trechos ou links** da OS/CUS na seção 6.

---

## 2. Metodologia recomendada (completar em campo)

1. Autenticar como usuário **gestor** em ambiente de homologação ou produção autorizada.
2. Viewports mínimos sugeridos: **360×800**, **390×844**, **412×915** (CSS pixels); opcional tablet retrato **768×1024**.
3. Por rota: navegar a partir do **menu hamburger**, checar **KPIs**, **filtros** (incl. estado na URL em `/admin/analytics`), **abas**, **scroll vertical/horizontal**, **modais/export**, **sheet de drill** (`ReportDetailSheet`), rede lenta (throttling).
4. Registrar evidência na matriz (screenshot ou “OK reproduzido em DD/MM”).

---

## 3. Matriz — rota × viewport × status

**Legenda de status**

| Status | Significado |
|--------|-------------|
| **OK-T** | Adequado em teste manual (preencher data/testador). |
| **R-H** | Risco identificado por **heurística / revisão estática** do código; confirmar em teste. |
| **PT** | **Pendente de teste** manual. |

**Viewports (colunas):** V1 = 360×800, V2 = 390×844, V3 = 412×915.

| Rota | V1 | V2 | V3 | Observação (código / UX) |
|------|----|----|-----|---------------------------|
| `/admin` | PT | PT | PT | Hub; não é analytics, mas contexto de navegação mobile. |
| `/admin/analytics` | R-H | R-H | R-H | Abas com scroll horizontal em `<md`; KPIs em `grid-cols-2`; múltiplas fontes de dados; `main` sem `overflow-x-auto` (2026-05-11) — conteúdo largo deve rolar dentro dos cards/gráficos. |
| `/admin/trends` | PT | PT | PT | Painel temporal; validar legibilidade de eixos e gestos. |
| `/admin/reports-heatmap` | PT | PT | PT | Mapa/calor; risco típico de interação e performance em mobile. |
| `/admin/avaliacoes-polarizacao` | PT | PT | PT | Gráficos; validar labels e toque. |
| `/admin/intensidade-demanda` | PT | PT | PT | Idem. |
| `/admin/classification-accuracy` | PT | PT | PT | Idem. |
| `/admin/reports-analytics` (redirect) | — | — | — | Redireciona para `/admin/analytics`; validar bookmarks antigos. |

**Nota:** células **PT** devem migrar para **OK-T** ou **R-H** após a bateria de testes. **R-H** em `/admin/analytics` reflete achados da revisão estática (seção 4), não substitui evidência em dispositivo.

---

## 4. Gaps mobile (mínimo exigido: ≥ 5)

| # | Gap | Severidade | Evidência / base |
|---|-----|------------|------------------|
| G1 | **Volume de abas** na Análise de Relatos: doze gatilhos — leitura tática ainda exige varredura; em `<md` a lista passou a **rolar na horizontal** (mitigação parcial). | Média | `ReportsAnalyticsPage.tsx` — `TabsList` + `TabsTrigger` (atualizado 2026-05-11). |
| G2 | **Scroll horizontal no `main`**: risco de área que “desliza” em leitura rápida. | Média (mitigado) | ~~`AdminLayout` tinha `overflow-x-auto`~~ → `overflow-x-hidden` no `<main>` (2026-05-11); validar que nenhum admin crítico dependia de scroll no `main`. |
| G3 | **Carga percebida**: página agrega `useReportsAnalytics`, `usePatternThresholdEvents`, `useSentimentAnalytics`, `useCorrelationAnalytics`, `useDrillInsight` — em rede móvel, **tempo até KPI estável** pode frustrar uso tático. | Média–Alta | `ReportsAnalyticsPage.tsx` (composição de hooks). |
| G4 | **Filtros demográficos + export**: fluxo tático “filtrar → ler → exportar” em coluna única pode gerar **muito scroll** e competir com gráficos; touch targets e ordem de foco precisam validação. | Média | Bloco `DemographicFilters` + botões no header. |
| G5 | **Drill-through global** (`ReportDetailSheet`): em telas baixas, **sheet** pode cobrir contexto do gráfico; validar **fechamento**, **trap focus** e gesto de voltar do navegador/app. | Média | `AdminLayout.tsx` + `ReportDetailProvider`. |
| G6 | **Documentação externa desalinhada**: materiais citando `/admin/reports-analytics` como URL principal — gestores com bookmark antigo dependem de redirect; comunicação e treinamento. | Baixa | `docs/ENTREGA_PROTOTIPO_CAMARA_NA_MAO.md` vs redirects em `App.tsx`. |
| G7 | **Heatmap e mapas** (`/admin/reports-heatmap`): gestos de pinça/pan e legenda em viewport estreita costumam ser **pontos de atrito** sem ajuste específico mobile. | Média | Heurística comum + tipo de página. |

---

## 5. Recomendações priorizadas

### P0 — Validar antes de priorizar backlog (custo zero de dev)

- Rodar checklist da seção 2 em **V1–V3** e atualizar a matriz (status **OK-T** / **R-H** com data).
- Anexar **2–3 screenshots** por rota crítica (analytics + heatmap).

### P1 — Ajustes mínimos sugeridos (após confirmar em teste)

- Reduzir ou **agrupar abas** (ex.: categorias “Volume / Qualidade / Território”) para menos decisões por tela em mobile — **pendente** (não implementado).
- ~~Revisar **`overflow-x-auto`** no `main`~~ — **feito** (2026-05-11): `overflow-x-hidden` em `AdminLayout`.
- **Lista de abas em mobile** — **feito** (2026-05-11): `max-md:flex-nowrap` + scroll horizontal na `TabsList`, triggers `shrink-0`.
- **Skeleton / priorização de dados**: carregar primeiro bloco KPI + aba ativa; lazy load do restante (backlog técnico).

### P2 — Backlog mobile (fora do escopo imediato de implementação desta OS)

- Modo **“Resumo gestor”** (uma coluna, 3–5 KPIs, um gráfico) para viewport &lt; `md`.
- Otimização de **bundle/payload** da rota analytics (code splitting por aba).
- Testes **E2E** visual ou manual recorrente na pipeline para regressão mobile admin.

---

## 6. Aderência CUS-07.1 e OS-07 (preencher)

| Critério (ajustar conforme documento oficial) | Situação no recorte atual | Comentário |
|-----------------------------------------------|---------------------------|------------|
| *Colar critério CUS-07.1* | A preencher após leitura do CUS | |
| *Colar expectativa OS-07* | A preencher após leitura da OS | |

---

## 7. Referências no repositório

- Rotas: `src/App.tsx`
- Menu admin: `src/components/admin/AdminSidebar.tsx`
- Layout: `src/layouts/AdminLayout.tsx`
- Análise de relatos: `src/pages/admin/ReportsAnalyticsPage.tsx`
- Inventário parcial de rotas: `docs/api-base/MAPEAMENTO_ROTAS.md`

---

## 8. Definition of Done (demanda 6103247)

| Critério | Atendimento neste arquivo |
|-----------|---------------------------|
| Matriz rota × viewport × status | Seção 3 |
| ≥ 5 gaps mobile | Seção 4 (7 itens) |
| Recomendações priorizadas | Seção 5 |
| Sem implementação nesta tarefa | Doc + ajustes UX **opcionais** mínimos (seção 9); escopo original era avaliação sem dev |

**Pendência:** substituir **PT** e validar **R-H** com **teste manual** e preencher seção 6 com os textos oficiais **CUS-07.1** e **OS-07**.

---

## 9. Alterações de código (follow-up 2026-05-11)

| Arquivo | Mudança |
|---------|---------|
| `src/layouts/AdminLayout.tsx` | `<main>`: `overflow-x-auto` → `overflow-x-hidden` (evita “page shake” horizontal; tabelas/gráficos mantêm scroll próprio onde já existir). |
| `src/pages/admin/ReportsAnalyticsPage.tsx` | `TabsList`: em viewports `<md`, fila única com scroll horizontal + `[scrollbar-width:thin]`; `TabsTrigger` com `shrink-0` e `md:flex-1` para preservar layout em desktop. |

**Validação recomendada:** `/admin/analytics` e uma página admin com tabela larga (ex. relatórios em modo lista) em 360px, para confirmar que nada ficou cortado sem barra de rolagem interna.
