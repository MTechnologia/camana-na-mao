# Deduplicação de public_services

## Motivo

A API Escola Aberta (e eventualmente outras fontes) pode criar vários registros para o **mesmo local físico**: por exemplo, um CEU com CEMEI + EMEF + CEI gera três linhas (três `external_id` diferentes) no mesmo endereço. No mapa e na busca isso vira duplicados/triplicados.

## Critério de “um por local”

- **Agrupamento**: mesmo `source_layer` + `service_type` + **coordenadas** (latitude/longitude arredondadas em 5 casas decimais, ~1,1 m).
- Apenas registros com `latitude` e `longitude` não nulos entram na deduplicação.

## Qual registro fica

Dentro de cada grupo, mantemos **um** registro, com esta prioridade:

1. Que tenha `opening_hours` preenchido.
2. Senão, que tenha `services_offered` ou `ambientes` preenchidos.
3. Senão, o de menor `id` (mais antigo).

Os demais ids do grupo são considerados duplicados e removidos.

## FKs (visitas, avaliações, inscrições)

Antes de apagar os duplicados:

- **service_visits** e **service_ratings**: `service_id` é atualizado para o id que permanece.
- **service_subscriptions**: se o usuário já está inscrito no serviço que permanece, a inscrição do duplicado é removida; caso contrário, `service_id` é atualizado para o id que permanece.

Depois disso, os registros duplicados são apagados de `public_services`.

## Como rodar

1. **Prévia (opcional)**  
   No SQL Editor do Supabase, abra `scripts/deduplicate-public-services.sql`, **comente** o `BEGIN;` e todo o bloco de INSERT/UPDATE/DELETE (etapas 2–7) e **descomente** só o bloco do `SELECT` de prévia (passo 1). Execute. Confira os grupos e qual linha fica (`rn = 1`).

2. **Execução**  
   Restaure o script ao estado original (descomente o `BEGIN` e as etapas 2–7, comente de novo o bloco da prévia) e execute o script inteiro. Tudo roda em uma única transação; em erro, dá `ROLLBACK`.

## Arquivo

- `scripts/deduplicate-public-services.sql` — script completo (prévia + deduplicação).
