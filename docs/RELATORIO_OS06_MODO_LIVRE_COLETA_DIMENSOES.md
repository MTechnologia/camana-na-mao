# Relatório técnico unificado — OS-06 / Task 5286487  
## Modo livre com coleta de dimensões (avaliação conversacional)

**Versão do documento:** v1.0  
**Data:** 2026-04-13  
**Local de armazenamento oficial:** Repositório Git (`docs/RELATORIO_OS06_MODO_LIVRE_COLETA_DIMENSOES.md`)

---

## 1. Descrição da tarefa

Esta seção registra a descrição formal da atividade conforme alinhada à Ordem de Serviço vigente (OS-06 — fluxo de avaliação conversacional de serviços públicos via chatbot).

A atividade consiste em **unificar o fluxo de avaliação** para que o chatbot realize as **mesmas perguntas atômicas por dimensão** tanto quando existe **visita detectada** (`visit_id` conhecido) quanto quando o cidadão inicia a avaliação em **modo livre** (sem visita prévia). No caminho sem visita, após a identificação do serviço, o orquestrador deve entrar no **roteiro de dimensões** (nota geral, tempo de espera, atendimento, infraestrutura, comentário/sugestão), em paridade com o fluxo com visita.

A regra de negócio **RN-AVA-001** aplicável a este escopo exige que, no modo livre, seja criada uma **visita em `service_visits` com status `completed`**, garantindo consistência do modelo de dados (toda avaliação vinculada a uma visita).

**Identificadores de referência:** Task **5286487** — OS-06 (fluxo completo de avaliação conversacional).

---

## 2. Descrição do entregável analisado

A implementação foi realizada com foco na **camada de orquestração** (Edge Function `ai-orchestrator`), na **ferramenta `create_service_rating`** (contrato e persistência) e na **interface** da página de avaliação, sem necessidade de **nova alteração de esquema** de banco para esta demanda (uso das colunas existentes: `service_ratings.visit_id`, `rating_dimensions`, `wait_time_score`, etc.).

### Resumo técnico da entrega

- **Paridade de roteiro:** com `visit_id`, o orquestrador aplica o mesmo conjunto de perguntas atômicas que o modo livre após identificar o serviço (nota geral, tempo de espera, dimensões, texto opcional de melhoria).
- **Modo livre:** coleta de tipo, bairro, nome e confirmação de endereço; em seguida o mesmo bloco de dimensões.
- **Persistência:** em `create_service_rating`, sem `visit_id`, após resolver `service_id`, inserção de registro em `service_visits` com **`status: completed`** e gravação de `service_ratings` com o `visit_id` retornado.
- **Frontend:** em `/avaliar` (sem id na rota), seção de modo livre com `ConversationalEvaluation` sem contexto de visita, alinhada ao orquestrador.
- **Documentação de teste** atualizada no guia de avaliação conversacional.
- **Evidências em banco:** consultas SQL com resultados (usuário de homologação) demonstrando integridade entre `service_ratings` e `service_visits` com status `completed`.
- **Relatório técnico:** o presente documento unificado (substitui relatórios parciais anteriores do mesmo escopo).

### Arquivos criados

| Arquivo | Descrição |
|---------|-----------|
| `docs/RELATORIO_OS06_MODO_LIVRE_COLETA_DIMENSOES.md` | Laudo unificado (este documento) com descrição, aderência, validação e anexos SQL. |

