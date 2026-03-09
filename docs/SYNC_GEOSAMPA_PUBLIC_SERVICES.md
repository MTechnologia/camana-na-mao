# Sync GeoSampa → public_services

Script e fluxo para manter a tabela `public_services` atualizada com camadas do [GeoSampa](http://geosampa.prefeitura.sp.gov.br/) (pontos de ônibus, escolas rede privada, etc.).

**Sync automático:** Por padrão o sync **não** roda sozinho. Para que atualizações no GeoSampa reflitam automaticamente no nosso banco, é preciso (1) configurar as URLs das camadas (ver abaixo) e (2) agendar o script — por exemplo usando o workflow `.github/workflows/sync-geosampa.yml` (semanal) após configurar os secrets no repositório.

## Pré-requisitos

- Node.js 18+
- **Migration aplicada:** a tabela `public_services` precisa das colunas `source_layer` e `external_id`. Se ainda não existirem, rode no Supabase → SQL Editor o conteúdo de `supabase/migrations/20260225120000_public_services_geosampa_source.sql` (ou o bloco "Passo 1" abaixo).
- **Chave Service Role** do Supabase no `.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

### Aplicar a migration (se as colunas não existirem)

No **Supabase → SQL Editor**, execute:

```sql
ALTER TABLE public.public_services
  ADD COLUMN IF NOT EXISTS source_layer TEXT,
  ADD COLUMN IF NOT EXISTS external_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_public_services_geosampa_key
  ON public.public_services (source_layer, external_id)
  WHERE source_layer IS NOT NULL AND external_id IS NOT NULL;

COMMENT ON COLUMN public.public_services.source_layer IS 'Origem do dado no sync GeoSampa (ex: ponto_onibus, educacao_rede_privada)';
COMMENT ON COLUMN public.public_services.external_id IS 'ID do feature no GeoJSON/GeoSampa para upsert';
```

## Configuração das camadas

Defina as camadas de uma destas formas:

### Opção A – Arquivo `scripts/geosampa-layers.json`

Copie o exemplo e preencha com as URLs (ou caminhos locais) dos GeoJSON:

```bash
cp scripts/geosampa-layers.json.example scripts/geosampa-layers.json
# Edite geosampa-layers.json com as URLs reais
```

Formato de cada item:

```json
{
  "url": "https://...geojson  OU  caminho/relativo/ao/projeto/arquivo.geojson",
  "service_type": "other",
  "source_layer": "ponto_onibus"
}
```

- **url:** URL pública do GeoJSON (GeoSampa, api-geosampa, etc.) ou caminho local (ex.: `data/ponto_onibus.geojson`).
- **service_type:** um de: `ubs`, `school`, `ceu`, `hospital`, `library`, `sports_center`, `other`.
- **source_layer:** identificador único da camada (ex.: `ponto_onibus`, `educacao_rede_privada`). Usado no upsert junto com `external_id`.

**Camadas incluídas em `geosampa-layers.json` (padrão do projeto):** UBS, escolas (rede pública, infantil, privada, técnico, Senai/Sesi/Senac, outros), hospitais (e urgência/emergência), bibliotecas, centros esportivos e abastecimento (Mercados Municipais, Sacolões e Feira livre).

O script também preenche **phone**, **opening_hours** e **services_offered** quando o GeoJSON do GeoSampa traz essas propriedades:
- **phone:** `tx_numero_telefone`, `telefone`, etc.
- **opening_hours:** `tx_horario_funcionamento` → armazenado como `{ "text": "..." }`; exibido na tela de detalhe.
- **services_offered:** `tx_tipo_equipamento`, `tx_classe_equipamento` (descrição dos serviços oferecidos pelo equipamento); exibido na tela de detalhe em "Serviços oferecidos".

### Enriquecimento de horários dos CEUs (site SME)

O WFS do GeoSampa não preenche `tx_horario_funcionamento` para UBS/CEU. Para **CEUs**, é possível preencher `opening_hours` a partir do site da Secretaria Municipal de Educação:

- **Script:** `scripts/sync-ceu-opening-hours-sme.mjs`
- **Fonte:** [Unidades CEUs](https://ceu.sme.prefeitura.sp.gov.br/unidades-ceus/) — o script acessa a listagem, depois a página de cada unidade e extrai o texto "Horário de Funcionamento: ...".
- **Uso:** `node scripts/sync-ceu-opening-hours-sme.mjs` (requer `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no `.env`). Use `DRY_RUN=1` para apenas listar o que seria atualizado.
- Não é automatizado; rode quando quiser atualizar os horários dos CEUs na base.

### Opção B – Variável de ambiente

```bash
export GEOSAMPA_LAYERS_JSON='[{"url":"https://...","service_type":"other","source_layer":"ponto_onibus"}]'
```

## Onde obter as URLs dos GeoJSON

