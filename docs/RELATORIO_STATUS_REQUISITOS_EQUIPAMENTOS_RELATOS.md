# Relatório de Status – Equipamentos Públicos, Mapa e Relatos Urbanos

**Data:** 23/02/2026  
**Escopo:** Mapa interativo, equipamentos categorizados, filtros, detalhes, busca, navegação, favoritos, sugestão de correção, relatos urbanos via chatbot, classificação por IA, localização, fotos, relatos similares, encaminhamento, testes.

---

## 1. Mapa interativo com visualização geolocalizada de equipamentos públicos categorizados por tipo

| Item | Status | Detalhes |
|------|--------|----------|
| **Implementado** | ✅ **~95%** | Página "Perto de Você" (`NearbyServicesPage`), mapa com `MapView` / `MapboxMap` / `GoogleMapView` / `SimulatedMap`, dados de `public_services` via `useNearbyServices` com filtro por tipo e raio. Geolocalização via `useGeolocation`. |
| **Falta** | | Garantir que todos os equipamentos exibidos no mapa vêm do Supabase (e não só mock); em modo simulado já usa dados reais quando há backend. |

---

## 2. Marcadores diferenciados para unidades de saúde, educacionais, administrativas, culturais, esportivas, transporte e feiras

| Item | Status | Detalhes |
|------|--------|----------|
| **Implementado** | ✅ **~80%** | Ícones por `service_type`: UBS/hospital 🏥, escola 🏫, CEU 🎭, biblioteca 📚, centro esportivo ⚽, outro 📍 (`MapboxMap`, `GoogleMapView`, `SimulatedMap`, `ServiceCard`). Tipos no filtro: UBS, Escolas, CEUs, Hospitais, Bibliotecas, Esportes. |
| **Falta** | | Marcadores específicos para **administrativas**, **transporte** (ex.: ponto de ônibus) e **feiras**; hoje “transporte” e “feiras” entram em `other` ou tipos específicos se existirem no banco. Incluir esses tipos em `ServiceTypeFilter` e no mapa, se os dados do GeoSampa tiverem essas categorias. |

---

## 3. Filtros por tipo de serviço, distância máxima (500 m, 1 km, 2 km, 5 km), horário de funcionamento e avaliação média

| Item | Status | Detalhes |
|------|--------|----------|
| **Tipo de serviço** | ✅ | `ServiceTypeFilter`: Todos, UBS, Escolas, CEUs, Hospitais, Bibliotecas, Esportes. |
| **Distância máxima** | ⚠️ **~90%** | `RadiusSelector`: **1 km, 2 km, 5 km, 10 km**. **Falta opção de 500 m** (slider atual começa em 1 km). |
| **Horário de funcionamento** | ❌ | Não existe filtro “abertos agora” ou por faixa de horário. Campo `opening_hours` existe em `public_services` e é exibido na tela de detalhes quando preenchido. |
| **Avaliação média** | ✅ | `RatingFilter` + `MinRatingFilter` (ex.: mínimo de estrelas); ordenação por avaliação em `ServiceSortSelect`. |

**Resumo:** Tipo e avaliação OK; distância falta 500 m; filtro por horário de funcionamento não implementado.

---

## 4. Tela de detalhes do equipamento com endereço, horários, serviços disponíveis, indicadores de ocupação e histórico de avaliações

| Item | Status | Detalhes |
|------|--------|----------|
| **Endereço** | ✅ | `ServiceDetailPage`: `getAddressDisplay(address, district)` + cidade/estado. |
| **Horários** | ⚠️ | Exibição condicional de `opening_hours`; quando existe, texto fixo "Seg-Sex: 7h às 19h" (não reflete o JSON real). Ajustar para exibir o conteúdo real de `opening_hours`. |
| **Serviços disponíveis** | ❌ | Não há lista de “serviços oferecidos” no equipamento (ex.: vacinação, consultas). Depende de modelo de dados (novo campo ou tabela). |
| **Indicadores de ocupação** | ❌ | Não implementado. |
| **Histórico de avaliações** | ❌ | Só média e total de avaliações (`average_rating`, `total_ratings`). Não há lista de avaliações recentes do equipamento na tela de detalhes. (O histórico do *usuário* existe em `/avaliacoes/historico`.) |

---

## 5. Busca por nome de equipamento ou endereço como alternativa à navegação por mapa