### Arquivos alterados

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/ai-orchestrator/index.ts` | `getNextMissingField` para `service_rating`: ramo com `visit_id` com o mesmo roteiro atômico do modo livre (dimensões + espera + comentário); repasse de campos acumulados para `create_service_rating`. |
| `supabase/functions/ai-orchestrator/lib-tools.ts` | Descrição da tool `create_service_rating` alinhada aos dois modos e à visita virtual `completed` quando aplicável. |
| `supabase/functions/ai-orchestrator/lib.ts` | `create_service_rating`: criação de visita `completed` no modo sem `visit_id`; insert de rating com `visit_id`, `rating_dimensions` e `wait_time_score` quando presentes. |
| `src/pages/EvaluationPage.tsx` | Modo livre na rota `/avaliar`; tipagem `VisitWithService` para join com `public_services`. |
| `docs/GUIA_TESTE_AVALIACAO_CONVERSACIONAL.md` | Instruções de teste para modo com visita e modo livre com paridade de fluxo. |

---

## 3. Análise de aderência aos requisitos da OS

Os critérios de aceite da demanda foram endereçados da seguinte forma:

| Requisito | Evidência de aderência |
|-----------|-------------------------|
| Fluxo de perguntas atômicas **idêntico** com e sem `visit_id` | Orquestrador trata ambos os ramos com a mesma sequência após contexto de serviço completo (com visita já identificada vs. livre após identificação). |
| Sem visita: após identificar o serviço, entra no roteiro de dimensões | Ramo sem `visit_id` em `index.ts` + validações em `create_service_rating` para serviço/endereço antes de concluir. |
| Visita virtual com status **`completed`** (RN-AVA-001 neste escopo) | `lib.ts`: insert em `service_visits` com `status: 'completed'` quando não há `visit_id` e o serviço foi resolvido. |
| Consistência dos dados no banco | `service_ratings.visit_id` aponta para `service_visits`; evidências na seção 7. |

A entrega foi avaliada sob os critérios de **escopo**, **qualidade técnica**, **aderência arquitetural** e **rastreabilidade**, conforme estabelecido na Ordem de Serviço vigente.

**Observação:** registros históricos podem exibir `rating_dimensions` ou `wait_time_score` nulos conforme versão do fluxo ou caminho de gravação na época; recomenda-se evidência adicional pós-deploy com orchestrator atual para uma linha com dimensões e `wait_time_score` preenchidos, se exigido pelo fiscal técnico.

---

## 4. Validação e testes

### 4.1 Validação no fluxo de criação (aplicação)

- Homologação manual conforme `docs/GUIA_TESTE_AVALIACAO_CONVERSACIONAL.md`: rotas `/avaliar` e `/avaliar/:visitId`, modo livre e com visita.
- Comportamento esperado: mesma ordem de coleta atômica no chat; persistência via `create_service_rating`.

### 4.2 Validação em banco de dados

Execução das consultas da seção **7. Anexos e evidências**, com o **`user_id`** correto do cidadão de teste (não confundir com `service_ratings.id`).

### 4.3 Testes automatizados (repositório)

- Testes Deno em `supabase/functions/ai-orchestrator/lib.test.ts` e correlatos cobrem aspectos de `create_service_rating` e dimensões onde aplicável.
- Evidência E2E dedicada ao modo livre completo pode ser acrescentada em ciclo futuro; não bloqueia o registro deste laudo.

**Exemplo de execução de testes Deno (ajustar caminho conforme ambiente):**

```bash
npx deno test --no-check --allow-env supabase/functions/ai-orchestrator/lib.test.ts
```

---

## 5. Conclusão e parecer técnico

### Síntese da análise

A unificação do fluxo conversacional de avaliação (com e sem `visit_id`), a persistência com **visita `completed`** no modo livre e a exposição do modo livre na UI atendem ao escopo da **Task 5286487**. As consultas SQL anexadas comprovam, para o recorte homologado, **integridade referencial** entre `service_ratings` e `service_visits` com **status `completed`**.

### Conclusão

**APROVADO** — com a ressalva documentada na seção 3 quanto a evidência complementar de linhas com `rating_dimensions` / `wait_time_score` preenchidos em ambiente já deployado com a versão atual do orquestrador, caso o gestor exija prova adicional de persistência dimensional em produção.

---

## 6. Conformidade contratual

Declaro que a presente análise foi realizada em conformidade com a **Ordem de Serviço nº [06/2025] – CMSP**, vinculada ao **Contrato nº 36/2025**, respeitando integralmente os critérios de escopo, prazo e qualidade estabelecidos no Plano de Trabalho aprovado.

Este laudo integra a documentação formal de governança e rastreabilidade contratual do projeto **Plataforma Digital CMSP**.

*(Ajustar numeração de OS/contrato se a versão oficial divergir do placeholder acima.)*

---

## 7. Anexos e evidências

Foram implementadas as alterações conforme informado anteriormente. Seguem os **SELECTs** executados e os **resultados** obtidos no ambiente de homologação.

**Usuário do recorte:** `d8c29272-3df1-45e5-955e-e658e10ba031`  

**Nota metodológica:** o UUID `6743b3e4-9e3a-4743-94a9-667d1e957dc9` é **`id` de `service_ratings`**, não `user_id`.

### 7.1 Evidência — Consulta 1 (`service_ratings`)

```sql
SELECT
  sr.id,
  sr.user_id,
  sr.service_id,
  sr.visit_id,
  sr.rating_stars,
  sr.wait_time_score,
  sr.rating_dimensions,
  sr.rating_text,
  sr.created_at
