# Camadas GeoSampa a implementar (implementação pontual)

## ✅ Implementado nesta fase

### Assistência Social (Prioridade ALTA)
- **typeName:** `geoportal:equipamento_assistencia_social`
- **source_layer:** `assistencia_social`
- **service_type:** `social_assistance`
- **Status:** Adicionado em `geosampa-layers.json`, sync e filtros

### Acessibilidade
- **typeName:** `geoportal:acessibilidade_smped` — Selo Acessibilidade Arquitetônica (~972)
- **typeName:** `geoportal:central_intermediacao_libra` — Central Intermediação Libras (~826)
- **service_type:** `other`
- **Campos:** `nm_estabelecimento` / `nm_central_intermediacao_libra`, `tx_endereco`, `nm_distrito`, `nm_subprefeitura`

### Limpeza Urbana (PEV / Ecoponto)
- **typeName:** `geoportal:ponto_entrega_voluntaria` — PEV (~507)
- **typeName:** `geoportal:ecoponto` — Ecoponto (~128)
- **service_type:** `other`
- **Campos PEV:** `nm_local`, `nm_endereco`
- **Campos Ecoponto:** `nm_ecoponto`, `nm_endereco`, `tx_atendimento`, `tx_recebimento_comum`, `tx_recebimento_diferenciado`

### Transporte
- **typeName:** `geoportal:ponto_onibus` — Pontos de ônibus (~22.386)
- **service_type:** `transit_station`
- **Campos:** `nm_ponto_onibus`, `tx_endereco_ponto_onibus`

### Limpeza Urbana – Estação de Transbordo / Cooperativas
- **typeName:** `geoportal:estacao_transbordo` — Estação de Transbordo (~3)
- **typeName:** `geoportal:central_triagem_cooperativa` — Central Triagem Cooperativa (~24)
- **service_type:** `other`
- **Campos Estação:** `nm_estacao_transbordo`, `nm_endereco`, `tx_agrupamento`, `nm_concessionaria`
- **Campos Cooperativa:** `nm_cooperativa`, `nm_endereco`, `tx_especialidade`

### Verde / Praças e WiFi
- **typeName:** `geoportal:equipamento_praca_wifi` — Praças com WiFi Livre (~1.915 pontos)
- **typeName:** `geoportal:GEOSAMPA_v_praca_largo` — Cadastro Praças e Largos (~3.830 polígonos)
- **service_type:** `other` (WiFi) / `park` (praças)
- **Campos WiFi:** `nm_equipamento`, `tx_endereco_equipamento`, `tx_classe_equipamento`
- **Campos Praças:** `nome`, `distrito`, `subprefeitura`, `endereco1`, `area_metro`, `categoria`

### Transporte – Metrô, Trem, Terminais, Ciclovias
- **typeName:** `geoportal:estacao_metro` — Estações de Metrô (~94)
- **typeName:** `geoportal:estacao_trem` — Estações de Trem/CPTM (~109)
- **typeName:** `geoportal:terminal_onibus` — Terminais de Ônibus (~50)
- **typeName:** `geoportal:bicicletario_paraciclo` — Bicicletários e Paraciclos (~121)
- **service_type:** `transit_station`
- **Campos Metrô/Trem:** `nm_estacao_metro_trem`, `nm_linha_metro_trem`, `nm_empresa_metro_trem`, `tx_situacao_metro_trem`
- **Campos Terminal:** `nm_terminal`, `tx_endereco_terminal`, `nm_tipo_terminal`, `tx_status_terminal`
- **Campos Bicicletário:** `nm_local`, `tx_tipo_equipamento`, `qt_vaga`, `nm_orgao_responsavel` (sem endereço)

**Nota:** CEUs vêm da APILIB, não do GeoSampa.

### Limpeza Urbana / Abastecimento
- **typeName:** `geoportal:aterro_sanitario` — Aterros Sanitários (~9)
- **typeName:** `geoportal:equipamento_bom_prato` — Restaurantes Bom Prato (~27)
- **service_type:** `other`
- **Campos Aterro:** `nm_aterro_sanitario`, `nm_endereco`, `tx_status_aterro_sanitario`, `nm_concessionaria`
- **Campos Bom Prato:** `nm_equipamento`, `tx_endereco_equipamento`, `tx_classe_equipamento`

### Segurança Pública
- **typeName:** `geoportal:equipamento_bombeiros` — Corpo de Bombeiros (~40)
- **typeName:** `geoportal:equipamento_policia_civil` — Delegacias Polícia Civil (~93)
- **typeName:** `geoportal:equipamento_policia_militar` — Polícia Militar (~159)
- **service_type:** `other` (bombeiros) / `police_station` (polícias)
- **Campos:** `nm_equipamento`, `tx_endereco_equipamento`, `nm_bairro_equipamento`