| Item | Status | Detalhes |
|------|--------|----------|
| **Implementado** | ⚠️ **~60%** | Página `Search`: `searchAll()` busca em listas mockadas (`servicosProximos`), linhas de transporte, relatos, recomendações, além de notícias e audiências no Supabase. Equipamentos da lista mockada são encontrados por nome/descrição/categoria. |
| **Falta** | | **Busca em `public_services` (Supabase)** para equipamentos reais por nome e endereço, para refletir o que aparece no mapa "Perto de Você". |

---

## 6. Integração com aplicativo de navegação nativo para traçar rotas até o equipamento selecionado

| Item | Status | Detalhes |
|------|--------|----------|
| **Implementado** | ✅ **100%** | `DirectionsDrawer`: rotas a pé, carro e bike (Mapbox). Botões para abrir **Google Maps** e **Waze** com destino (`buildGoogleMapsUrl`, `buildWazeUrl` em `mapUtils`). "Como chegar" no mapa. |

---

## 7. Sugestão de correção de informações pelos munícipes (horário incorreto, serviço indisponível, localização incorreta)

| Item | Status | Detalhes |
|------|--------|----------|
| **Backend** | ✅ | Tabela `service_corrections` (CSU007): `user_id`, `service_id`, `field_name`, `current_value`, `suggested_value`, `status`. |
| **Frontend** | ❌ | **Não há tela ou fluxo** para o cidadão sugerir correção (horário, serviço indisponível, localização) a partir da tela do equipamento ou do perfil. |

**Resumo:** ~30% (só modelo de dados); falta UI e integração.

---

## 8. Funcionalidade de salvar equipamentos em favoritos para acesso rápido

| Item | Status | Detalhes |
|------|--------|----------|
| **Implementado** | ✅ **100%** | Tabela `service_subscriptions`; em `ServiceDetailPage`: botão "Acompanhar atualizações" / "Deixar de acompanhar", com `checkSubscription` e toggle. Não há nomenclatura "Favoritos", mas a funcionalidade de salvar/acompanhar existe. |
| **Opcional** | | Lista dedicada "Meus equipamentos salvos" (ex.: no menu ou perfil) para acesso rápido; hoje o acesso é só pela tela do equipamento. |

---

## 9. Fluxo de relatos urbanos via chatbot com coleta conversacional em linguagem natural (evolução do chatbot da OS 03)

| Item | Status | Detalhes |
|------|--------|----------|
| **Implementado** | ✅ **~95%** | Fluxo unificado em `useUnifiedAIChat`; orquestrador `ai-orchestrator` com journey `urban_report`; coleta conversacional (descrição, endereço, severidade, etc.); ferramenta `create_urban_report`; testes e2e em `urban.spec.ts` (relato via chat). |

---

## 10. Classificação automática por IA da categoria do problema (iluminação, pavimentação, limpeza, áreas verdes, sinalização, calçadas, drenagem)

| Item | Status | Detalhes |
|------|--------|----------|
| **Implementado** | ✅ **~95%** | Ferramenta `classify_report_category` no ai-orchestrator; categorias alinhadas a iluminação, via_publica/pavimentação, lixo/limpeza, area_verde, calcada, esgoto/drenagem, etc.; padrões por palavras-chave e fallback. Confirmação com o usuário quando a IA sugere categoria. |

---

## 11. Definição automática de severidade com possibilidade de ajuste pela IA

| Item | Status | Detalhes |
|------|--------|----------|
| **Implementado** | ✅ **~90%** | Heurística no orquestrador (ex.: termos de urgência → `critica`/`alta`/`media`/`baixa`); campo `severity` no relato; fluxo conversacional pode pedir confirmação ou ajuste. |

---

## 12. Captura de localização por GPS ou entrada manual de endereço com exibição em mapa para confirmação

| Item | Status | Detalhes |
|------|--------|----------|
| **Implementado** | ✅ **~90%** | No fluxo de relato: uso de geolocalização e entrada manual de endereço; componente `InlineAddressConfirm` com opção "Não, corrigir"; endereço e confirmação no fluxo do chat. Exibição em mapa para confirmação presente em telas de relato manual (`ManualReportPage`). |

---

## 13. Suporte a anexo de fotos no relato urbano

