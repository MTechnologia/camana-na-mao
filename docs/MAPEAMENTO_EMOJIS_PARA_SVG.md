# Mapeamento: emojis → ícones SVG (task 2.2)

Objetivo: **substituir emojis por ícones SVG customizados** para melhor visual e contraste.

## Concluído (implementado)

- **`src/components/icons/`** – Camada de ícones com Lucide: `ServiceTypeIcon`, `IconCheck`, `FILTER_CATEGORY_ICONS`, `NOTIFICATION_TYPE_ICONS`, `INTEREST_ICONS`, `SERVICE_TYPE_ICONS`, `getServiceTypeMarkerChar`.
- **Tipo de serviço:** ServiceCard, MapboxMap, GoogleMapView, SimulatedMap passaram a usar ícones SVG (ou caractere ● em mapas).
- **Busca:** Filtros de categoria usam `FILTER_CATEGORY_ICONS`; rating na lista usa `<Star />`.
- **Notificações:** Notifications e AdminNotifications usam `NOTIFICATION_TYPE_ICONS`.
- **Interesses:** Onboarding, InterestsForm, InterestsStep usam `INTEREST_ICONS`.
- **Estados vazios:** ReportHistoryPage e NearbyServicesPage usam `<Search />` e `<MapPin />` em vez de 🔍/📍.
- **AudienciaFilters:** Labels Tema, Região, Status, Período, Ano usam ClipboardList, MapPin, BarChart3, Calendar, CalendarDays.
- **Confirmação:** InlineAddressConfirm usa `IconCheck` em vez de ✓ (demais Inline* podem seguir o mesmo padrão).

---

## Como testar os novos ícones

Com o app rodando (`npm run dev`), acesse as rotas abaixo e confira se os ícones SVG aparecem (sem emojis).

| O que testar | Rota / onde ir | O que ver |
|--------------|-----------------|-----------|
| **Interesses (onboarding)** | `/onboarding` | Grid com ícones (documento, ônibus, marco, etc.) em cada card de interesse. |
| **Interesses (perfil)** | `/perfil/interesses` | Mesmos ícones no formulário de interesses. |
| **Interesses (registro)** | `/register` (e avançar até o passo de interesses) | Ícones no passo "Seus interesses". |
| **Busca – filtros** | `/busca` → digite algo (ex.: "vereador") | Pills de filtro (Todos, Perto de Mim, Transporte, etc.) com ícone à esquerda do texto. |
| **Busca – estrela** | `/busca` → resultado com avaliação | Ao lado da nota, ícone de estrela (não emoji ⭐). |
| **Serviços próximos – cards** | `/servicos-proximos` (com localização ou CEP) | Cada card de serviço com ícone por tipo (UBS, escola, etc.) à esquerda. |
| **Serviços próximos – vazio** | `/servicos-proximos` sem localização | Estado vazio com ícone de pin de mapa (não 📍). |
| **Serviços próximos – lista vazia** | `/servicos-proximos` com filtro que não retorna nada | Mensagem "Nenhum serviço encontrado" com ícone de pin. |
| **Mapa** | `/servicos-proximos` → aba Mapa | Marcadores como ● (não emojis). |
| **Histórico de relatos – vazio** | `/relato-urbano/historico` sem relatos | Estado vazio com ícone de lupa (não 🔍). |
| **Notificações** | `/notificacoes` | Badges de tipo (Relato Recebido, Em análise, etc.) com ícone SVG. |
| **Admin – notificações** | `/admin/notifications` (como admin) | Select "Tipo" com ícones ao lado de cada opção. |
| **Audiências – filtros** | `/audiencias` → abrir filtros (sheet) | Labels "Tema", "Região", "Status", "Período", "Ano" com ícones. |
| **Chat – confirmação de endereço** | `/conversas` → fluxo que pede endereço e confirma | Texto "Endereço confirmado" com ícone de check (não ✓). |

**Dica:** Use as ferramentas de desenvolvedor (F12) e inspecione os ícones: devem ser elementos `<svg>` (Lucide), não texto/emoji.

---

## 1. Dados centralizados (prioridade alta – um lugar vira SVG para vários usos)

### `src/data/searchData.ts`
- **Ícones por tipo de resultado:** 🏥 🏫 📚 ⚽ 🎭 🚌 🚇 🕳️ 💡 🗑️ 🌳 💧 🎨 ⭐ 🎯 🔔
- **Categorias de busca:** 🔍 Todos, 📍 Perto de Mim, 🚌 Transporte, 📝 Relatos, ⭐ Recomendações, 📰 Notícias, 👤 Vereadores, 🎙️ Audiências

### `src/constants/notificationTypes.ts`
- **Ícones por tipo de notificação:** 📜 🏥 🚌 🏙️ 👤 🚨 🔄 ⚙️ ✅ 🔍 🎉 ❌ 📨 🎤 📅 ⏰ ⚠️ 📢

### Tipo de serviço (mapas / cards) – **replicado em 4 arquivos**
Mesmo mapeamento `serviceType → emoji` em:
- `src/components/map/MapboxMap.tsx`
- `src/components/map/GoogleMapView.tsx`
- `src/components/map/SimulatedMap.tsx`
- `src/components/evaluation/ServiceCard.tsx`

Emojis: 🏥 🏫 🎭 📚 ⚽ 🛒 🏘️ 🍼 🌳 🤝 🚔 🚌 🏪 🎬 🏛️ 🪦 ♿ ♻️ 🚒 📍

**Sugestão:** Criar `src/constants/serviceTypeIcons.ts` (ou objeto em `mapUtils`) com chave → componente SVG; os 4 arquivos importam de um único lugar.

---

## 2. Interesses do usuário (onboarding / perfil / registro)

