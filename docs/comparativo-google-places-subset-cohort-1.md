# Google Places — subconjunto por coorte (Marco C)

Estimativa de custo (Place Details) para o recorte definido no comparativo geral de equipamentos (secao 5), com base na query `scripts/sql/diagnostic-google-places-subset-cohort.sql`.

**Cambio ilustrativo:** R$ 5,50 por US$ 1,00.

**Google Places (estimativa):** 1 chamada Place Details (Enterprise + Atmosphere) por POI; US$ 25 / 1.000 apos 1.000 gratis/mes; sem ponto de onibus; sem Popular times.

## 1. O que entra no subconjunto

| Area | Criterio (resumo) |
|------|-------------------|
| Metro | `transit_station` + `estacao_metro` / `estacao_metro_projeto` |
| Trem | `transit_station` + `estacao_trem` / `estacao_trem_projeto` |
| Terminal de onibus | `transit_station` + `terminal_onibus` |
| Escola (4 camadas SME/GeoSampa) | `school` + `ensino_fundamental_medio`, `educacao_infantil`, `ensino_tecnico`, `senai_sesi_senac` |
| Parque, centro esportivo, CEU, teatro/cinema, biblioteca, museu | `service_type`: `park`, `sports_center`, `ceu`, `theater`, `library`, `museum` |

## 2. Contagens por coorte e `service_type` (Marco C, alinhado ao comparativo geral)

| Linha | N |
|-------|--:|
| Escola (4 camadas SME/GeoSampa) | 57.962 |
| Transporte (metro, trem, terminal) | 13.199 |
| Parque | 6.125 |
| Centro esportivo | 620 |
| CEU | 513 |
| Teatro / cinema | 410 |
| Biblioteca | 384 |
| Museu | 167 |
| **Total** | **79.380** |

As linhas de Escola e Transporte entram pela primeira parte do recorte SQL (por coorte/source_layer). As demais linhas entram diretamente por `service_type`. O transporte desta tabela representa somente metro, trem e terminal de onibus; nao inclui pontos/paradas de onibus.

## 3. Total do subconjunto e custo ilustrativo (Marco C)

Formula: `max(0, N - 1.000) * 0,025 USD`; BRL = USD * 5,50.

| Metrica | Valor |
|---------|------:|
| POIs (N) | 79.380 |
| USD (aprox.) | 1.959,50 |
| BRL (aprox.) | 10.777,25 |

Valores ilustrativos; nao substituem fatura Google. Ver tambem: `comparativo-equipamentos-antes-depois-google-places.md`.
