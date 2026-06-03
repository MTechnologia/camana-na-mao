# Curadoria visual e UX do Admin

| Campo | Valor |
|--------|--------|
| **ID / rastreio** | #5696256 |
| **Data do relatório** | 12 de maio de 2026 |
| **Autor** | Curadoria UX (auditoria por código + heurísticas; evidência visual a completar na pasta indicada) |
| **Escopo** | Shell admin (`AdminLayout`, `AdminSidebar`, `AdminHeader`) e módulos analíticos prioritários |

---

## 1. Objetivo

Diagnosticar a fragmentação de experiência (“mini Frankenstein”) no painel administrativo: navegação lateral, hierarquia de informação, filtros, estados vazios, feedback de atualização/recálculo e consistência visual entre rotas irmãs.

**Esta entrega não inclui implementação de código** — apenas diagnóstico, priorização e recomendações.

---

## 2. Referência de rotas (mapeamento)

### 2.1 Documento oficial da OS (V2 — 06/maio/2026)

O mapeamento fornecido para esta curadoria está versionado em:

- **`docs/MAPEAMENTO_DE_ROTAS_V2_06_MAIO_2026.md`**

Ele descreve rotas públicas, protegidas, gabinete, **admin (gestor + admin)** e **admin-only**, aliases, componentes de proteção (`ProtectedRoute`, `ProtectedAdminRoute`, `ProtectedAdminOnlyRoute`, `ProtectedVereadorRoute`) e **pendências** (rotas `/test-*`, consolidação de aliases, futuro **menu → rota → permissão**).

