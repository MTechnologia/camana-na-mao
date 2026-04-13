# Sync API Escola Aberta → public_services

Script para popular/atualizar `public_services` com **escolas municipais e CEUs** a partir da API oficial da SME (Secretaria Municipal de Educação):

- **API:** [Escola Aberta - v1](https://apilib.prefeitura.sp.gov.br/store/apis/info?name=EscolaAberta&version=v1&provider=admin_sme&tag=SME)
- **Endpoint:** `https://gateway.apilib.prefeitura.sp.gov.br/sme/EscolaAberta/v1/api/livroaberto_escolas/`

Os dados incluem nome, endereço, CEP, bairro, telefone e coordenadas (lat/lon), evitando scraping do site e geocodificação manual.

## Pré-requisitos

- Node.js 18+
- Tabela `public_services` com colunas `source_layer` e `external_id` (mesma migration do sync GeoSampa)
- **Supabase:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` no `.env`
- **Token da API (se exigido):** o gateway da Prefeitura pode exigir inscrição no API Store e token. Defina no `.env`:
  - `ESCOLA_ABERTA_API_TOKEN` ou `ESCOLA_ABERTA_TOKEN`

## Como obter o token (API Store)

1. Acesse [API Store - EscolaAberta](https://apilib.prefeitura.sp.gov.br/store/apis/info?name=EscolaAberta&version=v1&provider=admin_sme&tag=SME).
2. Faça **Sign-up** / **Sign In**.
3. Inscreva-se na API (Subscribe) e gere um **access token** para o ambiente desejado (Production/Sandbox).
4. No `.env` do projeto:
   ```env
   ESCOLA_ABERTA_API_TOKEN=seu_token_aqui
   ```

Se o endpoint for público (sem auth), o script funciona sem token.

## Uso

```bash
# Só simular (não grava)
DRY_RUN=1 node scripts/sync-escolaaberta-public-services.mjs

# Executar sync
node scripts/sync-escolaaberta-public-services.mjs
```

## Mapeamento

- **Fonte:** resposta JSON do endpoint `livroaberto_escolas/` (modelo [SME-EscolaAberta-API](https://github.com/prefeiturasp/SME-EscolaAberta-API): `codesc`, `nomesc`, `endereco`, `numero`, `bairro`, `cep`, `tel1`, `latitude`, `longitude`, `distrito`, `tipoesc`, `ceu`).
- **CEU vs escola:** registros cujo nome contém "CEU" ou que tenham o campo `ceu` preenchido são gravados com `service_type = 'ceu'`; os demais com `service_type = 'school'`.
- **Identificação única:** `source_layer = 'escola_aberta'`, `external_id = codesc` (ou cd_cie/codinep), permitindo upsert sem duplicar.

## Sync de dados extras (tipos, ambientes, rede)

O script **`sync-escolaaberta-extras.mjs`** traz:

- **`GET /api/tipo_escola/`** → tabela **`escola_aberta_tipos`** (catálogo para filtros/rótulos).
- **`GET /api/ambientesbyescola/{codesc}/`** → coluna **`public_services.ambientes`** (lista de ambientes por unidade; exibida na tela de detalhe).
- **`GET /api/smeambientes/`** → tabela **`escola_aberta_rede_ambientes`** (totais da rede). Opcionalmente **`/api/smeambientes/{cod_dre}/`** por DRE (variável `ESCOLA_ABERTA_DRE_CODES` no `.env`, ex.: `BT,CL`).

**Requisitos:** mesma migration `20260228120000_escola_aberta_extras.sql` (coluna `ambientes` em `public_services` e tabelas `escola_aberta_tipos`, `escola_aberta_rede_ambientes`).

```bash
# Simular
DRY_RUN=1 node scripts/sync-escolaaberta-extras.mjs

# Executar (após rodar sync-escolaaberta-public-services.mjs)
node scripts/sync-escolaaberta-extras.mjs
```

A tela de detalhe do serviço exibe a seção **Ambientes** quando `ambientes` estiver preenchido (array `[{ ambiente, total }, ...]`).

## Agendamento (cron no GitHub Actions)

O workflow **`.github/workflows/sync-escolaaberta-ceu.yml`** roda automaticamente todo dia às **7h UTC (4h BRT)** e executa em sequência:

1. `sync-escolaaberta-public-services.mjs` — escolas e CEUs da ApiLib
2. `sync-escolaaberta-extras.mjs` — tipos de escola, ambientes por unidade, totais da rede
3. `sync-ceu-opening-hours-sme.mjs` — horários de funcionamento e "Sobre a unidade" dos CEUs (site SME)

**Secrets no repositório (Settings → Secrets and variables → Actions):**

| Secret | Obrigatório | Uso |
|--------|-------------|-----|
| `SUPABASE_URL` | Sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Chave service role do Supabase |
| `ESCOLA_ABERTA_API_TOKEN` | Sim | Token da API Escola Aberta (API Store) |
| `GOOGLE_MAPS_API_KEY` | Não | Só para o script CEU inserir unidades novas (geocodificação); sem ele, apenas atualiza CEUs já existentes |

**Variável opcional (Variables):** `ESCOLA_ABERTA_DRE_CODES` — códigos de DRE separados por vírgula (ex.: `BT,CL`) para popular `escola_aberta_rede_ambientes` por DRE. Se não definir, só os totais gerais da rede são sincronizados.

É possível rodar o workflow manualmente em **Actions → Sync Escola Aberta + CEU → Run workflow**.

### Falha `fetch failed` no GitHub Actions

O `fetch` do Node falha **antes** de receber HTTP (não é 401/403 no log). Causas comuns:

1. **Rede / firewall** — o gateway `gateway.apilib.prefeitura.sp.gov.br` pode **não aceitar** ou instabilizar conexões vindas dos **IPs de saída do GitHub Actions** (mudam; muitas vezes fora do Brasil).
2. **Timeout ou TLS** — intermitência; os scripts usam **várias tentativas**, timeout longo e log detalhado (`escola-aberta-http.mjs`).

**O que fazer:** confirmar o endpoint no navegador ou `curl` a partir de uma máquina na rede da empresa. Se só funcionar de SP/Brasil, use **runner self-hosted** na rede permitida, ou execute o mesmo script num **job agendado no GCP** (Cloud Run + Scheduler / Cloud Build) com IP estável, ou peça à Prefeitura liberação dos IPs do GitHub.

Variáveis opcionais para afinar retries (Actions → Variables ou `env:` no workflow): `ESCOLA_ABERTA_FETCH_RETRIES`, `ESCOLA_ABERTA_FETCH_TIMEOUT_MS`, `ESCOLA_ABERTA_FETCH_RETRY_DELAY_MS`.

## Relação com outros syncs

- **GeoSampa:** traz equipamentos por camada WFS/GeoJSON (ex.: educação rede pública pode ter parte das escolas). O Escola Aberta é fonte oficial da SME com dados já georreferenciados e com telefone.
- **CEU horário (site SME):** o script `sync-ceu-opening-hours-sme.mjs` continua útil para preencher `opening_hours` a partir do site dos CEUs; a API Escola Aberta pode não expor horário de funcionamento nesse endpoint.