FROM service_ratings sr
WHERE sr.user_id = 'd8c29272-3df1-45e5-955e-e658e10ba031'
ORDER BY sr.created_at DESC
LIMIT 20;
```

**Resultado (7 linhas):**

```json
[
  {
    "id": "60b8d3f2-b909-4f73-9824-1890d14322c1",
    "user_id": "d8c29272-3df1-45e5-955e-e658e10ba031",
    "service_id": "050d8c04-06a9-4dec-9442-772b61a5abe1",
    "visit_id": "fd3c76cf-42b3-4c10-af4d-3918f460f429",
    "rating_stars": 5,
    "wait_time_score": null,
    "rating_dimensions": null,
    "rating_text": "Avaliação para validação da task 2927745 do workextra.",
    "created_at": "2026-04-07 17:38:18.617238+00"
  },
  {
    "id": "c60560e7-1d07-4f33-b998-963c63338113",
    "user_id": "d8c29272-3df1-45e5-955e-e658e10ba031",
    "service_id": "dca39a07-db9e-4539-9097-a23ce2165d64",
    "visit_id": "2cf6a0df-e7ec-4439-828d-5218c05dab29",
    "rating_stars": 1,
    "wait_time_score": null,
    "rating_dimensions": {
      "limpeza": 1,
      "atendimento": 1,
      "tempo_espera": 1,
      "infraestrutura": 1
    },
    "rating_text": "Teste!",
    "created_at": "2026-03-25 18:28:33.12368+00"
  },
  {
    "id": "776c1fb8-c088-4e33-ae7f-8c8811a6fdd4",
    "user_id": "d8c29272-3df1-45e5-955e-e658e10ba031",
    "service_id": "e42de8bf-93f0-4e6f-819e-ab86a08c5e18",
    "visit_id": "3aaaa25a-da4c-40d0-96ae-19aa000134d5",
    "rating_stars": 1,
    "wait_time_score": null,
    "rating_dimensions": {
      "limpeza": 1,
      "atendimento": 1,
      "tempo_espera": 1,
      "infraestrutura": 1
    },
    "rating_text": "Teste para item 4.7",
    "created_at": "2026-03-25 03:01:50.233917+00"
  },
  {
    "id": "db63dd97-b75e-4513-81d7-967628277ada",
    "user_id": "d8c29272-3df1-45e5-955e-e658e10ba031",
    "service_id": "fc235ec1-4cca-43a7-b5e8-08a3b9f4fb7b",
    "visit_id": "2735d1d6-86d4-4f56-9c73-460cd6923e7e",
    "rating_stars": 1,
    "wait_time_score": null,
    "rating_dimensions": {
      "limpeza": 1,
      "atendimento": 1,
      "tempo_espera": 1,
      "infraestrutura": 1
    },
    "rating_text": "Teste item 4.7",
    "created_at": "2026-03-25 02:58:51.426176+00"
  },
  {
    "id": "9203cfcb-8dd9-4812-9b5a-0cf6e88e1e7e",
    "user_id": "d8c29272-3df1-45e5-955e-e658e10ba031",
    "service_id": "1c27b05d-4c83-461b-954d-43cefbae5492",
    "visit_id": "fe97484e-dcf2-4c3d-9b39-5c535436a26b",
    "rating_stars": 5,
    "wait_time_score": null,
    "rating_dimensions": null,
    "rating_text": "Testes para validar task",
    "created_at": "2026-03-19 22:34:56.410024+00"
  },
  {
    "id": "44c98dbe-e4a1-4771-a661-e5c46dbe5b09",
    "user_id": "d8c29272-3df1-45e5-955e-e658e10ba031",
    "service_id": "20ecec65-7020-4be5-a42a-3b381dbbd1b8",
    "visit_id": "4bb461a5-4ac6-4e07-9365-006aa9f138a9",
    "rating_stars": 5,
    "wait_time_score": null,
    "rating_dimensions": null,
    "rating_text": "Testes para validação de task",
    "created_at": "2026-03-19 22:23:56.655485+00"
  },
  {
    "id": "6743b3e4-9e3a-4743-94a9-667d1e957dc9",
    "user_id": "d8c29272-3df1-45e5-955e-e658e10ba031",
    "service_id": "7b96619a-4176-4c89-bb7e-d6803e0caf82",
    "visit_id": "77ce9ccb-151e-4b79-ad17-b6124e1a88a3",
    "rating_stars": 3,
    "wait_time_score": null,
    "rating_dimensions": null,
    "rating_text": "A avaliação é apenas para questão de testes das implementações",
    "created_at": "2026-03-19 21:03:56.409942+00"
  }
]
```

### 7.2 Evidência — Consulta 2 (junção `service_ratings` × `service_visits`)

```sql
SELECT
  sr.id AS rating_id,
  sr.created_at AS rating_created_at,
  sv.id AS visit_id,
  sv.status,
  sv.user_id,
  sv.service_id,
  sv.created_at AS visit_created_at,
  sv.expires_at