| Item | Status | Detalhes |
|------|--------|----------|
| **Formulário manual** | ✅ | `ManualReportPage`: upload de foto (câmera/galeria), preview, envio em `urban_reports.photos`. Admin vê fotos em `UnifiedReportDrawer`. |
| **Via chatbot** | ❌ | `ChatInput` não oferece anexo de imagem; relato urbano via chat **não coleta foto**. |

**Resumo:** ~50% (só no fluxo manual); falta anexo de foto no chat.

---

## 14. Detecção de relatos similares na mesma região com opção de apoiar relato existente ou criar novo

| Item | Status | Detalhes |
|------|--------|----------|
| **Implementado** | ❌ **~10%** | Documentação e configuração N8N mencionam `similar_reports_count`; padrões de relatos similares em backend/admin. **Não há fluxo no app** para: (1) detectar relatos similares na região antes/depois de criar o relato, (2) mostrar "Já existe um relato parecido – deseja apoiar ou criar novo?". |

---

## 15. Encaminhamento automático à Comissão temática apropriada da Câmara

| Item | Status | Detalhes |
|------|--------|----------|
| **Implementado** | ⚠️ **~70%** | Sugestão de vereadores por tema/comissão: `suggest_council_member`, `COMMISSION_THEMES` no ai-orchestrator; encaminhamento a vereador (`council_member_referrals`). O relato em si não é "encaminhado" automaticamente como documento à Comissão (órgão); o que existe é a **sugestão de vereador** da comissão temática adequada. |
| **Falta** | | Se o requisito for "encaminhar o relato à Comissão temática" (registro formal ao órgão), isso não está implementado; se for "sugerir vereador da comissão", está. |

---

## 16. Testes de integração executados

| Item | Status | Detalhes |
|------|--------|----------|
| **Implementado** | ✅ **~85%** | Testes E2E Playwright: `auth.spec.ts`, `urban.spec.ts` (relato via chat, autoclassificação), `transport.spec.ts`, `evaluation.spec.ts` (avaliar serviço, encaminhar para vereador), `audiencias.spec.ts`, `ai-chat.spec.ts`. |
| **Falta** | | Testes de integração específicos para: mapa (serviços próximos, filtros, detalhes), busca de equipamentos, favoritos, fluxo completo de relato com foto (manual). Opcional: testes de API/edge para create_urban_report e classify_report_category. |

---

## Resumo executivo

| Tópico | % aprox. | O que está feito | O que falta |
|--------|----------|------------------|-------------|
| 1. Mapa interativo geolocalizado | 95% | Página Perto de Você, mapa, tipos, Supabase | Alinhar 100% com dados reais |
| 2. Marcadores por tipo | 80% | Saúde, educação, CEU, biblioteca, esporte, other | Administrativas, transporte, feiras |
| 3. Filtros | ~75% | Tipo, distância (1–10 km), avaliação | 500 m, filtro por horário |
| 4. Tela de detalhes | ~55% | Endereço, horário (parcial), avaliação média, favoritos | Horário real, serviços oferecidos, ocupação, histórico de avaliações |
| 5. Busca nome/endereço | 60% | Busca em mock + notícias + audiências | Busca em public_services |
| 6. Navegação (Google/Waze) | 100% | DirectionsDrawer, links | — |
| 7. Sugestão de correção | 30% | Tabela service_corrections | UI e fluxo para o cidadão |
| 8. Favoritos | 100% | service_subscriptions, acompanhar na tela de detalhes | Lista "Meus salvos" (opcional) |
| 9. Relatos via chatbot | 95% | Fluxo conversacional, create_urban_report | — |
| 10. Classificação IA categoria | 95% | classify_report_category, categorias | — |
| 11. Severidade automática | 90% | Heurística + ajuste no fluxo | — |
| 12. Localização GPS/manual + mapa | 90% | Geolocalização, endereço manual, confirmação | Revisar mapa na confirmação |
| 13. Anexo de fotos | 50% | Manual com foto | Foto no chat |
| 14. Relatos similares / apoiar | 10% | Ideia em docs/N8N | Fluxo: detectar similares, apoiar ou criar novo |
| 15. Encaminhamento Comissão | 70% | Sugestão de vereador por comissão | Encaminhamento formal ao órgão (se for requisito) |
| 16. Testes de integração | 85% | E2E auth, urban, transport, evaluation, audiencias, ai-chat | E2E mapa/busca/favoritos; integração API |

---

*Relatório gerado com base na análise do repositório Câmara na Mão (frontend, Supabase, ai-orchestrator, migrations e testes).*
