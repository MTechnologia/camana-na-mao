# Google Places — subconjunto por coorte (Marco **C**)

Documento focado na **estimativa de custo** (Place Details) para o recorte definido em  
[`comparativo-equipamentos-antes-depois-google-places.md`](comparativo-equipamentos-antes-depois-google-places.md) (secção 5), com resultado da query  
`scripts/sql/diagnostic-google-places-subset-cohort.sql` (2.ª `SELECT`).

**Câmbio ilustrativo:** R$ **5,50** por US$ **1,00**.

**Premissas Google:** 1 chamada **Place Details (Enterprise + Atmosphere)** por POI; **US$ 25 / 1 000** após **1 000** grátis/mês; **sem** `ponto_onibus`; **sem** Popular times.

---

## 1. O que entra no subconjunto

| Área | Critério (resumo) |
|------|-------------------|
| Metrô | `transit_station` + `estacao_metro` / `estacao_metro_projeto` |
| Trem | `transit_station` + `estacao_trem` / `estacao_trem_projeto` |
| Terminal ônibus | `transit_station` + `terminal_onibus` |
| Escola (4 camadas) | `school` + `ensino_fundamental_medio`, `educacao_infantil`, `ensino_tecnico`, `senai_sesi_senac` |
| Parque, centro esportivo, CEU, teatro/cinema, biblioteca, museu | `service_type` ∈ `park`, `sports_center`, `ceu`, `theater`, `library`, `museum` |

---

## 2. Contagens só por `service_type` (Marco **C**, alinhado à secção 3 do comparativo geral)

| Linha | N |
|------|--:|
| Parque | 6 125 |
| Centro esportivo | 620 |
| CEU | 513 |
| Teatro / cinema | 410 |
| Biblioteca | 384 |
| Museu | 167 |

*(Metrô, trem, terminal e as quatro linhas de escola vêm da 1.ª query do SQL — somadas ao total abaixo.)*

---

## 3. Total do subconjunto e custo ilustrativo (Marco **C**)

| Métrica | Valor |
|--------|------:|
| **POIs (N)** | **79 380** |
| **USD (≈)** | **1 959,50** |
| **BRL (≈)** | **10 777,25** |

**Fórmula:** `max(0, N − 1 000) × 0,025` USD; BRL = USD × 5,50.

*(79 380 − 1 000) × 0,025 = 1 959,50 USD.*

---

*Valores ilustrativos; não substituem fatura Google.*