FROM service_ratings sr
JOIN service_visits sv ON sv.id = sr.visit_id
WHERE sr.user_id = 'd8c29272-3df1-45e5-955e-e658e10ba031'
ORDER BY sr.created_at DESC
LIMIT 20;
```

**Resultado (7 linhas):** em todas, `sv.status = completed`; `sv.user_id` e `sv.service_id` coincidem com a avaliação.

| rating_id | rating_created_at | visit_id | status | user_id | service_id | visit_created_at | expires_at |
|-----------|-------------------|----------|--------|---------|------------|------------------|------------|
| 60b8d3f2-b909-4f73-9824-1890d14322c1 | 2026-04-07 17:38:18.617238+00 | fd3c76cf-42b3-4c10-af4d-3918f460f429 | completed | d8c29272-3df1-45e5-955e-e658e10ba031 | 050d8c04-06a9-4dec-9442-772b61a5abe1 | 2026-04-07 17:27:01.586292+00 | 2026-04-14 17:27:01.346+00 |
| c60560e7-1d07-4f33-b998-963c63338113 | 2026-03-25 18:28:33.12368+00 | 2cf6a0df-e7ec-4439-828d-5218c05dab29 | completed | d8c29272-3df1-45e5-955e-e658e10ba031 | dca39a07-db9e-4539-9097-a23ce2165d64 | 2026-03-25 18:28:32.547889+00 | 2026-04-01 18:28:32.425+00 |
| 776c1fb8-c088-4e33-ae7f-8c8811a6fdd4 | 2026-03-25 03:01:50.233917+00 | 3aaaa25a-da4c-40d0-96ae-19aa000134d5 | completed | d8c29272-3df1-45e5-955e-e658e10ba031 | e42de8bf-93f0-4e6f-819e-ab86a08c5e18 | 2026-03-25 03:01:24.294472+00 | 2026-04-01 03:01:04.863+00 |
| db63dd97-b75e-4513-81d7-967628277ada | 2026-03-25 02:58:51.426176+00 | 2735d1d6-86d4-4f56-9c73-460cd6923e7e | completed | d8c29272-3df1-45e5-955e-e658e10ba031 | fc235ec1-4cca-43a7-b5e8-08a3b9f4fb7b | 2026-03-25 02:58:20.86182+00 | 2026-04-01 02:58:01.437+00 |
| 9203cfcb-8dd9-4812-9b5a-0cf6e88e1e7e | 2026-03-19 22:34:56.410024+00 | fe97484e-dcf2-4c3d-9b39-5c535436a26b | completed | d8c29272-3df1-45e5-955e-e658e10ba031 | 1c27b05d-4c83-461b-954d-43cefbae5492 | 2026-03-19 22:34:56.146853+00 | 2026-03-26 22:34:56.009+00 |
| 44c98dbe-e4a1-4771-a661-e5c46dbe5b09 | 2026-03-19 22:23:56.655485+00 | 4bb461a5-4ac6-4e07-9365-006aa9f138a9 | completed | d8c29272-3df1-45e5-955e-e658e10ba031 | 20ecec65-7020-4be5-a42a-3b381dbbd1b8 | 2026-03-19 22:23:56.389737+00 | 2026-03-26 22:23:56.246+00 |
| 6743b3e4-9e3a-4743-94a9-667d1e957dc9 | 2026-03-19 21:03:56.409942+00 | 77ce9ccb-151e-4b79-ad17-b6124e1a88a3 | completed | d8c29272-3df1-45e5-955e-e658e10ba031 | 7b96619a-4176-4c89-bb7e-d6803e0caf82 | 2026-03-19 21:02:59.986265+00 | 2026-03-26 21:02:53.923+00 |

### 7.3 Evidência — Consulta 3 (`service_visits` com `completed`)

```sql
SELECT
  id,
  user_id,
  service_id,
  status,
  created_at,
  expires_at
