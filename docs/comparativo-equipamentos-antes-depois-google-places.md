# Comparativo: antes × depois (`public_services`) e Google Places (USD / BRL)

**Câmbio ilustrativo:** R$ **5,50** por US$ **1,00**.  
**Google Places (estimativa):** 1 chamada **Place Details (Enterprise + Atmosphere)** por POI; **US$ 25 / 1 000** após **1 000** grátis/mês; **sem** ônibus (`transit_station`); **sem** lotação/Popular times.

---

## 1. Totais `public_services`

| Marco | Situação | Linhas |
|------|----------|-------:|
| **A** | Com soft-duplicatas de escola (pico) | **~1 715 658** |
| **B** | Após dedupe escola; antes transport + junk | **930 927** |
| **C** | Após transport + junk | **664 331** |
| **B → C** | Variação | **−266 596** |

---

## 2. Escolas (`school`)

| | Total `school` | Canônicos | Soft-dup |
|--|---------------:|----------:|---------:|
| Antes (delete em massa) | 960 912 | 42 368 | 918 544 |
| Depois | ~57 964 | ~57 964 | 0 |

---

## 3. Por `service_type` — **B** × **C**

| service_type | B | C | Δ |
|--------------|--:|--:|--:|
| transit_station | 537 675 | 537 675 | 0 |
| other | 268 761 | 2 131 | −266 630 |
| school | 57 962 | 57 962 | 0 |
| recycling_point | 31 674 | 31 674 | 0 |
| daycare | 13 800 | 13 800 | 0 |
| park | 6 125 | 6 125 | 0 |
| social_assistance | 4 424 | 4 458 | +34 |
| accessibility | 3 713 | 3 713 | 0 |
| street_market | 1 924 | 1 924 | 0 |
| ubs | 966 | 966 | 0 |
| hospital | 699 | 699 | 0 |
| sports_center | 620 | 620 | 0 |
| police_station | 552 | 552 | 0 |
| ceu | 513 | 513 | 0 |
| theater | 410 | 410 | 0 |
| library | 384 | 384 | 0 |
| market | 238 | 238 | 0 |
| museum | 167 | 167 | 0 |
| cemetery | 92 | 92 | 0 |
| fire_station | 80 | 80 | 0 |
| subprefeitura | 64 | 64 | 0 |
| city_market | 48 | 48 | 0 |
| community_center | 36 | 36 | 0 |

---

## 4. Google Places — volume (sem ônibus) e custo

**POIs** = total − **537 675** `transit_station`.

| Marco | Total | POIs (sem ônibus) |
|------|------:|-----------------:|
| **B** | 930 927 | **393 252** |
| **C** | 664 331 | **126 656** |

**Custo (fórmula:** `max(0, POIs − 1000) × 0,025` USD; **BRL** = USD × 5,50)

| Referência | POIs (N) | USD (≈) | BRL (≈) |
|------------|---------:|--------:|--------:|
| Levantamento **terça** (baseline) | — | **~59 000** | **~324 500** |
| Marco **B** | 393 252 | **9 806** | **53 933** |
| Marco **C** | 126 656 | **3 141** | **17 276** |
| **Economia B − C** | −266 596 | **6 665** | **36 658** |
| Escolas + UBS + hospitais (~59 627) | 59 627 | **1 466** | **8 063** |
| Pico **A**, sem ônibus (~1 177 983) | 1 177 983 | **29 450** | **161 975** |

---

**OBS** Considerar Marco **C**
*Valores ilustrativos; não substituem fatura Google.*