### Cemitérios
- **typeName:** `geoportal:equipamento_cemiterio` — Cemitérios (~46 polígonos)
- **service_type:** `cemetery`
- **Campos:** `nm_equipamento`, `tx_endereco_equipamento`, `nm_bairro_equipamento`, `tx_horario_funcionamento`

### Saúde – Ambulatórios e Saúde Mental
- **typeName:** `geoportal:equipamento_saude_ambulatorios_especializados` — Ambulatórios Especializados (~149)
- **typeName:** `geoportal:equipamento_saude_saude_mental` — Saúde Mental / CAPS (~131)
- **typeName:** `geoportal:equipamento_saude_outros` — Outros estabelecimentos de saúde (~85)
- **typeName:** `geoportal:equipamento_saude_unidades_dst-aids` — Unidades DST/AIDS (~28)
- **service_type:** `other`
- **Campos:** `nm_equipamento`, `tx_endereco_equipamento`, `nm_bairro_equipamento`, `tx_classe_equipamento`

### Casas de Mediação / Conselho Tutelar / Cultura / GCM
- **typeName:** `geoportal:equipamento_casas_mediacao` — Casas de Mediação (~26)
- **typeName:** `geoportal:equipamento_ccz` — Centros Controle Zoonose (~4)
- **typeName:** `geoportal:equipamento_conselho_tutelar` — Conselhos Tutelares (~52)
- **typeName:** `geoportal:equipamento_cultura_outros` — Cultura outros (~10)
- **typeName:** `geoportal:equipamento_guarda_civil_metropolitana` — GCM (~48)
- **service_type:** `other`

### Esporte – Clubes, Estádios, Clubes da Comunidade
- **typeName:** `geoportal:equipamento_esporte_clubes` — Clubes (~231)
- **typeName:** `geoportal:equipamento_esporte_estadios` — Estádios (~14)
- **typeName:** `geoportal:equipamento_esporte_clubesdacomunidade` — Clubes da Comunidade (~282)
- **typeName:** `geoportal:equipamento_esporte_outros` — Outros esporte (~1)
- **service_type:** `sports_center`
- **Campos:** `nm_equipamento`, `tx_endereco_equipamento`, `tx_classe_equipamento`

### Criança e Adolescente / Shopping
- **typeName:** `geoportal:equipamento_entidade_crianca_adolescente` — CCA, CEC, etc. (~2.974)
- **typeName:** `geoportal:equipamento_shopping_center` — Shoppings (~56 polígonos)
- **service_type:** `other`
- **Campos entidade:** `nm_servico`, `nm_entidade`, `nm_endereco`, `nm_bairro`, `tx_telefone`, `nm_prefeitura_regional`
- **Campos shopping:** `nm_shopping_center`, `endereco_completo`, `nr_telefone`

---

## 🔍 A verificar (typeName exato via GetCapabilities)

O GetCapabilities do GeoSampa às vezes retorna erro 500. Para obter os nomes exatos das camadas:
1. Acesse: https://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wfs?service=WFS&version=1.0.0&request=GetCapabilities
2. Ou use o [catálogo de metadados](https://metadados.geosampa.prefeitura.sp.gov.br/) e busque por palavra-chave

### Limpeza Urbana – pendentes
| Camada no GeoSampa | typeName provável | service_type sugerido |
|--------------------|-------------------|------------------------|
| Varrição, Pátio Compostagem, Papeleira | — | — |

**Nota:** Algumas camadas de Limpeza Urbana podem ser pontos; outras podem ser polígonos ou linhas (ex.: cobertura de varrição). O sync atual processa apenas Point e Polygon/MultiPolygon (usa centroide).

---

## Como adicionar novas camadas

1. Obter o **typeName** correto (GetCapabilities ou metadados)
2. Testar a URL:
   ```
   https://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=geoportal:TIPO_NOME&outputFormat=application%2Fjson&srsName=EPSG:4326&maxFeatures=1
   ```
3. Se retornar GeoJSON com features, adicionar em `scripts/geosampa-layers.json`:
   ```json
   {"url":"...typeName=geoportal:TIPO_NOME...", "service_type":"xxx", "source_layer":"xxx"}
   ```
4. Se precisar novo `service_type`, adicionar ao enum (migration), ao sync (SERVICE_TYPES) e ao frontend (ServiceTypeFilter, ServiceCard, etc.)
