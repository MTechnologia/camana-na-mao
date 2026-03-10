# Camadas GeoSampa – Lista do Cliente (prints)

Documento com todas as categorias/camadas dos prints enviados pelo cliente. Indica quais são **pontos** (candidatas ao sync `public_services`) e quais são **áreas/linhas** (visualização no mapa via WMS/WFS overlay).

Para obter os **typeNames** exatos, rode localmente:
```bash
node scripts/list-geosampa-wfs-layers.mjs
```
Ou com filtro: `node scripts/list-geosampa-wfs-layers.mjs "acessibilidade"`

---

## Resumo por prioridade

| Prioridade | Categoria | Tipo | Sync public_services? |
|------------|-----------|------|------------------------|
| ALTA | Equipamentos – Assistência Social | Pontos | ✅ Implementado |
| ALTA | Equipamentos – Saúde, Educação | Pontos | ✅ Já temos |
| MÉDIA | Acessibilidade | Pontos | ✅ Implementado |
| MÉDIA | Limpeza Urbana (PEV, Ecoponto, Transbordo, Cooperativas) | Pontos | ✅ Implementado |
| MÉDIA | Verde – Praças e Largos | Polígonos (centroide) | ✅ Implementado |
| MÉDIA | Transporte (Metrô, Trem, Terminais, Ciclovias) | Pontos | ✅ Implementado |
| MÉDIA | Educação – CEUs | Pontos | Via APILIB (não GeoSampa) |
| BAIXA | Bom Prato, Aterro Sanitário | Pontos | ✅ Implementado |
| MÉDIA | Segurança (Bombeiros, Polícia Civil, PM) | Pontos | ✅ Implementado |
| BAIXA | Cemitérios | Polígonos (centroide) | ✅ Implementado |
| MÉDIA | Saúde – Ambulatórios, Saúde Mental | Pontos | ✅ Implementado |
| MÉDIA | Esporte – Clubes, Estádios, CDC | Pontos | ✅ Implementado |
| MÉDIA | Casas Mediação, Conselho Tutelar, GCM, CCZ | Pontos | ✅ Implementado |
| BAIXA | Saúde – Outros, DST/AIDS | Pontos | ✅ Implementado |
| MÉDIA | Entidades Criança/Adolescente (CCA, CEC) | Pontos | ✅ Implementado |
| BAIXA | Shoppings | Polígonos (centroide) | ✅ Implementado |
| MÉDIA/BAIXA | Demais | Áreas/linhas/raster | WMS/WFS overlay (não sync) |

---

## Categorias detalhadas (dos prints)

### 1. Patrimônio Cultural
- **Tombamento:** Bem Tombado, Bairro Ambiental, Lugar de Interesse Paisagístico, Área Envoltória CONPRESP/CONDEPHAAT/IPHAN, Acervo Tombado
- **Arqueologia:** Bem Registrado, Selo de Valor Cultural, Inventário Memória Paulistana, ZEPEC-APC, Monumento, Próprio Municipal, Memória e Verdade
- **Tipo:** Polígonos/áreas
- **Uso:** Camada de overlay no mapa (não sync)

### 2. Verde / Recursos naturais
- Mapeamento Cobertura Vegetal 2017
- Cadastro Praças e Largos
- Plano Municipal da Mata Atlântica (PMMA) – subcamadas
- Parques e Unidades de Conservação – APA, Parques, Terra Indígena
- **Tipo:** Polígonos/áreas (Parques já temos em sync)
- **Uso:** Overlay no mapa; Praças/Largos podem ter pontos – verificar

### 3. Arborização Urbana
- Arborização viária
- Vegetação Significativa 2023
- **Tipo:** Linhas/polígonos
- **Uso:** Overlay no mapa

### 4. Acessibilidade ⭐ (candidata a sync)
- Selo de Acessibilidade Arquitetônica
- Central de Intermediação de Libras
- **Tipo:** Pontos (equipamentos)
- **Uso:** Sync `public_services` – buscar typeName