**Contexto de git citado na V2 (snapshot):** branch `dev`, alinhado a `origin/dev`, HEAD `66553ceb` (merge PR #208). O impacto desse merge foi sobretudo em **analytics admin** (filtros e volume de relatos: `VolumeFilters`, `useReportsVolume`, `ReportsAnalyticsPage`, etc.) **sem alteração de rotas em `App.tsx`**.

### 2.2 Referências adicionais e derivação código ↔ V2

- `docs/api-base/MAPEAMENTO_ROTAS.md` — referência histórica (Janeiro 2026).
- **`src/App.tsx`** + **`src/components/admin/AdminSidebar.tsx`** — fonte de verdade quando o código tiver **rotas ou entradas de menu** não listadas nas secções 2.4–2.5 da V2 (ver nota de reconciliação no final do ficheiro V2).

**Implicação para UX:** o documento V2 agrupa bem **admin vs admin-only**; o **menu lateral** pode expor rotas extra — isso aumenta o risco de “Frankenstein” se o mapa e o `routeNames` do header não forem atualizados em conjunto.

### 2.3 Rotas priorizadas nesta curadoria

Alinhadas à V2 secção **2.4** (gestor + admin) e ao foco da OS; todas constam do mapa V2:

| Rota | Componente principal |
|------|----------------------|
| `/admin` | `AdminDashboard` |
| `/admin/analytics` | `ReportsAnalyticsPage` |
| `/admin/trends` | `TrendDashboardPage` |
| `/admin/reports-heatmap` | `ReportsHeatmapPage` |
| `/admin/reports` | `ReportsManagement` |
| `/admin/referrals` | `ReferralsManagement` |

---

## 3. Metodologia

1. **Revisão estática** dos ficheiros acima e de padrões partilhados (`AdminLayout`, `AdminHeader`).
2. **Comparação cruzada** de: título `h1`, breadcrumbs, controlos de filtro, botão “Atualizar”, tratamento de erro/empty.
3. **Heurísticas** (Nielsen adaptadas): consistência, correspondência sistema/mundo real, controlo do utilizador, prevenção de erros, reconhecimento vs memorização, flexibilidade, estética minimalista, ajuda a diagnosticar problemas.

**Evidências visuais:** ver `docs/evidencias/admin/README.md` para nomes de ficheiros e o que capturar em cada print. Os PNG devem ser obtidos em ambiente de staging ou local com dados anonimizados.

---

## 4. Inventário visual por tela

Legenda: **H1** = título principal da página; **BC** = último segmento do breadcrumb em `AdminHeader` (`routeNames` ou fallback para segmento da URL).

| # | Rota | H1 (página) | BC (header) | Bloco de filtros / período | Atualizar / “vivo” | Estado vazio (observado no código) |
|---|------|-------------|-------------|----------------------------|--------------------|-------------------------------------|
| 1 | `/admin` | “Dashboard executivo” (`text-2xl font-bold`) | “Dashboard” | `FilterDatePicker` intervalo + “Todos os períodos” | `RefreshCw` + `AdminLiveIndicator` / realtime | KPIs com mensagens inline (“Sem relatos no período”, etc.) |
| 2 | `/admin/analytics` | “Análise de Relatos” (`text-3xl font-bold`) | “Analytics” (inglês) | Múltiplos: URL-sync (`?tab=`, `?dem.*`), presets, tema de widgets; **pós-PR #208:** filtros de volume / região (`VolumeFilters`, `useReportsVolume`) | `RefreshCw` + ações por módulo | Varia por tab (skeletons, listas vazias) |
| 3 | `/admin/trends` | “Tendência temporal” (`text-2xl font-semibold`) | Segmento cru `trends` | Select tipo + linha + período | `RefreshCw` sem timestamp global | Gráfico sem pontos / erro com `AlertTriangle` |
| 4 | `/admin/reports-heatmap` | “Mapa de calor de uso da plataforma” | Segmento cru `reports-heatmap` | Fonte + período + faixa informativa | `RefreshCw` | Depende de RPC/mapa |
| 5 | `/admin/reports` | “Gestão de Relatos” (`text-xl sm:text-2xl font-bold`) | “Gestão de Relatos” | Data, tipo, estado, severidade, região, categoria, pesquisa, vista lista/kanban | Ações dispersas + `refetch` | “Nenhum relato encontrado” |
| 6 | `/admin/referrals` | “Gestão de Encaminhamentos” (`text-3xl font-bold`) | “Encaminhamentos” | Pesquisa, estado, tipo, paginação | `RefreshCw` | Lista vazia após filtros |

**Síntese do inventário**

- **Três escalas de título** para páginas “irmãs” (`text-2xl` / `text-3xl` / mistura `font-semibold` vs `font-bold`).
- **Breadcrumbs**: mapeamento parcial em `AdminHeader` → várias rotas analíticas caem no **nome técnico do segmento** (ex.: `trends`, `reports-heatmap`), em contraste com “Dashboard” ou “Gestão de Relatos”.
- **Filtro de período**: no dashboard é **global e explícito**; em analytics é **rico e sincronizado com URL**; em trends/heatmap é **local à página** — não há continuidade ao saltar do `/admin` para `/admin/analytics` (os cliques dos KPIs navegam para `/admin/analytics` **sem query de período**).
- **Feedback de “última atualização”**: forte no dashboard (`AdminLiveIndicator`); **ausente ou só spin** nas páginas trends/heatmap.

---

## 5. Problemas priorizados (≥ 8)

| ID | Severidade | Problema | Evidência / onde se vê |
|----|------------|----------|-------------------------|
| P1 | **P0** | **Títulos e peso visual inconsistentes** entre rotas irmãs (H1 `text-2xl` vs `text-3xl`, `font-semibold` vs `font-bold`). | `AdminDashboard`, `ReportsAnalyticsPage`, `ReferralsManagement`, `TrendDashboardPage`, `ReportsHeatmapPage`, `ReportsManagement` |
| P2 | **P0** | **Breadcrumb desalinhado da língua e do produto**: “Analytics” em inglês enquanto o menu e o H1 dizem “Análise de Relatos”; rotas sem entrada em `routeNames` mostram **slug cru**. | `AdminHeader` (`routeNames`), rotas `/admin/trends`, `/admin/reports-heatmap`, etc. |
| P3 | **P0** | **Período do dashboard não propaga** para `/admin/analytics` (nem para trends/heatmap): risco de o utilizador comparar números de **janelas temporais diferentes** sem aviso. | `AdminDashboard` (`navigate("/admin/analytics")`); filtros de `ReportsAnalyticsPage` |
| P4 | **P1** | **Nomenclatura paralela** “Relatos” (sidebar) vs “Gestão de Relatos” (H1) vs “Triagem” (kanban separado): hierarquia mental **operacional vs analítico** pouco explícita. | `AdminSidebar`, `ReportsManagement`, rota `/admin/triagem` |
| P5 | **P1** | **Lista longa e plana na secção GESTÃO** do sidebar: muitas entradas analíticas misturadas com operação (relatos, triagem, encaminhamentos) **sem agrupamento visual** (subtítulos ou colapsáveis por domínio). A V2 recomenda complementar com **menu → rota → permissão** para auditar esse desalinhamento. | `AdminSidebar` `menuSections`; `MAPEAMENTO_DE_ROTAS_V2_06_MAIO_2026` §4 |
| P6 | **P1** | **Labels de produto misturam PT e EN** (ex.: tab “Drill-down”, “Analytics” no header), quebrando a promessa de UI totalmente em português. | `ReportsAnalyticsPage` (`TAB_LABELS`), `AdminHeader` |
| P7 | **P1** | **Feedback de recálculo fraco** em trends/heatmap: botão “Atualizar” sem “última sincronização” ou contexto do que foi atualizado (contrasta com o dashboard). | `TrendDashboardPage`, `ReportsHeatmapPage` vs `AdminDashboard` |
| P8 | **P2** | **Padrão de cabeçalho de página** varia: algumas usam ícone + subtítulo em `Card`/bloco; outras só H1 + parágrafo; **densidade** do primeiro fold não é homogénea. | Comparar headers das 6 rotas |
| P9 | **P2** | **Estado inicial de submenus** em `AdminSidebar`: `openSubmenus` inclui `'configuracoes'` sem cedilha, enquanto a chave derivada do título “Configurações” usa `configurações` — **risco de submenu fechado por defeito** ou lógica de toggle incoerente. | `AdminSidebar` (`useState` inicial vs `item.title.toLowerCase().split(' ')[0]`) |
| P10 | **P2** | **Encaminhamentos**: modelo de dados tipado como `Record<string, unknown>` na UI — sinal de **área menos “curada”** que analytics (maior risco de campos inesperados na vista de detalhe). | `ReferralsManagement` |
| P11 | **P2** | **Rotas `/test-*` e `/debug/rbac`** (V2 §2.2): expostas no mesmo router que produção — risco de **superfície confusa** para auditoria de UX e segurança percebida; alinhado à pendência V2 de validar permanência em produção. | `App.tsx`; V2 §4 |

*(P0 = bloqueia confiança ou decisão; P1 = fricção frequente; P2 = polimento / dívida técnica visível.)*

---

## 6. Proposta de reorganização do menu admin

Objetivo: reduzir carga cognitiva e separar **Operar**, **Analisar** e **Configurar**.

### 6.1 Estrutura sugerida (alto nível)

1. **Visão geral**  
   - Dashboard executivo (`/admin`)

2. **Operação de relatos**  
   - Relatos (lista/gestão) (`/admin/reports`)  
   - Triagem (`/admin/triagem`)  
   - Encaminhamentos (`/admin/referrals`)  
   - *(Opcional)* Correções de equipamentos (se RBAC)

3. **Inteligência e análise** (submenu colapsável “Análise”)  
   - Análise de relatos (`/admin/analytics`)  
   - Tendência temporal (`/admin/trends`)  
   - Mapa de calor (`/admin/reports-heatmap`)  
   - Avaliações por dimensão (`/admin/evaluation-analytics`)  
   - Polarização de avaliações (`/admin/avaliacoes-polarizacao`)  
   - Intensidade de demanda (`/admin/intensidade-demanda`)  
   - Acurácia da classificação (`/admin/classification-accuracy`)

4. **Audiências e comissões** (se quiser isolar domínio institucional)  
   - Comissões (`/admin/commissions`)

5. **Sistema e governança** (mantém secção atual, com nomes alinhados ao PT)  
   - Documentação, Configurações, Logs, Permissões, Agendamentos, Padrões/Previsões/Anomalias, Central de alertas, etc.

### 6.2 Princípios

- **No máximo 7 itens visíveis** por nível sem scroll em desktop típico; o resto entra em **submenu “Análise”** ou **“Mais ferramentas”**.
- **Ícones e ordem**: agrupar por função (tempo, espaço, avaliação, texto/classificação), não só por ordem de entrega histórica.
- **Labels**: sempre PT no menu e no breadcrumb; slugs só na URL.

---

## 7. Quick wins de UX (sem código nesta tarefa)

| # | Quick win | Impacto |
|---|-----------|---------|
| Q1 | Completar `routeNames` em `AdminHeader` para **todas** as rotas admin ativas (PT). | Breadcrumb útil e profissional |
| Q2 | Normalizar **H1** (`text-2xl font-semibold tracking-tight` + subtítulo) nas 6 rotas prioritárias. | Consistência visual imediata |
| Q3 | Ao navegar do dashboard para analytics, **propagar período** via query (`?from=&to=`) ou mostrar banner “Período independente da análise detalhada”. | Evita conclusões erradas |
| Q4 | Em trends/heatmap, reutilizar padrão **“Última atualização: …”** (mesmo componente ou variante). | Confiança no dado |
| Q5 | Renomear breadcrumb “Analytics” → **“Análise de relatos”** (alinhado ao menu). | Coerência linguística |
| Q6 | Tooltip ou texto curto no ícone “Atualizar” explicando **o que** é recarregado (RPC vs cache local). | Ações com contexto |
| Q7 | Secção vazia padronizada: ícone + título + **CTA** (“Limpar filtros” / “Ver todos os relatos”). | Menos beco sem saída |
| Q8 | Corrigir chaves de `openSubmenus` para coincidir com `toggleSubmenu` (cedilhas / token único). | Comportamento previsível |

---

## 8. Definição de pronto (DoD) — verificação

| Critério | Estado |
|----------|--------|
| Inventário visual por tela (prioritárias) | ✅ Secção 4 |
| ≥ 8 problemas priorizados | ✅ Secção 5 (11 itens) |
| Proposta de reorganização do menu admin | ✅ Secção 6 |
| Pasta de evidências + guia de prints | ✅ `docs/evidencias/admin/README.md` |
| Mapeamento de rotas V2 (06/maio/2026) integrado | ✅ `docs/MAPEAMENTO_DE_ROTAS_V2_06_MAIO_2026.md` + Secção 2 do relatório |
| Sem implementação de código nesta tarefa | ✅ |

---

## 9. Anexos

- **Mapeamento de rotas (OS / V2):** `docs/MAPEAMENTO_DE_ROTAS_V2_06_MAIO_2026.md`
- **Evidências (capturas):** `docs/evidencias/admin/` (ver `README.md` na pasta)
- **Rotas:** `src/App.tsx`
- **Menu:** `src/components/admin/AdminSidebar.tsx`
- **Breadcrumb:** `src/components/admin/AdminHeader.tsx`
- **Mapeamento legado:** `docs/api-base/MAPEAMENTO_ROTAS.md`

---

*Fim do relatório #5696256 — Curadoria visual e UX do Admin.*
