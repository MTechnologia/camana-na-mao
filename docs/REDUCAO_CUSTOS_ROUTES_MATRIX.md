# Redução de Custos — Google Maps Platform (Routes / Route Matrix)

## Contexto
Identificamos aumento relevante de custo no **Google Maps Platform – Routes**, concentrado na SKU:
`Routes: Compute Route Matrix Essentials`.

Como o **Route Matrix** é cobrado por **elementos** (combinações de `origins × destinations`), pequenas explosões no volume efetivo de matrizes/elementos podem gerar custo elevado mesmo com número de requests aparentemente “ok”.

## Margem de Referência (PMO)
**Custo de referência considerado:** `R$ 5.347,58 / mês`

A partir das otimizações aplicadas, a expectativa de economia (em relação à referência) fica na faixa:

- `25%` → custo ≈ **R$ 4.010,68**
- `40%` → custo ≈ **R$ 3.208,55**
- `60%` → custo ≈ **R$ 2.139,03**
- `75%` → custo ≈ **R$ 1.336,90**

**Escala mais provável:** **40%–60%** (tendendo mais para ~40–50% em uso “normal”, e podendo chegar a 60%+ quando houver maior reaproveitamento via cache).

## O que foi feito (otimizações no app)
As melhorias foram aplicadas principalmente no fluxo **“Perto de você”**, onde o hook `RouteMatrix.computeRouteMatrix` é executado via `useGoogleDistanceMatrix`.

1. **Debounce antes de recalcular rotas**
   - Ajuste implementado para evitar chamadas repetidas em rajadas durante mudanças rápidas de **raio/filtros**.
   - Resultado: menos execuções “efetivas” do Route Matrix.

2. **Desacoplamento da ordenação visual do input da matrix**
   - Mudanças em `sortBy` (ex.: ordenar por rating) passaram a não disparar novamente o cálculo pago da matrix.
   - A matrix passa a usar uma base mais estável (ordenada por haversine), reduzindo recomputações desnecessárias.

3. **Cache em memória (TTL)**
   - Cache por chave composta por:
     - `profile` (walking/driving)
     - origem aproximada (lat/lng arredondados)
     - lista de `destinations` (ids ordenados)
   - TTL configurado: **10 minutos**
   - Resultado: aumenta **Cache Hit** e reduz chamadas reais ao Routes API.

4. **Cap de destinos por execução**
   - Limitamos o número total de destinos enviados à rodada do matrix para reduzir o tamanho das matrizes.
   - Mantido o chunking de 25 destinos por request, com cap de destinos totais por execução para evitar matrizes grandes demais.

## Telemetria e validação no Admin
Para permitir acompanhamento com dados reais (e não apenas estimativas), criamos telemetria no Supabase e cards no **AdminDashboard**.

### Tabela
- `public.routes_usage_metrics`

### Campos principais
- `context` (ex.: `nearby_services`)
- `profile` (`walking`/`driving`)
- `destinations_count`
- `elements_count` (modelo do hook para estimar origem×destino)
- `chunk_requests`
- `cache_hit`
- `created_at`

### Cards no Admin (últimos 30 dias)
- **Eventos Matrix** (execuções registradas)
- **Elements (origem × destino)** (base para estimativa interna)
- **Cache Hit (%)**
- **Custo Estimado (BRL)** (estimativa interna via elements)

## Como validar a economia (passo a passo)
1. Antes e depois, coletar no Admin:
   - `Events Matrix`
   - `Elements`
   - `Cache Hit`
2. No GCP Billing (mesma janela de tempo), comparar o custo oficial:
   - Service: `Google Maps Platform – Routes`
   - SKU: `Routes: Compute Route Matrix Essentials`
3. Correlacionar:
   - redução de elementos/execuções efetivas ↔ redução de custo.



