# Relatório técnico — Detecção de múltiplos equipamentos simultâneos (OS-06 / #7333945)

## Objetivo

Quando o cidadão permanece dentro do raio de **50 m** de **dois ou mais** equipamentos públicos ao mesmo tempo (ex.: UBS ao lado de escola), o sistema deve:

1. **Iterar** sobre todos os equipamentos detectados no raio.
2. **Criar visitas independentes** no banco para cada equipamento **sem** `service_visit` nas **últimas 24 h** (critério alinhado à Edge Function, campo `visited_at`).
3. **Disparar apenas uma** notificação proativa (e, no web, um único `detectedVisit` / toast) para o equipamento **mais próximo** entre os que geraram visita **naquele ciclo** — **RN-VISIT-002**.

## Laudo de implementação

### 1. Web — `useVisitDetection`

**Arquivo:** `src/hooks/useVisitDetection.ts`

- Após atualizar permanência (dwell) de **10 minutos** para cada serviço na lista, o hook monta a lista **`eligibleForInsert`**: serviços dentro do geofence, com dwell cumprido e ainda não cobertos por `createdVisitsRef` (visita pending local).
- **Uma consulta em lote** a `service_visits` com `visited_at >= now - 24h` e `.in("service_id", candidateIds)` monta o conjunto de serviços que **não** devem receber nova visita.
- Para cada candidato **fora** desse conjunto, chama **`insertVisitRecord`** (insert + `registerOpenVisit`), **sem** notificação.
- Ao final do ciclo, **`pickClosestByDistanceMeters`** (lib compartilhada) escolhe a visita recém-criada com **menor distância**; só ela recebe `notifications.insert` e **`setDetectedVisit`**.
- Serviços pulados por visita recente têm **`dwellStartRef` limpo** para não repetir a mesma checagem a cada minuto enquanto permanecem no raio.

### 2. Edge Function — `detect-service-visit`

**Arquivo:** `supabase/functions/detect-service-visit/index.ts`

- Removido o **`break`** que limitava a **uma** visita por requisição.
- Cada serviço no raio com dwell satisfeito e **sem** visita em 24 h continua gerando **insert** em `service_visits` e limpeza de `visit_detection_state`.
- As visitas criadas na requisição são acumuladas em **`createdThisRequest`** com `{ visitId, dist, displayName }`.
- **Após o loop**, um único **`notifications.insert`** é feito para o item com **menor `dist`** (Haversine já calculada no loop).
- Resposta JSON estendida:
  - **`visit_id`**: id da visita **notificada** (mais próxima), compatível com clientes que já liam esse campo.
  - **`visit_ids_created`**: lista de todos os ids criados nessa chamada (evidência / depuração).

### 3. Biblioteca e testes

**Arquivos:**

- `src/lib/visitDetectionMulti.ts` — constante `RECENT_SERVICE_VISIT_LOOKBACK_MS` (24 h) e `pickClosestByDistanceMeters`.
- `src/lib/visitDetectionMulti.test.ts` — cenários Vitest, incluindo **três** equipamentos no raio com distâncias distintas e escolha do mais próximo.

## Evidências de teste

Executar:

```bash
npx vitest run src/lib/visitDetectionMulti.test.ts
```

Saída esperada: todos os testes do arquivo **passando** (lista vazia, três itens, empate).

## Rastreabilidade dos critérios de aceite

| Critério | Evidência |
|----------|-----------|
| Iteração sobre todos no raio de 50 m | Loop completo em `useVisitDetection` e em `detect-service-visit` (sem interrupção após primeira criação). |
| Nova visita por equipamento sem visita em 24 h | Filtro `visited_at` / `recentSet` no hook; `recentVisit` na Edge antes do insert. |
| Só o mais próximo notifica | `pickClosestByDistanceMeters` + um `notifications.insert` no hook; `reduce` por `dist` + um insert na Edge. |

## RN-VISIT-002

**Regra:** criar visitas independentes para múltiplos equipamentos próximos; **notificar apenas o mais próximo**.

**Atendimento:** múltiplos `INSERT` em `service_visits`; **um** registro em `notifications` por ciclo (web e Edge), associado à visita do equipamento de menor distância entre os criados naquele ciclo/requisição.
