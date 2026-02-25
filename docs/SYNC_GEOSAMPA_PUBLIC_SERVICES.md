# Sync GeoSampa → public_services

Script e fluxo para manter a tabela `public_services` atualizada com camadas do [GeoSampa](http://geosampa.prefeitura.sp.gov.br/) (pontos de ônibus, escolas rede privada, etc.).

**Sync automático:** Por padrão o sync **não** roda sozinho. Para que atualizações no GeoSampa reflitam automaticamente no nosso banco, é preciso (1) configurar as URLs das camadas (ver abaixo) e (2) agendar o script — por exemplo usando o workflow `.github/workflows/sync-geosampa.yml` (semanal) após configurar os secrets no repositório.

## Pré-requisitos

- Node.js 18+
- **Migration aplicada:** `20260225120000_public_services_geosampa_source.sql` (adiciona `source_layer` e `external_id` em `public_services`)
- **Chave Service Role** do Supabase no `.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

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

### Opção B – Variável de ambiente

```bash
export GEOSAMPA_LAYERS_JSON='[{"url":"https://...","service_type":"other","source_layer":"ponto_onibus"}]'
```

## Onde obter as URLs dos GeoJSON

1. **Portal GeoSampa:** em [geosampa.prefeitura.sp.gov.br](http://geosampa.prefeitura.sp.gov.br), abra a camada desejada (ex.: Equipamentos → Educação → Rede Privada), use o ícone de download e escolha **GeoJSON**. A URL de download pode ser reaproveitada se for estável.
2. **API GeoSampa (protótipo):** o projeto [api-geosampa](https://github.com/yubathom/api-geosampa) expõe uma API REST que devolve URLs dos arquivos do portal. Se estiver no ar, você pode primeiro chamar essa API para obter as URLs e depois baixar os GeoJSON (ou adaptar o script para chamar a API antes).

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