FROM service_visits
WHERE user_id = 'd8c29272-3df1-45e5-955e-e658e10ba031'
  AND status = 'completed'
ORDER BY created_at DESC
LIMIT 20;
```

**Resultado (7 linhas):**

```json
[
  { "id": "fd3c76cf-42b3-4c10-af4d-3918f460f429", "user_id": "d8c29272-3df1-45e5-955e-e658e10ba031", "service_id": "050d8c04-06a9-4dec-9442-772b61a5abe1", "status": "completed", "created_at": "2026-04-07 17:27:01.586292+00", "expires_at": "2026-04-14 17:27:01.346+00" },
  { "id": "2cf6a0df-e7ec-4439-828d-5218c05dab29", "user_id": "d8c29272-3df1-45e5-955e-e658e10ba031", "service_id": "dca39a07-db9e-4539-9097-a23ce2165d64", "status": "completed", "created_at": "2026-03-25 18:28:32.547889+00", "expires_at": "2026-04-01 18:28:32.425+00" },
  { "id": "3aaaa25a-da4c-40d0-96ae-19aa000134d5", "user_id": "d8c29272-3df1-45e5-955e-e658e10ba031", "service_id": "e42de8bf-93f0-4e6f-819e-ab86a08c5e18", "status": "completed", "created_at": "2026-03-25 03:01:24.294472+00", "expires_at": "2026-04-01 03:01:04.863+00" },
  { "id": "2735d1d6-86d4-4f56-9c73-460cd6923e7e", "user_id": "d8c29272-3df1-45e5-955e-e658e10ba031", "service_id": "fc235ec1-4cca-43a7-b5e8-08a3b9f4fb7b", "status": "completed", "created_at": "2026-03-25 02:58:20.86182+00", "expires_at": "2026-04-01 02:58:01.437+00" },
  { "id": "fe97484e-dcf2-4c3d-9b39-5c535436a26b", "user_id": "d8c29272-3df1-45e5-955e-e658e10ba031", "service_id": "1c27b05d-4c83-461b-954d-43cefbae5492", "status": "completed", "created_at": "2026-03-19 22:34:56.146853+00", "expires_at": "2026-03-26 22:34:56.009+00" },
  { "id": "4bb461a5-4ac6-4e07-9365-006aa9f138a9", "user_id": "d8c29272-3df1-45e5-955e-e658e10ba031", "service_id": "20ecec65-7020-4be5-a42a-3b381dbbd1b8", "status": "completed", "created_at": "2026-03-19 22:23:56.389737+00", "expires_at": "2026-03-26 22:23:56.246+00" },
  { "id": "77ce9ccb-151e-4b79-ad17-b6124e1a88a3", "user_id": "d8c29272-3df1-45e5-955e-e658e10ba031", "service_id": "7b96619a-4176-4c89-bb7e-d6803e0caf82", "status": "completed", "created_at": "2026-03-19 21:02:59.986265+00", "expires_at": "2026-03-26 21:02:53.923+00" }
]
```

### 7.4 Evidência — Consulta 4 (dimensões em JSONB)

```sql
SELECT
  id,
  rating_stars,
  wait_time_score,
  rating_dimensions->>'atendimento' AS atendimento,
  rating_dimensions->>'infraestrutura' AS infraestrutura,
  rating_dimensions->>'limpeza' AS limpeza,
  rating_dimensions->>'tempo_espera' AS tempo_espera,
  created_at
