# Análise: Api-GeoSampa (Felipe-MTech) como fonte de equipamentos

**Repositório:** https://github.com/Felipe-MTech/Api-GeoSampa  
**Data da análise:** 23/02/2026

## O que a API oferece

A Api-GeoSampa (Felipe-MTech) é um **protótipo de API REST** (json-server, read-only) que expõe **catálogos de URLs de arquivos** publicados no portal do [GeoSampa](http://geosampa.prefeitura.sp.gov.br/). Foi proposta na Hackatona do GeoSampa.

### Endpoints (prefixo `/v1/`)

| Endpoint | Conteúdo |
|----------|----------|
| `dados-abertos` | Metadados e links para os outros endpoints |
| `limites-administrativos` | Catálogo de **limites administrativos**: Região 5, Região 8, Distritos, Prefeituras Regionais, Limites municipais, etc. Cada seção aponta para **URLs de download** (ZIP com SHP, CSV, XLSX, KML). |
| `arquivos` | Lista de **arquivos para download**: ID, título, extensão, data, **url** (ZIP no S3). Ex.: limites distritos (dxf, kmz, shp), prefeituras regionais, PIU Setor Central. |
| `sei` | Catálogo adicional (não inspecionado; provavelmente outro conjunto de metadados/arquivos). |

### Formato dos dados

- **Não há** endpoint que retorne **GeoJSON** ou **JSON** com lista de **equipamentos** (UBS, escolas, CEUs, bibliotecas, pontos de ônibus, etc.).
- Os dados expostos são:
  - Metadados (título, autor, data, escala, responsável).
  - **URLs para download** de arquivos estáticos (ZIP contendo shapefile, CSV, etc.) de **limites e regiões**, não de pontos de equipamentos.

Ou seja: a API serve como **índice de downloads** (limites administrativos, PIU), **não** como fonte de **geometrias/atributos de equipamentos públicos** (nome, endereço, lat/lng, tipo).

## Compatibilidade com Câmara na Mão

No Câmara na Mão, a tabela `public_services` precisa de:

- **Geometria:** ponto (latitude, longitude).
- **Atributos:** nome, endereço, distrito, tipo de serviço (ubs, school, ceu, etc.).

O script `scripts/sync-geosampa-public-services.mjs` consome **URLs de GeoJSON** (ou caminhos locais) em que cada *feature* é um **Point** com propriedades (nome, endereço, distrito, etc.).

A Api-GeoSampa (Felipe-MTech) **não expõe**:

- GeoJSON de equipamentos.
- Nenhum endpoint que devolva lista de equipamentos com coordenadas e nome/endereço.

Por isso **não é possível** substituir a fonte atual de dados (GeoJSON do GeoSampa/outros) por essa API para popular `public_services` e “utilizar o aplicativo a partir da API”. Fazer isso e limpar a tabela deixaria o app sem dados de equipamentos.

## Recomendações

1. **Manter a abordagem atual:** continuar usando o script de sync com **URLs de GeoJSON** de equipamentos (obtidas no portal GeoSampa ou em outro servidor que sirva camadas de pontos em GeoJSON). A documentação em `docs/SYNC_GEOSAMPA_PUBLIC_SERVICES.md` já descreve esse fluxo.

2. **Uso eventual da Api-GeoSampa (Felipe-MTech):** só faria sentido se no futuro essa API (ou um fork) passasse a expor:
   - endpoints que retornem **GeoJSON de equipamentos** (ou JSON com lat/lng + atributos), ou
   - URLs estáveis de **download de GeoJSON** de camadas de equipamentos que o script de sync possa usar em `geosampa-layers.json`.

3. **Não limpar** a tabela `public_services` para passar a depender só dessa API no estado atual: a aplicação perderia a lista de equipamentos exibida no mapa e em “Perto de Você”.

---

*Documento gerado após análise do repositório Felipe-MTech/Api-GeoSampa (README, server.js, views.js, model/dados-abertos.js, model/arquivos.js, model/limites-administrativos.js).*
