# Endpoints da API Escola Aberta que utilizamos

Referência: [API Store - EscolaAberta v1](https://apilib.prefeitura.sp.gov.br/store/apis/info?name=EscolaAberta&version=v1&provider=admin_sme&tag=SME)

Base URL (gateway): `https://gateway.apilib.prefeitura.sp.gov.br/sme/EscolaAberta/v1/api/`

Todos os endpoints podem exigir **Bearer token** (inscrição no API Store). Use `ESCOLA_ABERTA_API_TOKEN` no `.env` quando necessário.

---

## Endpoints que precisamos (nosso lado)

### 1. Lista de escolas e CEUs (sync → `public_services`)

| Endpoint | Uso no projeto | Observação |
|----------|-----------------|------------|
| **`GET /api/livroaberto_escolas/`** | Script `sync-escolaaberta-public-services.mjs`: busca todas as escolas/CEUs com nome, endereço, CEP, telefone, lat/lon, **tipoesc**, total_vagas, total_servidores, total_matriculados. | Resposta em `results[]`. Inclui colunas de `escolas_escolas` (tipoesc, nomesc, codesc, etc.). **Essencial.** |

**URL completa:**  
`https://gateway.apilib.prefeitura.sp.gov.br/sme/EscolaAberta/v1/api/livroaberto_escolas/`

---

### 2. Tipos de escola (catálogo / rótulos)

| Endpoint | Uso no projeto | Observação |
|----------|-----------------|------------|
| **`GET /api/tipo_escola/`** | Lista de tipos (EMEF, CEMEI, CEI, etc.) para exibir rótulos na interface ou em filtros. | Retorno: `results[]` com campo `tipoesc`. **Recomendado** se quiser dropdown/filtro por tipo. |

**URL completa:**  
`https://gateway.apilib.prefeitura.sp.gov.br/sme/EscolaAberta/v1/api/tipo_escola/`

---

### 3. Ambientes por escola (detalhe da unidade)

| Endpoint | Uso no projeto | Observação |
|----------|-----------------|------------|
| **`GET /api/ambientesbyescola/{codesc}/`** | Na tela de **detalhe** de uma escola/CEU: listar ambientes (salas, quadra, etc.) daquela unidade. | Parâmetro: `codesc` = código da escola (igual a `external_id` quando `source_layer = 'escola_aberta'`). Retorno: `results[]` com `ambiente`, `total`. **Opcional** (enriquecer detalhe). |

**URL completa (exemplo):**  
`https://gateway.apilib.prefeitura.sp.gov.br/sme/EscolaAberta/v1/api/ambientesbyescola/123456/`

---

### 4. Ambientes da rede (agregado por DRE)

| Endpoint | Uso no projeto | Observação |
|----------|-----------------|------------|
| **`GET /api/smeambientes/`** | Totais de ambientes na rede (opcional, ex.: “estatísticas da SME”). | Retorno: `results[]` com `ambiente`, `total`. |
| **`GET /api/smeambientes/{cod_dre}/`** | Mesmo formato, filtrado por DRE (ex.: `BT` = Butantã). | **Opcional**; mais para dashboards/relatórios. |

**URL completa:**  
`https://gateway.apilib.prefeitura.sp.gov.br/sme/EscolaAberta/v1/api/smeambientes/`  
`https://gateway.apilib.prefeitura.sp.gov.br/sme/EscolaAberta/v1/api/smeambientes/BT`

---

## Outros endpoints (referência – uso opcional)

- **`/api/diretorias/`** – Lista de DREs (filtro por região).
- **`/api/smeescolas/`** – Escolas por tipo/DRE (alternativa ao livroaberto com outros filtros).
- **`/api/smevagasmat/`** – Vagas e matrículas (agregado).
- **`/api/smeprofissionais/`** – Profissionais (agregado).
- **`/api/localizador`** – Localizador de escolas (busca por endereço/nome).
- **`/api/dtatualizacao/`** – Data de atualização dos dados.
- **Router REST:** `/api/escolas/`, `/api/ceus/`, `/api/bairros/`, `/api/distritos/`, `/api/subpref/`, `/api/turmas/`, `/api/servidores/`, `/api/ambientes/` – recursos adicionais conforme necessidade.

---

## Resumo – mínimo necessário

| Necessidade | Endpoint | Obrigatório? |
|-------------|----------|----------------|
| Alimentar `public_services` (escolas + CEUs) com nome, endereço, tipo, telefone, coordenadas | **`GET /api/livroaberto_escolas/`** | **Sim** |
| Exibir “tipo de escola” (EMEF, CEMEI, etc.) no app | Já vem em `livroaberto_escolas` (campo `tipoesc`); gravamos em `services_offered`. Catálogo de rótulos: **`GET /api/tipo_escola/`** | Catálogo opcional |
| Detalhe da unidade: ambientes (salas, quadra) | **`GET /api/ambientesbyescola/{codesc}/`** | Opcional |

Para **listar no site** (documentação interna) quais endpoints necessitamos: **livroaberto_escolas** (obrigatório), **tipo_escola** e **ambientesbyescola** (recomendados conforme uso acima).
