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

---

## 5. Subconjunto para Google Places (por camada / tipo)

Agrupamento explícito para **estimativa de Place Details** só sobre estes POIs (exclui, entre outros, **`ponto_onibus`** e escolas fora das quatro camadas listadas). Inclui **saúde** no mesmo sentido do mapa: `service_type = 'hospital'` (hospitais, UPAs / urgência–emergência e afins por `source_layer`).

### 5.1. Definição das linhas (Marco **C** = estado actual da tabela)

| Linha (rótulo) | Critério em `public_services` |
|------------------|------------------------------|
| Estação metrô | `service_type = 'transit_station'` e `source_layer` ∈ `estacao_metro`, `estacao_metro_projeto` |
| Estação trem | `service_type = 'transit_station'` e `source_layer` ∈ `estacao_trem`, `estacao_trem_projeto` |
| Terminal de ônibus | `service_type = 'transit_station'` e `source_layer = 'terminal_onibus'` |
| Rede pública ensino fundamental/médio | `service_type = 'school'` e `source_layer = 'ensino_fundamental_medio'` (WFS *equipamento_educacao_rede_publica*) |
| Educação infantil rede pública | `service_type = 'school'` e `source_layer = 'educacao_infantil'` (*equipamento_educacao_infantil_rede_publica*) |
| Ensino técnico rede pública | `service_type = 'school'` e `source_layer = 'ensino_tecnico'` (*equipamento_educacao_ensino_tecnico_rede_publica*) |
| SENAI / SESI / SENAC | `service_type = 'school'` e `source_layer = 'senai_sesi_senac'` (*equipamento_educacao_senai_sesi_senac*) |
| Urgência / emergência (ex.: UPA) | `service_type = 'hospital'` e `source_layer = 'urgencia_emergencia'` |
| Hospital | `service_type = 'hospital'` e `source_layer = 'hospital'` |
| Ambulatórios especializados | `service_type = 'hospital'` e `source_layer = 'equipamento_saude_ambulatorios_especializados'` |
| Saúde mental | `service_type = 'hospital'` e `source_layer = 'equipamento_saude_saude_mental'` |
| CCZ | `service_type = 'hospital'` e `source_layer = 'equipamento_ccz'` |
| Outros equipamentos de saúde (família hospital) | `service_type = 'hospital'` e `source_layer = 'equipamento_saude_outros'` |
| Unidades DST / AIDS | `service_type = 'hospital'` e `source_layer = 'equipamento_saude_unidades_dst_aids'` |
| Parque (`park`) | `service_type = 'park'` |
| Centro esportivo (`sports_center`) | `service_type = 'sports_center'` |
| CEU (`ceu`) | `service_type = 'ceu'` |
| Teatro / cinema (`theater`) | `service_type = 'theater'` |
| Biblioteca (`library`) | `service_type = 'library'` |
| Museu (`museum`) | `service_type = 'museum'` |

*Nota (escolas):* `rede_privada`, `educacao_outros` e linhas sem `source_layer` compatível (ex.: só Escola Aberta com outro layer) **não entram** nas quatro linhas de escola; o detalhe por coorte está na 1.ª `SELECT` de `scripts/sql/diagnostic-google-places-subset-cohort.sql`.

*Nota (saúde):* qualquer `service_type = 'hospital'` com `source_layer` não mapeado na tabela acima cai na coorte `hospital_source_layer_outros` na mesma query (auditoria).

### 5.2. Contagens Marco **C** (preencher a partir do SQL)

Os totais por **`service_type`** na secção 3 já batem com o estado **C** para tipos **sem** subdivisão por camada:

| Linha | Marco **C** (N) |
|-------|----------------:|
| Parque | 6 125 |
| Centro esportivo | 620 |
| CEU | 513 |
| Teatro / cinema | 410 |
| Biblioteca | 384 |
| Museu | 167 |

Para **metrô, trem, terminal**, **escolas** (quatro `source_layer`), **saúde tipo hospital** (por `source_layer`) e totais agregados, executar **`scripts/sql/diagnostic-google-places-subset-cohort.sql`** no Supabase (1.ª `SELECT` = por coorte; 2.ª = **N** total do subconjunto e custo ilustrativo).

| Linha (agregado saúde) | Marco **C** (N) |
|------------------------|----------------:|
| Saúde (hospital / UPA / afins) | 699 |

*(699 = todos os `service_type = 'hospital'` no Marco C; alinha com a secção 3 deste documento.)*

### 5.3. Custo Google Places só neste subconjunto (Marco **C** — resultado SQL)

Mesma regra da secção 4: **`max(0, N − 1 000) × 0,025` USD**; **BRL** = USD × **5,50** (resultado da 2.ª query em `scripts/sql/diagnostic-google-places-subset-cohort.sql`).

| Métrica | Valor |
|--------|------:|
| **POIs (N)** | **80 079** |
| **USD (≈)** | **1 976,98** |
| **BRL (≈)** | **10 873,36** |

*(80 079 − 1 000) × 0,025 = **1 976,98** USD; BRL = USD × 5,50 = **10 873,36** (2.ª query SQL).*

Documento Word gerado: **`docs/comparativo-google-places-subset-cohort.docx`** (e resumo em **`docs/comparativo-google-places-subset-cohort.md`**). Para atualizar números no futuro, volte a correr o SQL, ajuste o script `scripts/generate_comparativo_google_places_subset_docx.py` e regenere o `.docx`.

*O primeiro milhão de chamadas grátis do Google é por projeto/conta, não por categoria; esta tabela é só para dimensionar este recorte.*