### 5. Limites Administrativos
- Distrito
- Subprefeituras
- Município de São Paulo
- **Tipo:** Polígonos
- **Uso:** Overlay de limites no mapa

### 6. Sistema Viário
- Logradouro, Classificação Viária CET, Quadra Viária, Obras de Arte
- Cruzamentos Semaforizados, Calçadas, Acidentes
- DET, GET, Hierarquização pedestre
- Restrição à circulação (subcamadas)
- Estacionamento (subcamadas)
- **Tipo:** Linhas/polígonos
- **Uso:** Overlay no mapa

### 7. Infraestrutura Urbana
- Rede gás, Energia, ISA CTEEP, Piscinões
- Lei de melhoramento viário, Faixa Não Edificável
- Geoinfra – Obras, Iluminação Pública, Rede Transpetro
- **Tipo:** Linhas/pontos
- **Uso:** Overlay; pontos específicos podem ser candidatos a sync

### 8. Habitação / Edificação
- Empreendimento Habitacional, Urbanização Assentamento Precário
- Favela, Núcleo, Loteamento Irregular, Cortiço
- Edificações 3D/2D
- **Tipo:** Polígonos
- **Uso:** Overlay no mapa

### 9. Rede de Drenagem / Mancha de Inundação
- Rede de Drenagem, Cadernos, Plano Diretor, Potencial Infiltração
- Bacia Hidrográfica, Reservatório/Piscinão
- Mancha de Inundação (5, 25, 100 anos, PDMAT)
- **Tipo:** Linhas/polígonos
- **Uso:** Overlay no mapa

### 10. Licenciamento / Licenciamento Ambiental
- Muitas subcamadas (não expandidas nos prints)
- **Tipo:** Polígonos/áreas
- **Uso:** Overlay no mapa

### 11. Limpeza Urbana ⭐ (candidata a sync – pontos)
- Agrupamento Serviços Divisíveis
- Resíduos de Saúde, Estação Transbordo, Central Triagem
- Aterro Sanitário, Varrição e Limpeza
- PEV (Ponto de Entrega Voluntária)
- Papeleira, Ecoponto, Aterro RCC
- Pátio Compostagem, Cooperativas Habilitadas, Ponto Revitalizado
- **Tipo:** PEV e Ecoponto são pontos; demais variam
- **Uso:** PEV/Ecoponto → sync `public_services` – buscar typeName

### 12. Imageamento
- Fotos Aéreas – Drone/Helicóptero (e subcamadas)
- **Tipo:** Raster/imagens
- **Uso:** Camada de imagem no mapa (WMS)

### 13. Meio Físico
- Hidrografia, Topografia, Área de Proteção Mananciais
- Carta Geotécnica 2024, Solo Mole
- **Tipo:** Polígonos/linhas
- **Uso:** Overlay no mapa

### 14. Rural
- Agropecuária – Unidades de Produção (e subcamadas)
- **Tipo:** Polígonos/pontos
- **Uso:** Overlay; pontos podem ser candidatos

### 15. Desapropriação
- Plantas de Decreto (DUP/DIS)
- Plantas Expropriatórias, Plantas Expropriatórias Indiretas
- **Tipo:** Polígonos
- **Uso:** Overlay no mapa

### 16. População
- Censo – Setor Censitário 2022, Dens. Demográfica
- Indicadores sociais – IPVS
- **Tipo:** Polígonos temáticos
- **Uso:** Overlay no mapa

---

## Próximos passos

1. **Rodar** `node scripts/list-geosampa-wfs-layers.mjs` localmente para obter a lista de typeNames.
2. **Adicionar** ao `geosampa-layers.json` as camadas de **pontos** (Acessibilidade, PEV, Ecoponto, etc.) cujo typeName for encontrado.
3. **Planejar** a visualização das camadas de **área/linha** (WMS/WFS overlay) em fase posterior.