1. **WFS público do GeoSampa (recomendado):** O serviço WFS listado no [catálogo de metadados](https://metadados.geosampa.prefeitura.sp.gov.br/) **não exige sessão** e devolve GeoJSON estável. Use a base:
   - **GetCapabilities:** `https://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wfs?service=WFS&version=1.0.0&request=GetCapabilities`
   - **GetFeature (GeoJSON):** `https://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=geoportal:NOME_DA_CAMADA&outputFormat=application%2Fjson`
   - Troque `NOME_DA_CAMADA` pelo `<Name>` da camada no XML do GetCapabilities (ex.: `classificacao_viaria_cet`, `ponto_onibus`, `equipamento_educacao_ceu`).
2. **Portal GeoSampa:** em [geosampa.prefeitura.sp.gov.br](http://geosampa.prefeitura.sp.gov.br), o download por GeoJSON usa URL com parâmetro `hc` (sessão); essa URL **não é estável** para sync automático. Prefira o WFS acima.
3. **API GeoSampa (protótipo):** o projeto [api-geosampa](https://github.com/yubathom/api-geosampa) expõe uma API REST que devolve URLs dos arquivos do portal. Se estiver no ar, você pode usá-la para descobrir recursos; para vetores em JSON, o WFS público é a opção estável.

## Limpar dados GeoSampa antes de testar

Para zerar apenas os registros que vieram do sync (e manter os manuais):

1. Abra o **Supabase** → **SQL Editor** e execute:

```sql
DELETE FROM public.public_services
WHERE source_layer IS NOT NULL;
```

Ou rode o conteúdo de `scripts/clean-geosampa-public-services.sql`.

## Execução

```bash
cd /caminho/camana-na-mao
node scripts/sync-geosampa-public-services.mjs
```

- **Teste sem gravar:** `DRY_RUN=1 node scripts/sync-geosampa-public-services.mjs`

O script:

- Para cada camada em `geosampa-layers.json` (ou `GEOSAMPA_LAYERS_JSON`), baixa ou lê o GeoJSON.
- Extrai pontos (geometry type Point) e propriedades (nome, endereço, distrito, etc.).
- Faz **upsert** em `public_services` usando `(source_layer, external_id)`. Registros já existentes com o mesmo par são atualizados; novos são inseridos.

## Agendamento (rodar periodicamente)

Para manter os dados atualizados, execute o script em um cron ou job agendado.

### Exemplo – GitHub Actions (semanal)

Crie `.github/workflows/sync-geosampa.yml`:

```yaml
name: Sync GeoSampa -> public_services
on:
  schedule:
    - cron: '0 6 * * 1'   # Segunda 6h UTC
  workflow_dispatch:
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: node scripts/sync-geosampa-public-services.mjs
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          GEOSAMPA_LAYERS_JSON: ${{ secrets.GEOSAMPA_LAYERS_JSON }}
```

Configure os secrets no repositório (Settings → Secrets): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEOSAMPA_LAYERS_JSON` (JSON string com o array de camadas).

### Exemplo – Cron no servidor (Linux/macOS)

```bash
# Editar crontab: crontab -e
# Rodar todo dia às 6h
0 6 * * * cd /caminho/camana-na-mao && node scripts/sync-geosampa-public-services.mjs >> /var/log/geosampa-sync.log 2>&1
```

### Exemplo – Task Scheduler (Windows)

Crie uma tarefa que execute:

```powershell
node C:\Projetos\camana-na-mao\scripts\sync-geosampa-public-services.mjs
```

com a pasta do projeto como diretório de trabalho e as variáveis de ambiente definidas (ou use um `.env` no projeto).

## Dados já existentes (import manual)

Registros que você subiu manualmente (sem `source_layer`/`external_id`) **não** são alterados pelo script. Apenas linhas com o mesmo `(source_layer, external_id)` são atualizadas; as demais continuam na tabela. Para evitar duplicata de “mesmo lugar” (ex.: mesmo ponto de ônibus em uma camada manual e na camada GeoSampa), use sempre a mesma camada no script para esse tipo de equipamento e deixe o script ser a única fonte para essa camada (ou faça um backfill único atribuindo `source_layer`/`external_id` aos manuais antes de rodar o sync).

## Resumo

| Item | Descrição |
|------|-----------|
| Migration | `20260225120000_public_services_geosampa_source.sql` |
| Config | `scripts/geosampa-layers.json` ou `GEOSAMPA_LAYERS_JSON` (ou secret no GHA) |
| Script | `node scripts/sync-geosampa-public-services.mjs` |
| Workflow | `.github/workflows/sync-geosampa.yml` (semanal + manual); **requer** secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEOSAMPA_LAYERS_JSON` |
| Agendamento | GitHub Actions (acima), cron ou Task Scheduler conforme doc |