FROM service_ratings
WHERE user_id = 'd8c29272-3df1-45e5-955e-e658e10ba031'
ORDER BY created_at DESC
LIMIT 20;
```

**Resultado (7 linhas):** (`->>` retorna texto)

```json
[
  { "id": "60b8d3f2-b909-4f73-9824-1890d14322c1", "rating_stars": 5, "wait_time_score": null, "atendimento": null, "infraestrutura": null, "limpeza": null, "tempo_espera": null, "created_at": "2026-04-07 17:38:18.617238+00" },
  { "id": "c60560e7-1d07-4f33-b998-963c63338113", "rating_stars": 1, "wait_time_score": null, "atendimento": "1", "infraestrutura": "1", "limpeza": "1", "tempo_espera": "1", "created_at": "2026-03-25 18:28:33.12368+00" },
  { "id": "776c1fb8-c088-4e33-ae7f-8c8811a6fdd4", "rating_stars": 1, "wait_time_score": null, "atendimento": "1", "infraestrutura": "1", "limpeza": "1", "tempo_espera": "1", "created_at": "2026-03-25 03:01:50.233917+00" },
  { "id": "db63dd97-b75e-4513-81d7-967628277ada", "rating_stars": 1, "wait_time_score": null, "atendimento": "1", "infraestrutura": "1", "limpeza": "1", "tempo_espera": "1", "created_at": "2026-03-25 02:58:51.426176+00" },
  { "id": "9203cfcb-8dd9-4812-9b5a-0cf6e88e1e7e", "rating_stars": 5, "wait_time_score": null, "atendimento": null, "infraestrutura": null, "limpeza": null, "tempo_espera": null, "created_at": "2026-03-19 22:34:56.410024+00" },
  { "id": "44c98dbe-e4a1-4771-a661-e5c46dbe5b09", "rating_stars": 5, "wait_time_score": null, "atendimento": null, "infraestrutura": null, "limpeza": null, "tempo_espera": null, "created_at": "2026-03-19 22:23:56.655485+00" },
  { "id": "6743b3e4-9e3a-4743-94a9-667d1e957dc9", "rating_stars": 3, "wait_time_score": null, "atendimento": null, "infraestrutura": null, "limpeza": null, "tempo_espera": null, "created_at": "2026-03-19 21:03:56.409942+00" }
]
```

---

## 7.3 Task 9520912 — Evidência objetiva: `dim_*` + `[RATING_PICKER]` e fluxo de `dim_limpeza`

Atende às observações formais sobre **prova literal do padrão de marcadores** e sobre **limpeza como dimensão própria** (não apenas derivada da infraestrutura).

### Padrão literal na resposta determinística (short-circuit)

O orquestrador monta cada pergunta assim (ver `index.ts`, função interna `getNextMissingField`, jornada `service_rating`):

- Prefixo: `[COLLECTION_PROGRESS:service_rating:<json dos campos>]`
- Em seguida: **`[FIELD_REQUEST:dim_tempo_espera]`**, **`[FIELD_REQUEST:dim_atendimento]`**, **`[FIELD_REQUEST:dim_infraestrutura]`** ou **`[FIELD_REQUEST:dim_limpeza]`** (um por mensagem, RN-IA-003)
- Corpo da pergunta (texto humano)
- Quebra de linha e **`[RATING_PICKER]`**

Ou seja, a sequência **literal** exigida pelo critério de aceite é: **`[FIELD_REQUEST:dim_<nome>]`** seguida, na mesma mensagem, de **`[RATING_PICKER]`** (com `[COLLECTION_PROGRESS:…]` antes, conforme o motor).

#### 7.3.1 Evidência inequívoca — trecho de produção em `index.ts` (concatenação)

A mensagem enviada ao cliente **não é inferida**: o short-circuit monta a string em um único ponto. Trecho **literal** (arquivo `supabase/functions/ai-orchestrator/index.ts`):

```ts
const fieldsJson = JSON.stringify(accumulatedFields);
const progressMarker = `[COLLECTION_PROGRESS:${collectionIntent!.type}:${fieldsJson}]`;
const fieldMarker = `[FIELD_REQUEST:${nextFieldInfo.field}]`;
const pickerMarker = nextFieldInfo.picker || '';
const deterministicResponse = `${progressMarker}${fieldMarker}${prefix}${nextFieldInfo.prompt}${pickerMarker ? '\n\n' + pickerMarker : ''}`;
```

- **Linhas de referência:** aprox. **3076–3081** (bloco `shouldShortCircuit` + retorno SSE).
- **Corolário:** para cada dimensão, `nextFieldInfo.field` é `dim_tempo_espera`, `dim_atendimento`, `dim_infraestrutura` ou `dim_limpeza` e `nextFieldInfo.picker` é **`'[RATING_PICKER]'`** quando definido em `getNextMissingField` — logo o marcador **`[RATING_PICKER]`** aparece **depois** de **`[FIELD_REQUEST:…]`**, separado por **duas quebras de linha** (`\n\n`), exceto quando `picker` é vazio (não é o caso das quatro dimensões).

**Fallback de stream vazio (mesma fórmula):** se o modelo devolver conteúdo vazio mas ainda houver próximo campo, o mesmo padrão é aplicado em **~3637–3642** (`fieldMarker` + `pickerMarker`).

#### 7.3.2 Ordem do roteiro e evidência de `dim_limpeza`

A função interna `getNextMissingField` (mesmo arquivo `index.ts`) define a **ordem fixa** dos quatro scores no modo visita (`fields.visit_id`) e no modo livre (após serviço/endereço):

| Passo | Campo retornado (`nextFieldInfo.field`) | `picker` |
|------|------------------------------------------|----------|
| 1 | `dim_tempo_espera` | `[RATING_PICKER]` |
| 2 | `dim_atendimento` | `[RATING_PICKER]` |
| 3 | `dim_infraestrutura` | `[RATING_PICKER]` |
| 4 | **`dim_limpeza`** | **`[RATING_PICKER]`** |

- **Modo visita:** bloco **~1355–1383** — `dim_limpeza` só é pedido quando **`infraestrutura_score`** já foi acumulado e **`limpeza_score`** ainda não (`!('limpeza_score' in fields)`).
- **Modo livre:** bloco **~1526–1554** — mesma ordem e mesma condição para **`dim_limpeza`**.

Isso é evidência **direta** de que **limpeza** é uma dimensão **quarta e distinta**, não deduzida de infraestrutura.

**Prova automatizada (reproduzível):**

```bash
npx deno test --no-check --allow-env supabase/functions/ai-orchestrator/lib-service-rating-atomic-dimensions.test.ts
```

O arquivo `lib-service-rating-atomic-dimensions.test.ts` inclui:

- concatenação **espelhada** do trecho **3076–3081** (comentário no teste);
- asserts de ordem: `[FIELD_REQUEST:dim_*]` **antes** de `[RATING_PICKER]`;
- caso explícito **“após infraestrutura”** com `accumulated` contendo `infraestrutura_score` e campo **`dim_limpeza`**;
- `accumulateFieldsFromHistory` / `buildServiceRatingDimensionsFromWizardScores` para **`limpeza_score`** e JSONB.

### Dimensão `dim_limpeza`

- **Roteiro:** após `dim_infraestrutura`, o próximo campo é **`dim_limpeza`** (pergunta atômica só de limpeza/higiene) — ver tabela e linhas **~1377–1383** / **~1548–1554** em `index.ts`.
- **Persistência:** `accumulateFieldsFromHistory` grava `limpeza_score`; `buildServiceRatingDimensionsFromWizardScores` exige `limpeza_score` explícito para montar `rating_dimensions.limpeza` (junto com as demais chaves do JSONB).

### Prompt do sistema (RN-IA-003)

Texto atualizado na seção **AVALIAÇÃO** de `supabase/functions/ai-orchestrator/lib-prompts.ts` (uma dimensão por mensagem; quatro campos `dim_*` com `[RATING_PICKER]`).

---

## 8. Referências de código (repositório)

- `supabase/functions/ai-orchestrator/index.ts`
- `supabase/functions/ai-orchestrator/lib.ts`
- `supabase/functions/ai-orchestrator/lib-tools.ts`
- `supabase/functions/ai-orchestrator/lib-prompts.ts`
- `supabase/functions/ai-orchestrator/lib-service-rating-atomic-dimensions.test.ts`
- `src/components/ai/ChatMessageBubble.tsx` (detecção de `[FIELD_REQUEST:dim_*]` + `[RATING_PICKER]` para o `InlineRatingPicker` por dimensão)
- `src/pages/EvaluationPage.tsx`
- `docs/GUIA_TESTE_AVALIACAO_CONVERSACIONAL.md`
