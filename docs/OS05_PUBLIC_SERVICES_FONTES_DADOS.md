# OS05 – Carga de dados reais em `public_services`

Documento breve das **APIs/fontes** utilizadas para popular a tabela `public_services` com dados reais de São Paulo (UBSs, escolas, CEUs, hospitais, bibliotecas, centros esportivos). Sem esses dados, o mapa não exibe equipamentos.

---

## Resumo por tipo de serviço

| Tipo no mapa | Fonte | API / Camada |
|--------------|--------|---------------|
| **UBSs** | GeoSampa WFS | `geoportal:equipamento_saude_ubs_posto_centro` |
| **Escolas** | GeoSampa WFS + API Escola Aberta (SME) | WFS: `equipamento_educacao_rede_publica`, `equipamento_educacao_infantil_rede_publica`, `equipamento_educacao_rede_privada`, `equipamento_educacao_ensino_tecnico_rede_publica`, `equipamento_educacao_senai_sesi_senac`, `equipamento_educacao_outros`. Escola Aberta: `GET /api/livroaberto_escolas/` |
| **CEUs** | API Escola Aberta (SME) | `GET /api/livroaberto_escolas/` — registros com nome contendo "CEU" ou campo `ceu` preenchido → `service_type = 'ceu'` |
| **Hospitais** | GeoSampa WFS | `geoportal:equipamento_saude_urgencia_emergencia`, `geoportal:equipamento_saude_hospital`, `equipamento_saude_ambulatorios_especializados`, `equipamento_saude_saude_mental`, `equipamento_ccz`, `equipamento_saude_outros`, `equipamento_saude_unidades_dst-aids` |
| **Bibliotecas** | GeoSampa WFS | `geoportal:equipamento_cultura_bibliotecas` |
| **Centros esportivos** | GeoSampa WFS | `geoportal:equipamento_esporte_centro_esportivo`, `equipamento_esporte_clubes`, `equipamento_esporte_estadios`, `equipamento_esporte_clubesdacomunidade`, `equipamento_esporte_outros` |

---

## Detalhamento

### 1. GeoSampa WFS (maioria dos equipamentos)

- **Base:** `https://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wfs`
- **Formato:** `GetFeature` com `outputFormat=application/json` (GeoJSON).
- **Configuração:** URLs por camada em `scripts/geosampa-layers.json`.
- **Sync:** script `scripts/sync-geosampa-public-services.mjs` (lê o JSON, extrai pontos, faz upsert em `public_services` por `source_layer` + `external_id`).
- **Produção:** em ambiente com CORS restritivo, o front usa a Edge Function `geosampa-wfs-proxy`; o **sync** é feito em backend/CI e acessa o WFS diretamente ou via proxy conforme a configuração.

### 2. API Escola Aberta (SME) – Escolas municipais e CEUs

- **API:** Escola Aberta (SME) — endpoint `GET /api/livroaberto_escolas/` (modelo [SME-EscolaAberta-API](https://github.com/prefeiturasp/SME-EscolaAberta-API)).
- **Campos usados:** `codesc`, `nomesc`, `tipoesc`, `ceu`, `endereco`, `numero`, `bairro`, `cep`, `tel1`, `latitude`, `longitude`, `distrito`.
- **CEU:** registro é considerado CEU se o nome contém "CEU", o campo `ceu` está preenchido ou `tipoesc` indica CEU → gravado com `service_type = 'ceu'`; demais com `service_type = 'school'`.
- **Sync:** script `scripts/sync-escolaaberta-public-services.mjs`; workflow opcional `.github/workflows/sync-escolaaberta-ceu.yml` (ex.: diário 7h UTC).
- **Horários CEU:** enriquecimento opcional via `scripts/sync-ceu-opening-hours-sme.mjs` (site [Unidades CEUs](https://ceu.sme.prefeitura.sp.gov.br/unidades-ceus/)).

---

## Arquivos de configuração e execução

| Finalidade | Arquivo |
|------------|--------|
| Lista de camadas WFS (GeoSampa) | `scripts/geosampa-layers.json` |
| Sync GeoSampa → `public_services` | `scripts/sync-geosampa-public-services.mjs` |
| Sync Escola Aberta (escolas + CEUs) | `scripts/sync-escolaaberta-public-services.mjs` |
| Documentação do sync GeoSampa | `docs/SYNC_GEOSAMPA_PUBLIC_SERVICES.md` |
| Documentação Escola Aberta / CEU | `docs/SYNC_ESCOLA_ABERTA.md`, `docs/ESCOLA_ABERTA_ENDPOINTS.md` |

---

## Conclusão

Os dados reais para **UBSs, escolas (várias redes), CEUs, hospitais, bibliotecas e centros esportivos** de São Paulo estão cobertos:

- **GeoSampa WFS** para UBS, hospitais, bibliotecas, centros esportivos e escolas (rede privada, técnico, Senai/Sesi/Senac, outros, além de redes públicas via WFS).
- **API Escola Aberta (SME)** para escolas municipais e **CEUs** (estes apenas por essa API, não por camada WFS de equipamentos).

A carga é feita pelos scripts de sync que fazem upsert em `public_services`; o mapa consome essa tabela (e.g. via `useNearbyServices` / Supabase).
