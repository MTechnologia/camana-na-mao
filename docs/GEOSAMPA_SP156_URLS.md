# URLs GeoSampa – Atendimento ao Cidadão (SP 156)

Camadas WFS do GeoSampa com solicitações SP156 (últimos 6 meses, georreferenciadas).

**URL base:**
```
https://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=geoportal:TYPENAME&outputFormat=application%2Fjson&srsName=EPSG:4326
```
Substitua `TYPENAME` pelo valor da coluna `typeName` abaixo.

---

## 1. Animais

| typeName | Título |
|----------|--------|
| `sac_avaliacao_animal_sofrimento_eutanasia` | Avaliação de animal em sofrimento sem proprietário para eutanásia |
| `sac_avaliacao_local_pernilongo_mosquito` | Solicitar avaliação de local com pernilongo/mosquito |
| `sac_aviso_animal_agressor_via_publica` | Avisar sobre animal agressor em vias públicas |
| `sac_aviso_animal_encontrado` | Avisar sobre animal encontrado com RGA |
| `sac_reclamar_local_com_morcego` | Morcego - Reclamar sobre local com morcego |
| `sac_remocao_animal` | Remoção de animal morto em via pública |
| `sac_remocao_animal_grande_porte_solto` | Animal de grande porte solto - Solicitar remoção |
| `sac_vistoria_colmeia_vespeiro_instalado` | Vistoria de colmeia/vespeiro instalado |

---

## 2. Bilhete Único

| typeName | Título |
|----------|--------|
| `sac_falha_recarga_bilhete_unico` | Bilhete Único - Falha na recarga |
| `sac_comunicacao_erro_cobranca_integracao` | Comunicação de erro em cobrança de integração (ônibus e metrô ou trem) |
| `sac_comunicacao_venda_credito_clandestino` | Comunicação de ponto de venda de crédito clandestino |
| `sac_comunicacao_problema_posto_recarga_bilhete_unico` | Comunicação de problema em posto de recarga |

---

## 3. Lixo e Limpeza (Prints 2 e 3)

| typeName | Título |
|----------|--------|
| `sac_ausencia_coleta_conteiner_coleta_seletiva` | Ausência de coleta do contêiner para coleta seletiva |
| `sac_cata_bagulho` | Cata Bagulho - Reclamação de não retirada de material |
| `sac_solicitacao_manutencao_conteiner_coleta_seletiva` | Coleta seletiva - Solicitar manutenção de contêiner |
| `sac_conserto_lixeira` | Conserto de lixeira |
| `sac_denuncia_ma_conduta_funcionario_limpeza` | Denúncia de má conduta dos funcionários de limpeza |
| `sac_denuncia_ma_conduta_motorista_coletor_limpeza` | Denúncia de má conduta dos funcionários (motoristas/coletores) |
| `sac_implantacao_coleta_porta_porta` | Implantação de coleta porta-porta |
| `sac_conteiner` | Instalação de contêiner para coleta de lixo domiciliar |
| `sac_instalacao_conteiner_coleta_seletiva` | Instalação de contêiner para coleta seletiva |
| `sac_remocao_lixeira` | Instalação e remoção de lixeira |
| `sac_lavagem_especial` | Lavagem especial de locais públicos |
| `sac_limpeza_enchente_evento` | Limpeza da via pública após enchentes ou eventos |
| `sac_limpeza_manutencao_monumento_publico` | Limpeza e conservação de monumentos públicos |
| `sac_manutencao_conteiner_residuo_servico_saude` | Manutenção de contêiner de resíduos do serviço de saúde |
| `sac_reclamacao_falta_lavagem_calcadao` | Reclamação de falta de lavagem de calçadões |
| `sac_reclamacao_falta_limpeza_ruas_feira` | Reclamação de falta de limpeza de ruas após a feira |
| `sac_falta_varricao` | Reclamação de falta de varrição |
| `sac_remocao_saco_varricao` | Reclamação de não remoção dos sacos de varrição |
| `sac_reclamacao_coleta_lixo_domiciliar` | Reclamações sobre coleta de lixo domiciliar |
| `sac_reclamacao_coleta_residuo_servico_saude` | Reclamações sobre coleta de resíduos de serviços de saúde |
| `sac_reclamacao_coleta_seletiva` | Reclamações sobre coleta seletiva |
| `sac_remocao_conteiner_coleta_lixo_domiciliar` | Remoção de contêiner para coleta de lixo domiciliar |
| `sac_remocao_entulho` | Remoção de entulho em via pública |
| `sac_remocao_grande_objeto` | Remoção de grandes objetos em vias públicas |
| `sac_remocao_conteiner_coleta_seletiva` | Remoção do contêiner de coleta seletiva |
| `sac_selo_identificacao_estabelecimento_gerador_residuo` | Selo de identificação de estabelecimento gerador de resíduos de saúde |

