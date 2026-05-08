# Comparativo: UBS e hospitais — `public_services` (B × C) e Google Places (USD / BRL)

Valores alinhados ao documento [`comparativo-equipamentos-antes-depois-google-places.md`](comparativo-equipamentos-antes-depois-google-places.md), **restringindo a comparação** aos tipos `ubs` e `hospital`.

**Câmbio ilustrativo:** R$ **5,50** por US$ **1,00**.

**Google Places (estimativa):** 1 chamada **Place Details (Enterprise + Atmosphere)** por POI; **US$ 25 / 1 000** após **1 000** grátis/mês; **sem** ônibus (`transit_station`); **sem** lotação/Popular times.

---

## 1. Por `service_type` — apenas **UBS** e **hospital** (Marcos **B** × **C**)

| service_type | B | C | Δ |
|--------------|--:|--:|--:|
| ubs | 966 | 966 | 0 |
| hospital | 699 | 699 | 0 |
| **Total (UBS + hospital)** | **1 665** | **1 665** | **0** |

A limpeza de transporte + *junk* (**B → C**) **não alterou** as contagens de UBS nem de hospitais.

---

## 2. Google Places — volume e custo **só** UBS + hospitais

**POIs considerados:** soma das linhas `ubs` + `hospital` (iguais em **B** e **C**).

| Métrica | Valor |
|--------|------:|
| POIs (**N**) | **1 665** |

**Custo (fórmula:** `max(0, N − 1 000) × 0,025` USD; **BRL** = USD × 5,50)

| Referência | POIs (N) | USD (≈) | BRL (≈) |
|------------|---------:|--------:|--------:|
| **UBS + hospitais** (Marcos **B** e **C**) | 1 665 | **16,63** | **91,44** |

*(1 665 − 1 000) × 0,025 = 16,625 USD.*

---

**OBS:** Para o **universo completo** de POIs (exceto ônibus) e economia **B − C** no Google Places, ver o comparativo geral no ficheiro ligado acima.

*Valores ilustrativos; não substituem fatura Google.*