Mesmo conjunto em 3 arquivos:
- `src/components/register/InterestsStep.tsx`
- `src/components/profile/InterestsForm.tsx`
- `src/pages/Onboarding.tsx`

Ícones por interesse: 📜 Legislativo, 🚌 Mobilidade, 🎭 Cultura, 🏥 Saúde, 📚 Educação, 🌳 Meio Ambiente, 🏠 Habitação, 💼 Economia.

**Sugestão:** Um componente ou mapa `InterestIcon` em `src/components/icons/` ou constante compartilhada.

---

## 3. Rotas / direções

### `src/lib/mapUtils.ts`
- Chegada: 📍 | Partida: 🚶
- Direções: ↱ ↰ ↗ ↖ ↩ ↻ (símbolos Unicode, não emoji – podem ficar ou virar SVG)

---

## 4. UI – labels e estados (texto + emoji)

| Arquivo | Uso |
|--------|-----|
| `AudienciaFilters.tsx` | 📋 Tema, 📍 Região, 📊 Status, 📅 Período, 📆 Ano |
| `ManualReportPage.tsx` | 🔴 Gravando..., 📍 {location}, "Localização Capturada ✓" |
| `ReportHistoryPage.tsx` | 🔍 estado vazio (text-4xl) |
| `NearbyServicesPage.tsx` | 📍 estado vazio (2x, text-4xl) |
| `Audiencias.tsx` | 📍 {item.local} |
| `Search.tsx` | ⭐ {rating} |
| `PrivacyPolicyPage.tsx` | 📧 📞 📍 contato |
| `PublicDocumentationPage.tsx` | 📍 🗣️ ❓ na tabela de intenções; ✅ 🔄 📋 nas fases |
| `EscolaParlamento.tsx` | ✅ em lista de benefícios (6x) |
| `CamaraExplica.tsx` | 💡 Ficou com dúvidas? |
| `OfflineMode.tsx` | 💡 Dica |
| `automacaoIntegration.tsx` | 🟡 TESTE, 🟢 PRODUÇÃO, 💡 dica |
| `AIInsightsCard.tsx` | 💡 Ação sugerida |
| `DrillInsightPanel.tsx` | 🔍 📁 📅 📊 📋 😊 😞 😐 por contexto |

---

## 5. Confirmações / “selecionado” (✓)

Texto “X selecionado ✓” ou “X confirmado ✓” em:
- `ChatMessageBubble.tsx` – Endereço selecionado ✓, Decisão registrada ✓
- `InlineAddressConfirm.tsx` – Endereço confirmado ✓
- `InlineServiceTypePicker.tsx` – Tipo selecionado ✓
- `InlineRatingPicker.tsx` – Nota selecionada ✓
- `InlineServicePicker.tsx` – Serviço selecionado ✓
- `InlineLocationMethodPicker.tsx` – Localização definida ✓
- `InlineTimePicker.tsx` – Horário selecionado ✓
- `InlineLinePicker.tsx` – Linha selecionada ✓
- `InlineDatePicker.tsx` – Data selecionada ✓
- `InterestsForm.tsx` – "✓ Mínimo atingido"
- `DebugOverlay.tsx` – "✓ ativo"

**Sugestão:** Componente `<CheckIcon />` ou `<SuccessIcon />` e trocar " ✓" por `<CheckIcon className="..." />`.

---

## 6. Analytics / sentiment

### `src/hooks/useSentimentAnalytics.ts`
Mapeamento categoria → emoji: 🏥 🚌 🎓 🛡️ 🌳 🏗️ 🧹 💡 🛣️ 🚰 🌲 📋

### `src/components/analytics/DrillInsightPanel.tsx`
Retorno por tipo: 🔍 😊 😞 😐 📁 📅 📊 📋

---

## Resumo por tipo de trabalho

| Área | Arquivos | Ação sugerida |
|------|----------|----------------|
| **Tipo de serviço (mapas/cards)** | 4 arquivos | 1 constante/componente SVG compartilhado |
| **Busca (searchData)** | 1 | Mapear `icon` → componente SVG |
| **Notificações** | 1 (notificationTypes) | Mapear `icon` → componente SVG |
| **Interesses** | 3 | 1 conjunto de ícones (InterestIcon ou constante) |
| **Filtros e labels** | AudienciaFilters, várias páginas | SVG inline ou componente por ícone |
| **Estados vazios** | ReportHistory, NearbyServices | 1 ícone “busca” e 1 “localização” |
| **Confirmações (✓)** | ~10 componentes | 1 `<CheckIcon />` reutilizável |
| **Contato / institucional** | Privacy, Docs, Escola, etc. | Email, telefone, endereço, dica (💡), sucesso (✅) |

---

## Ordem sugerida para a task 2.2

1. Criar pasta `src/components/icons/` (ou usar `assets/icons`) com SVGs nomeados (ex.: `IconSearch.tsx`, `IconLocation.tsx`, `IconCheck.tsx`, `IconStar.tsx`, etc.).
2. Centralizar ícones de **tipo de serviço** em um único mapa; refatorar MapboxMap, GoogleMapView, SimulatedMap e ServiceCard para usá-lo.
3. Substituir em **searchData** e **notificationTypes** (emoji → `<IconX />` ou referência por nome).
4. Substituir **interesses** (Onboarding, InterestsForm, InterestsStep).
5. Substituir labels em **AudienciaFilters** e estados vazios (🔍/📍).
6. Trocar **✓** por `<CheckIcon />` nos Inline* e mensagens de confirmação.
7. Demais ocorrências pontuais (Privacy, Docs, automacao, DrillInsight, etc.).

Isso evita duplicar SVGs e mantém contraste e acessibilidade consistentes.
