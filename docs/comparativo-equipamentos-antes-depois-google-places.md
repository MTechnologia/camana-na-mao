# Comparativo completo: equipamentos (linha do tempo) e custo Google Places (USD e BRL)

**Moeda:** custos Google em **USD**; coluna **BRL** usa **câmbio de referência ilustrativo R$ 5,50 por US$ 1,00** (maio/2026 — ajuste para a taxa do dia na análise financeira real).  
**Escopo:** tabela **`public.public_services`** no projeto Supabase que acompanhamos neste trabalho (GeoSampa + dedupe + limpezas).  
**Places:** estimativas **hipotéticas** (1 chamada Place Details por POI por “onda” de refresh); **sem** pontos de ônibus no volume faturável; **sem** Popular times; ver [preços Places API](https://developers.google.com/maps/billing-and-pricing/pricing#places-pricing).

---

## 1. “Ontem tínhamos mais de 10 milhões de equipamentos?”

**Não — nesse fluxo e nessa base, os números documentados foram sempre na casa de centenas de milhares ou ~1 milhão de linhas, não 10 milhões.**

Possíveis confusões:

| O que pode ter sido lembrado | Número real neste projeto |
|------------------------------|---------------------------|
| “Quase 1 milhão” de **linhas de escola** (incluindo duplicatas soft) | **960 912** linhas `school` **antes** de apagar soft-duplicatas (`duplicate_of` preenchido) — ainda abaixo de 1 milhão |
| **Total geral** `public_services` após dedupe escola e antes transport/junk | **930 927** linhas |
| **Total** após transport + junk | **664 331** linhas |
| “10 milhões” | **Não aparece** nas contagens de `public_services` que usámos; pode ser **outro ambiente**, **outra tabela**, **features GeoJSON** no sync, ou **ordem de grandeza informal** — convém cruzar com o dashboard Supabase / `count(*)` na base exata |

Se tiverem um print ou query que mostre 10M, vale alinhar **qual tabela** e **qual filtro** (ex.: histórico de sync, log, outro schema).

---

## 2. Linha do tempo completa (marcos do cadastro)

Todas as contagens abaixo referem-se a **`public_services`** canônicos (`duplicate_of IS NULL`) salvo onde indicado.

### 2.1 Totais agregados

| Marco | Momento | Total linhas `public_services` | Notas |
|------|---------|----------------------------------|--------|
| **A** | Escolas ainda com **soft-duplicatas** (antes do job de delete em massa) | **~1 715 658** | Contagem via CLI em formato científico numa query (`1.715658e+06`) — **inclui** ~918k linhas `school` duplicadas + resto do cadastro |
| **B** | **Após** remover **918 544** soft-duplicatas de escola; **antes** transport + junk | **930 927** | Base “limpa” de duplicata de escola; `other` ainda grande |
| **C** | **Hoje** — após `run-delete-transport-other-batches` + `run-delete-junk-other-batches` | **664 331** | Queda forte em `other` |

Variações:

- **B − C** = **−266 596** linhas (limpeza `other` transporte + junk, etc.).  
- **Escolas canônicas** (`school`, `duplicate_of` nulo): na ordem de **~57 964** após o job (números finos no `diagnostic-school-totals`).

### 2.2 Escolas (`service_type = school`) — só para contexto

| Marco | `school` total (linhas) | Canônicos (`duplicate_of` nulo) | Soft-duplicatas |
|-------|-------------------------|-----------------------------------|-----------------|
| Antes do delete em massa | **960 912** | **42 368** | **918 544** |
| Depois do delete | **≈ 57 964** | **≈ 57 964** | **0** |

*(Pequenas diferenças para **57 962** na contagem por tipo vêm de sincronizações entre instantes de medição.)*

---

## 3. Por `service_type`: antes (marco **B**) × depois (marco **C**)

| service_type | Antes (B) | Depois (C) | Δ |
|----------------|----------:|-----------:|--:|
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

Atualizar “depois”: `scripts/sql/diagnostic-count-by-service-type.sql`.

---

## 4. Google Places — comparação de volume (sem ônibus)

**Regra:** POIs considerados para custo = **total `public_services` − linhas `transit_station`** (não enriquecer **537 675** paradas).

| Marco | Total | Menos ônibus | POIs para Places |
|-------|------:|-------------:|-----------------:|
| **B** (antes transport/junk) | 930 927 | 537 675 | **393 252** |
| **C** (depois) | 664 331 | 537 675 | **126 656** |

---

## 5. Google Places — valores **USD** e **BRL**

**SKU de referência:** Place Details **Enterprise + Atmosphere** — primeira faixa paga **US$ 25 por 1 000** chamadas após **1 000** gratuitas/mês ([tabela](https://developers.google.com/maps/billing-and-pricing/pricing#places-pricing)).

**Fórmula simplificada (1ª faixa):**  
`USD ≈ max(0, N − 1000) × 0,025`  
`BRL ≈ USD × 5,50`

### 5.1 Onda completa “tudo exceto ônibus”

| Marco | N (POIs) | Chamadas cobráveis (≈) | USD (≈) | BRL (≈, R$ 5,50) |
|-------|----------|-------------------------|--------:|-----------------:|
| **B** | 393 252 | 392 252 | **9 806** | **53 933** |
| **C** | 126 656 | 125 656 | **3 141** | **17 276** |
| **Economia (B − C)** | — | — | **6 665** | **36 658** |

### 5.2 Recorte **escolas + UBS + hospitais** (~**59 627** — inalterado entre B e C)

| Métrica | USD (≈) | BRL (≈, R$ 5,50) |
|---------|--------:|-----------------:|
| Chamadas cobráveis ≈ 58 627 | **1 466** | **8 063** |

*(`max(0, 59627−1000)×0,025`.)*

### 5.3 Marco **A** (se alguém quisesse enriquecer **tudo** incluindo duplicatas de escola — **não recomendado**)

| Métrica | Valor |
|---------|------:|
| Total linhas (incl. soft-dup escola) | **~1 715 658** |
| Menos ônibus | 537 675 |
| POIs “brutos” | **~1 177 983** |
| USD (1ª faixa, ≈) | **~29 450** |
| BRL (≈) | **~161 975** |

Isto **não** é o cenário desejado após dedupe; serve só para mostrar por que **deduplicar antes** de qualquer Places reduz custo e ruído.

---

## 6. Resumo executivo

| Pergunta | Resposta |
|----------|----------|
| 10 milhões de equipamentos? | **Não** na `public_services` que medimos; houve **~1,72M linhas** no pico agregado (contagem que incluía duplicatas) e **~931k** após limpar escolas. |
| O que mudou de B para C? | **−266 596** linhas, sobretudo **`other`**. |
| Places sem ônibus | Volume cai de **~393k** para **~127k** POIs → **~US$ 6,7k** (~**R$ 36,7k**) a menos por “onda” no modelo simplificado acima. |
| Saúde + educação (59k) | **~US$ 1,5k** ≈ **R$ 8,1k** por onda (inalterado entre B e C). |

---

*Documento para decisão interna; não substitui fatura Google nem câmbio comercial. Ajuste **R$/US$** e faixas de preço conforme contrato e volume real na conta Google Cloud.*