---

## 4. Meio Ambiente e Rua e Bairro (Print 4)

| typeName | Título |
|----------|--------|
| `sac_sugestao_obra_drenagem_corrego` | Meio Ambiente - Sugerir obras de drenagem em córregos |
| `sac_capinacao_guia_sarjeta` | Capinação em guias e sarjetas |
| `sac_limpeza_bueiro` | Limpeza de bueiros, boca de lobo e poços de visita |
| `sac_pintura_guia_poste` | Pintura de guias e postes |
| `sac_reformar_galeria_agua_chuva_pluvial` | Reformar galerias de águas pluviais |
| `sac_reparo_manutencao_relogio_rua` | Reparo e manutenção de relógios de rua |
| `sac_tapa_buraco` | Tapa-buraco |
| `sac_tapa_buraco_faixa_corredor` | Tapa-buraco em faixa exclusiva ou corredor de ônibus |
| `sac_vistoria_reparo_ponte_viaduto` | Vistoria e reparo de pontes e viadutos |

---

## 5. Trânsito e Transporte (Prints 5, 6 e 7)

| typeName | Título |
|----------|--------|
| `sac_comunicacao_colisao_veiculo_atende` | ATENDE - Comunicação sobre colisão de veículo |
| `sac_solicitacao_avaliacao_ciclofaixa_lazer` | Ciclofaixas de lazer - Solicitar avaliação |
| `sac_solicitacao_avaliacao_infraestrutura_ciclovia` | Ciclovias, ciclofaixas e ciclorrotas - Solicitar avaliação da infraestrutura |
| `sac_solicitacao_manutencao_sinalizacao_pintura_ciclofaixa` | Ciclovias, ciclofaixas e ciclorrotas - solicitar manutenção da sinalização e pintura |
| `sac_sugestao_implantacao_ciclovia_ciclofaixa` | Ciclovias, ciclofaixas e ciclorrotas - Sugerir implantação |
| `sac_criacao_reativacao_linha_onibus` | Criação/reativação de linha de ônibus |
| `sac_criacao_partida_horario_especifico` | Criação de partida em horário específico |
| `sac_denuncia_veiculo_clandestino_nao_credenciado` | Denúncia de veículo clandestino ou não credenciado |
| `sac_elogio_empresa_onibus` | Elogio à empresa de ônibus |
| `sac_veiculo_local_proibido` | Fiscalização de veículo estacionado em local proibido |
| `sac_implantacao_abrigo_ponto_onibus` | Implantação de abrigo ou ponto de ônibus |
| `sac_inclusao_veiculo_adaptado_linha` | Inclusão de veículo adaptado na linha |
| `sac_limpeza_onibus` | Limpeza do ônibus |
| `sac_manutencao_conserto_limpeza_ponto_onibus` | Manutenção, conserto e limpeza de ponto de ônibus |
| `sac_placa_transito` | Manutenção de placas de trânsito |
| `sac_sugestao_elogio_olho_vivo` | Olho Vivo - Sugestão e elogio |
| `sac_alteracao_itinerario_ponto_inicial_final` | Ônibus - Alteração de itinerário ou ponto inicial/final |
| `sac_denuncia_alteracao_itinerario_ponto_inicial_final` | Ônibus - Denúncia de alteração de itinerário ou ponto inicial/final |
| `sac_denuncia_conduta_motorista_cobrador_fiscal_onibus` | Ônibus - Denúncia de conduta do motorista, cobrador ou fiscal |
| `sac_denuncia_direcao_inadequada_perigosa_onibus` | Ônibus - Denúncia de direção inadequada ou perigosa de veículo |
| `sac_denuncia_problema_embarque_desembarque_onibus` | Ônibus - Denúncia de problemas no embarque/desembarque |
| `sac_elogio_motorista_cobrador_fiscal_onibus` | Ônibus - Elogio ao motorista, cobrador ou fiscal |
| `sac_manutencao_veiculo_geral` | Ônibus - Manutenção do veículo em geral |
| `sac_reclamacao_demora_partida_onibus` | Ônibus - Reclamação de demora na partida |
| `sac_reclamacao_descumprimento_partida_ponto_inicial_final_oni` | Ônibus - Reclamação de descumprimento de partida no ponto inicial/final |
| `sac_reclamacao_intervalo_excessivo_onibus` | Ônibus - Reclamação de intervalo excessivo da linha |
| `sac_reclamacao_veiculo_superlotacao_onibus` | Ônibus - Reclamação de veículo com superlotação |
| `sac_painel_mensagem_variavel` | Painel de mensagens variáveis (PMV) |
| `sac_reativacao_abrigo_ponto_extinto` | Reativação de abrigo ou ponto que foi extinto |
| `sac_reclamacao_conduta_motorista_atende` | Reclamação sobre conduta do motorista ATENDE |
| `sac_reclamacao_descumprimento_horario_veiculo_adaptado` | Reclamação de descumprimento de horário de veículo adaptado |
| `sac_reclamacao_falta_comunicacao_onibus` | Reclamação de falta de comunicação no ônibus |
| `sac_reclamacao_falta_limpeza_terminal_onibus` | Reclamação de falta de limpeza de terminais de ônibus |
| `sac_reclamacao_fila_tumulto_terminal_onibus` | Reclamação de filas e tumulto em terminais |
| `sac_reclamacao_problema_olho_vivo` | Reclamação de problemas com Olho Vivo |
| `sac_reclamacao_sinalizacao_inadequada_terminal_onibus` | Reclamação de sinalização inadequada em terminais |
| `sac_reimplantacao_substituicao_ponto_onibus_antigo_novo` | Reimplantação ou substituição de ponto antigo por novo |
| `sac_remanejamento_ponto_onibus` | Remanejamento de ponto de ônibus |
| `sac_reparo_catraca_eletronica_validador_falha` | Reparo de catraca eletrônica/validador com falha |
| `sac_reparo_problema_mecanico_transito_transporte` | Reparo de problema mecânico |
| `sac_sinalizacao_horizontal_apagada_repintura` | Sinalização horizontal apagada - Solicitar repintura |
| `sac_sugestao_sptrans` | SPTrans - Sugestão |

---

## 6. Urgência (Print 8)

| typeName | Título |
|----------|--------|
| `sac_erosao_urgencia` | Erosão |
| `sac_explosao_urgencia` | Explosão |
| `sac_quadra_arvore_urgencia` | Queda de árvore |
| `sac_quadra_galho_urgencia` | Queda de galho |
| `sac_rompimento_galeria_agua_pluvial` | Rompimento de galeria de águas pluviais |

---

## Exemplo de URL completa

Para **"Remoção de entulho em via pública"** (Lixo e Limpeza):

```
https://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=geoportal:sac_remocao_entulho&outputFormat=application%2Fjson&srsName=EPSG:4326
```

---

## Uso no projeto

Estas camadas são **pontos de solicitações já registradas** (histórico SP156), não para abrir novos chamados. Podem ser usadas como **overlay no mapa** (exibir onde há solicitações na região) ou para análise de demanda.

Para adicionar ao overlay, inclua os `typeName` em `src/config/geosampa-overlay-layers.ts` ou crie um JSON de camadas SP156 separado.
