# Camadas GeoSampa – Legislação Urbana

Camadas de overlay relacionadas a Legislação Urbana adicionadas em `src/config/geosampa-overlay-layers.ts`.

**Fonte:** Menu Legislação Urbana do GeoSampa (https://geosampa.prefeitura.sp.gov.br)

---

## Camadas incluídas

### Zoneamento (LPUOS)
| id | typeName | Label |
|----|----------|-------|
| zoneamento_2016 | zoneamento_2016_map1 | Zoneamento 2016 (LPUOS) |
| zoneamento_classificacao_viaria | zoneamento_classificacao_viaria | Zoneamento – Classificação Viária |
| zoneamento_corredor_uso | zoneamento_corredor_uso | Zoneamento – Corredor de Uso |
| zoneamento_geoambiental | GEOSAMPA_zoneamento_geoambiental_apa_cm | Zoneamento Geoambiental APA/CM |
| zoneamento_revogado_lei13885 | perimetro_zoneamento_revogado_lei13885 | Zoneamento Revogado (Lei 13.885/04) |

### PDE (Plano Diretor)
| id | typeName | Label |
|----|----------|-------|
| pde_zeis | pde2014_v_zeis_04_map | PDE – ZEIS (Zonas Especiais) |
| pde_macroarea | pde2014_v_mcrar_02_map | PDE – Macroáreas |
| plano_acao_regional | plano_acao_regional | Planos Regionais – Ação Regional |
| plano_macro_regional | plano_macro_regional | Planos Regionais – Macro Regional |

### Operações Urbanas
| id | typeName | Label |
|----|----------|-------|
| operacao_urbana | operacao_urbana | Operações Urbanas |
| subsetor_operacao_urbana | subsetor_operacao_urbana | Setores / Subsetores Operação Urbana |
| oucfl_area_influencia | oucfl_area_influencia | Áreas de Influência OUC Faria Lima |

### AIU (Áreas de Intervenção Urbana)
| id | typeName | Label |
|----|----------|-------|
| perimetro_aiu | perimetro_aiu | AIU – Perímetro Geral (Setor Central e demais) |
| perimetro_especial_aiu | perimetro_especial_aiu | AIU – Perímetro Especial |
| aiu_vila_leopoldina | aiu_vl_perimetro_adesao | AIU Vila Leopoldina – Perímetro Adesão |
| aiu_jurubatuba | aiu_perimetro_jurubatuba | AIU Arco Jurubatuba |
| aiu_pinheiros | aiu_perimetro_pinheiros | AIU Arco Pinheiros |

### Requalifica Centro
| id | typeName | Label |
|----|----------|-------|
| requalifica_centro | requalifica_centro_perimetro_geral | Requalifica Centro (Lei 17.577/21) |

### Instrumentos urbanísticos
| id | typeName | Label |
|----|----------|-------|
| outorga_onerosa | outorga_onerosa | Outorga Onerosa |
| imovel_notificado | imovel_notificado | Imóveis Notificados – Função Social |
| restricao_geotecnica | restricao_geotecnica | Áreas com Restrições Geotécnicas |

---

## Uso

As camadas são exibidas como overlay no mapa quando o usuário seleciona em "Camadas GeoSampa". O frontend usa `buildWfsUrl()` para montar a URL WFS com `maxFeatures` configurado por camada.

**Nota:** Não usar em `geosampa-layers.json` (sync para `public_services`) – são polígonos/áreas, não pontos de serviço.
