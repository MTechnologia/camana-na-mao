# Evidências visuais — Admin (UX #5696256)

Lista de rotas canónica para esta auditoria: **`docs/MAPEAMENTO_DE_ROTAS_V2_06_MAIO_2026.md`** (secções 2.4–2.5 admin).

Coloque aqui **capturas de ecrã em PNG** (preferencialmente 1440px ou superior de largura útil, com dados anonimizados). Cada ficheiro corresponde a um item do inventário em `docs/CURADORIA_UX_ADMIN.md`.

## Lista de ficheiros esperados

| Ficheiro | Rota a capturar | O que evidenciar |
|----------|-----------------|------------------|
| `E01-admin-dashboard.png` | `/admin` | Filtro de datas, KPIs, indicador “ao vivo”, botão Atualizar |
| `E02-admin-analytics.png` | `/admin/analytics` | H1, tabs, barra de ferramentas (export/presets/tema), URL com `?tab=` opcional |
| `E03-admin-trends.png` | `/admin/trends` | Filtros tipo/linha/período, gráfico, botão Atualizar |
| `E04-admin-reports-heatmap.png` | `/admin/reports-heatmap` | Faixa informativa de bounds SP, filtros, mapa |
| `E05-admin-reports.png` | `/admin/reports` | KPIs resumo, filtros, lista ou kanban, estado vazio se possível |
| `E06-admin-referrals.png` | `/admin/referrals` | KPIs, tabela, diálogo de detalhe (se aplicável) |
| `E07-admin-header-breadcrumb-gap.png` | Qualquer rota **sem** `routeNames` (ex.: `/admin/trends`) | Breadcrumb mostrando segmento cru vs rota com nome bonito |
| `E08-admin-sidebar-scroll.png` | `/admin` com sidebar visível | Comprimento da lista “GESTÃO” e necessidade de scroll |

## Boas práticas

1. Usar o mesmo utilizador de teste e o mesmo tema (claro **ou** escuro) em todas as capturas.
2. Mascarar e-mails, nomes próprios e moradas se forem dados reais.
3. Nomear ficheiros exatamente como na tabela para o relatório poder referenciar de forma estável.

## Estado

- [ ] E01 … E08 anexados (substituir estes checkboxes ao concluir a captura).

Quando os PNG estiverem no repositório, atualizar a secção “Evidências” do relatório principal com miniaturas ou links relativos, se desejado.
