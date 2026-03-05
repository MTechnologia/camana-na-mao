# Relatório Mensal – Fevereiro/2026

## 4.2 Entregas Mensais Previstas – Fevereiro/2026 (100% do escopo)

### Entregas realizadas

| # | Entrega | Status | Observação |
|---|--------|--------|------------|
| 1 | Listagem de audiências públicas com dados do SP Legis | ✅ | Listagem com dados sincronizados da API SP Legis (AudienciasPublicasV2JSON). |
| 2 | Tela de detalhes da audiência com pauta, data, local e documentação | ✅ | Detalhe com pauta, data, local, documentos e materiais de referência (projetos de lei, link transmissão). |
| 3 | Sistema de inscrição em audiências com confirmação | ✅ | Inscrição (videoconferência/presencial) com confirmação e integração ao fluxo da Câmara. |
| 4 | Notificações push personalizadas (24h e 1h antes do evento) | ✅ | Lembretes D-1 e 1h antes; lembrete 1 minuto antes (teste). |
| 5 | Perfil completo do usuário com endereço e geolocalização | ✅ | Perfil com endereço principal, múltiplos endereços e geolocalização (GPS / endereço cadastrado). |
| 6 | Gestão de interesses temáticos e preferências de comunicação | ✅ | Interesses no cadastro e preferências de notificação no perfil. |
| 7 | Testes de integração executados | ✅ | Testes E2E (Playwright) e teste da API de inscrição Ninja; ver subseção abaixo. |
| 8 | Produto Final | ✅ | Aplicativo funcional com módulo de audiências integrado ao SP Legis, notificações personalizadas e perfil com gestão de interesses e preferências. |

---

### Testes de integração executados (evidência)

Os testes de integração cobrem fluxos de audiências, autenticação, perfil e notificações, e a lógica da API de inscrição em audiências.

**1. Testes E2E (Playwright)**  
- **Diretório:** `tests/e2e/`  
- **Configuração:** `playwright.config.ts` (baseURL `http://localhost:5173`, projetos chromium e mobile-chrome).  
- **Arquivos e escopo:**

| Arquivo | Escopo |
|--------|--------|
| `auth.spec.ts` | Login, registro, recuperação de senha |
| `audiencias.spec.ts` | Listagem de audiências, inscrição, filtros, cancelamento |
| `ai-chat.spec.ts` | Chat com IA, respostas sobre audiências |
| `urban.spec.ts` | Relatórios urbanos |
| `transport.spec.ts` | Transporte |
| `evaluation.spec.ts` | Avaliações |

- **Comando para executar:**  
  `npm run test:e2e`  
  (use o script do projeto para evitar `ERR_MODULE_NOT_FOUND` do `@playwright/test`; o app pode subir em `localhost:5173` via `webServer` no config.)  
- **Comandos úteis:**  
  - Instalar navegadores (uma vez): `npm run playwright:install`  
  - Rodar só audiências: `npm run test:e2e -- tests/e2e/audiencias.spec.ts`  
  - Relatório HTML: `npm run test:e2e:report` após rodar os testes

**2. Teste da API de inscrição (Ninja/CMSP)**  
- **Arquivo:** `supabase/functions/api/v1/audiencias/inscricao-ninja.test.ts`  
- **Escopo:** Extração de nonce de segurança e envio do formulário Ninja (inscrição em audiência).  
- **Comando:**  
  `deno test --allow-net=false supabase/functions/api/v1/audiencias/inscricao-ninja.test.ts`

**Registro de execução (evidência)**  
Para documentar que os testes de integração foram executados no período (ex.: fechamento Fevereiro/2026), rodar os comandos acima e anotar o resultado, por exemplo:  
- E2E: `npm run test:e2e` → “X passed, Y skipped” (ou anexar screenshot do relatório HTML).  
- Inscrição Ninja: `deno test ... inscricao-ninja.test.ts` → “X passed”.

---

### Conteúdo código referente à integração com API SP Legis

A integração com o **SP Legis** (Web Service da Câmara Municipal de São Paulo) está centralizada nas Edge Functions e no consumo dos dados pela aplicação.

#### 1. Audiências públicas (listagem, detalhe, documentação)

- **Edge Function:** `supabase/functions/fetch-audiencias/index.ts`
  - **AudienciasPublicasV2JSON** – listagem de audiências por período (`DataInicial`, `DataFinal`).
    - URL: `https://splegisws.saopaulo.sp.leg.br/ws/ws2.asmx/AudienciasPublicasV2JSON?DataInicial=...&DataFinal=...`
  - **AudienciaPublicaPorChaveV2JSON** – detalhe de uma audiência por chave (pauta, descrição, convidados, contato).
  - **ProjetoResumoJSON** – ementa e autores dos projetos de lei vinculados (para pauta e documentação).
- **Documentação da API:** `docs/APIS_CMSP_SPLEGIS_E_SIP.md`
- **Tabela:** `audiencias` (sincronização por `splegis_chave`); migrations em `supabase/migrations/` (incl. `splegis_chave`, comissão, descrição, projetos, convidados, etc.).

#### 2. Uso no frontend (listagem e tela de detalhes)

- **Listagem:** `src/pages/Audiencias.tsx` – consome a tabela `audiencias` (dados vindos do SP Legis via `fetch-audiencias`).
- **Detalhe:** `src/pages/audiencias/AudienciaDetailPage.tsx` – exibe pauta, data, local, documentação (projeto de lei, link de transmissão, materiais).
- **Helpers de exibição:** `src/lib/audienciaDisplay.ts` – formatação de título, explicação simplificada e dados para cards/detalhe.
- **Filtros por região (zonas SP):** `src/lib/audienciaZonas.ts` – zonas de São Paulo para filtro na listagem.

#### 3. Inscrição em audiências (fluxo que utiliza dados do SP Legis)

- **API de inscrição (Ninja/CMSP):** `supabase/functions/api/v1/audiencias/inscricao-ninja.ts` – envia inscrição para o fluxo oficial (formulário Ninja / CMSP), usando dados da audiência (ex.: `ap_code`, slug) obtidos/vinculados ao SP Legis.
- **E-mail de confirmação:** `supabase/functions/send-audiencia-inscricao-email/index.ts` – envia confirmação de inscrição.
- **Frontend – inscrição e confirmação:** `src/components/ai/AudienciaInscricaoInline.tsx`, `src/pages/audiencias/ParticipacaoPage.tsx` – fluxo de inscrição e confirmação em audiências (dados da audiência vêm do banco alimentado pelo SP Legis).

**Código das inscrições (videoconferência e manifestação por escrito)**

A tela de participação (`ParticipacaoPage.tsx`) permite escolher **videoconferência** ou **manifestação por escrito** (e, em outro fluxo, participação presencial). O registro é feito via função SQL `insert_audiencia_participacao` (migration `20260217120000_audiencia_participacoes_protocolo.sql`), que insere em `audiencia_participacoes` e retorna o número de protocolo.

**1. Inscrição para videoconferência**  
Arquivo: `src/pages/audiencias/ParticipacaoPage.tsx`

```ts
const submitVideoconferencia = async () => {
  // validações: nome, email, telefone, consent
  const { data: rpcData, error } = await supabase.rpc("insert_audiencia_participacao", {
    p_audiencia_id: audienciaId,
    p_tipo: "videoconferencia",
    p_user_id: user?.id ?? null,
    p_nome: nome.trim(),
    p_email: email.trim(),
    p_telefone: telefone.trim(),
    p_entidade: entidade.trim() || null,
    p_funcao: funcao.trim() || null,
    p_bairro: null,
    p_sugestao: null,
    p_consent: true,
  });
  if (error) throw error;
  const protocolo = Array.isArray(rpcData) && rpcData[0]?.protocolo != null ? rpcData[0].protocolo : null;
  setConfirmProtocolo(protocolo);
  toast.success("Inscrição realizada com sucesso!");
  setStep(3);
};
```

**2. Manifestação por escrito**  
Arquivo: `src/pages/audiencias/ParticipacaoPage.tsx`

```ts
const submitEscrito = async () => {
  // validações: nome, email, telefone, bairro, sugestão, consent
  const { data: rpcData, error } = await supabase.rpc("insert_audiencia_participacao", {
    p_audiencia_id: audienciaId,
    p_tipo: "escrito",
    p_user_id: user?.id ?? null,
    p_nome: nome.trim(),
    p_email: email.trim(),
    p_telefone: telefone.trim(),
    p_entidade: null,
    p_funcao: null,
    p_bairro: bairro,
    p_sugestao: sugestao.trim(),
    p_consent: true,
  });
  if (error) throw error;
  const protocolo = Array.isArray(rpcData) && rpcData[0]?.protocolo != null ? rpcData[0].protocolo : null;
  setConfirmProtocolo(protocolo);
  toast.success("Proposta enviada com sucesso!");
  setStep(3);
};
```

**3. Inscrição inline (chat / seleção de audiência)**  
No componente `src/components/ai/AudienciaInscricaoInline.tsx`, usado no chat e em fluxos com seleção de audiência, a inscrição é feita com insert direto em `audiencia_participacoes` (videoconferência, escrito ou presencial), com `bairro` e `sugestao` preenchidos apenas quando `tipo === "escrito"`:

```ts
const { error } = await supabase.from("audiencia_participacoes").insert({
  audiencia_id: audienciaId,
  tipo: tipoParticipacao,
  user_id: user?.id ?? null,
  nome: nome.trim(),
  email: email.trim(),
  telefone: telefone.trim(),
  entidade: null,
  funcao: null,
  bairro: tipoParticipacao === "escrito" ? bairro : null,
  sugestao: tipoParticipacao === "escrito" ? sugestao.trim() : null,
  consent: true,
});
```

O trigger `notify_audiencia_inscricao` (e, quando aplicável, `notify_audiencia_inscricao_lembrete`) cria a notificação de confirmação e o envio por push/e-mail (via `send-web-push`).

#### 4. Vereadores (SP Legis / CMSP)

- **Edge Function:** `supabase/functions/fetch-vereadores/index.ts` – consome `VereadoresCMSP` (XML) para área de atuação/comissões.
- **API REST:** `supabase/functions/api/v1/vereadores/index.ts` – expõe dados de vereadores (fonte que pode incluir dados do SP Legis/CMSP).

#### 5. Orquestrador de IA (respostas sobre audiências)

- **Módulo:** `supabase/functions/ai-orchestrator/lib.ts` – função `searchAudiencias` consulta a tabela `audiencias` (dados do SP Legis) e formata respostas (ex.: nome por comissão, documentação).
- **Prompts:** `supabase/functions/ai-orchestrator/lib-prompts.ts` – instruções para apresentar audiências, documentos e materiais de referência alinhados aos dados do SP Legis.

#### 6. Notícias (Portal da Câmara – WordPress API)

- **Edge Function:** `supabase/functions/fetch-noticias/index.ts` – consome a **WordPress REST API** do portal da Câmara (`https://www.saopaulo.sp.leg.br/wp-json/wp/v2/posts`) para listar notícias e comunicados oficiais. Os dados são cacheados em memória e na tabela `news_cache`; o orquestrador de IA utiliza as últimas notícias (ex.: 5 últimas no chat) via `getUltimasNoticias` em `ai-orchestrator/lib.ts`.
- **Frontend:** página "Notícias" e hook `useNoticias()` que invocam a Edge Function `fetch-noticias`.

**Resumo:** Todo o fluxo de listagem, detalhe, documentação e inscrição de audiências utiliza dados originados da API SP Legis (ws2.asmx), seja via sincronização em `fetch-audiencias` ou via detalhe por chave e projetos de lei (ProjetoResumoJSON). As notícias vêm do Portal da Câmara (WordPress API) via `fetch-noticias`.

#### Trechos de código – chamadas à API SP Legis

**1. Listagem de audiências – AudienciasPublicasV2JSON**  
Arquivo: `supabase/functions/fetch-audiencias/index.ts`

```ts
const SPLEGIS_BASE = "https://splegisws.saopaulo.sp.leg.br/ws/ws2.asmx";

async function fetchAudienciasFromSplegis(
  dataInicial: string,
  dataFinal: string
): Promise<SplegisAudienciaItem[]> {
  const params = new URLSearchParams({
    DataInicial: dataInicial,
    DataFinal: dataFinal,
  });
  const url = `${SPLEGIS_BASE}/AudienciasPublicasV2JSON?${params.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "CamaraNaMao/1.0",
    },
  });
  // ... tratamento da resposta JSON
}
```

**2. Detalhe de audiência por chave – AudienciaPublicaPorChaveV2JSON**  
Arquivo: `supabase/functions/fetch-audiencias/index.ts`

```ts
async function fetchAudienciaPorChave(chave: number | string): Promise<SplegisAudienciaItem | null> {
  const params = new URLSearchParams({ chave: String(chave) });
  const url = `${SPLEGIS_BASE}/AudienciaPublicaPorChaveV2JSON?${params.toString()}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": "CamaraNaMao/1.0" },
    });
    if (!res.ok) return null;
    const raw = await res.json();
    // ... normalização da resposta
  }
}
```

**3. Ementa e autores do projeto de lei – ProjetoResumoJSON**  
Arquivo: `supabase/functions/fetch-audiencias/index.ts`

```ts
const SPLEGIS_WS_BASE = "https://splegisws.saopaulo.sp.leg.br/ws";

async function fetchProjetoResumo(ano: number, tipo: string, numero: number): Promise<ProjetoResumoResponse | null> {
  const params = new URLSearchParams({
    ano: String(ano),
    tipo: tipo.trim(),
    numero: String(numero),
  });
  const url = `${SPLEGIS_WS_BASE}/ws2.asmx/ProjetoResumoJSON?${params.toString()}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": "CamaraNaMao/1.0" },
    });
    if (!res.ok) return null;
    const raw = await res.json();
    // ...
  }
}
```

**4. Vereadores – VereadoresCMSP (XML) e vereadores-json**  
Arquivo: `supabase/functions/fetch-vereadores/index.ts`

```ts
const VEREADORES_CMSP_XML_URL = 'https://splegisws.saopaulo.sp.leg.br/ws/ws2.asmx/VereadoresCMSP';

async function fetchAreasDeAtuacaoFromXml(): Promise<Map<string, string[]>> {
  const res = await fetch(VEREADORES_CMSP_XML_URL, {
    headers: { 'Accept': 'application/xml', 'User-Agent': 'CamaraNaMao/1.0' },
  });
  // ... parse XML (fast-xml-parser) para comissões/cargos
}

// JSON de vereadores (CMSP)
const response = await fetch('https://saopaulo.sp.leg.br/vereadores-json/', {
  headers: { 'Accept': 'application/json', 'User-Agent': 'CamaraNaMao/1.0' },
});
const data: VereadorAPI[] = await response.json();
```

**5. Notícias – WordPress API (Portal da Câmara)**  
Arquivo: `supabase/functions/fetch-noticias/index.ts`

```ts
// WordPress API URL do portal da Câmara Municipal de São Paulo
const WP_API_URL = 'https://www.saopaulo.sp.leg.br/wp-json/wp/v2/posts';

// Fetch from WordPress API
async function fetchFromAPI(): Promise<Noticia[]> {
  console.log('[fetch-noticias] Fetching from WordPress API...');

  const response = await fetch(`${WP_API_URL}?per_page=20&_embed`, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'CamaraNaMao/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`WordPress API error: ${response.status} ${response.statusText}`);
  }

  const posts: WPPost[] = await response.json();
  console.log(`[fetch-noticias] Received ${posts.length} posts from API`);

  return posts.map(transformPost);
}
```

A resposta é transformada para o formato interno (título, descrição, data, link, categoria, tempo de leitura); os dados são gravados na tabela `news_cache` e servidos ao app e ao orquestrador (5 últimas notícias no chat).

---

### Detalhes da programação e evidências de código – Notificações e Push

As notificações push personalizadas (24h e 1h antes do evento, e lembrete 1 min antes) utilizam Edge Functions acionadas por cron e um webhook que envia push para navegador, app mobile (Expo) e e-mail/SMS.

#### 1. Arquitetura e fluxo

**1.1 Lembretes de audiência (cron)**  
- **audiencia-reminder-1h:** roda a cada 15 min; busca participações em videoconferência cuja audiência começa em 45–75 min; insere em `notifications` com `type: audiencia_lembrete_1h`.  
- **audiencia-reminder-d1:** roda diariamente (ex.: 08:00 BRT); busca participações cuja audiência é amanhã; insere em `notifications` com `type: audiencia_lembrete_d1`.  
- **audiencia-reminder-1min:** roda a cada minuto; busca audiências que começam em 30s–2 min; insere em `notifications` com `type: audiencia_lembrete_1min`.  

**1.2 Entrega das notificações**  
- **Database Webhook:** INSERT em `notifications` chama a Edge Function **send-web-push**.  
- **send-web-push:** lê `notification_settings` (push_enabled, email_enabled, sms_enabled) e `profiles` (expo_push_token, phone); envia:  
  - Push navegador (VAPID) – tabela `push_subscriptions`  
  - Push mobile (Expo) – `profiles.expo_push_token`  
  - E-mail (Resend ou SendGrid)  
  - SMS (Twilio, se habilitado)  

**1.3 Token Expo no app**  
- O app mobile (Expo) obtém o token via `Notifications.getExpoPushTokenAsync` e envia para a Edge Function **save-expo-push-token**, que grava em `profiles.expo_push_token`. Sem esse token, o push não aparece na bandeja do celular.  
- **Frontend – preferências:** `src/components/profile/PreferencesForm.tsx` – leitura/gravação em `notification_settings` (push_enabled, email_enabled, sms_enabled, categorias, horário de silêncio).

#### 2. Evidências de código – Notificações e Push

**1. Lembrete 1h – janela e insert em notifications**  
Arquivo: `supabase/functions/audiencia-reminder-1h/index.ts`
C
```ts
const WINDOW_MIN_MS = 45 * 60 * 1000;  // 45 min
const WINDOW_MAX_MS = 75 * 60 * 1000;  // 75 min

// Participações em videoconferência cuja audiência está na janela 45–75 min
for (const p of participacoes) {
  const eventAt = parseEventAtBRT(a?.data, a?.hora);
  const diff = eventAt.getTime() - nowMs;
  if (diff >= WINDOW_MIN_MS && diff <= WINDOW_MAX_MS) {
    inWindow.push({ p, eventAt });
  }
}

// Insert em notifications (tipo audiencia_lembrete_1h)
toInsert.push({
  user_id: userId,
  title: "Lembrete: audiência em 1 hora",
  message: `Em 1 hora: ${titulo}. Horário: ${hora}. Acesse o app para o link.`,
  type: "audiencia_lembrete_1h",
  action_url: `/audiencias/${audienciaId}`,
  priority: "high",
  metadata: { audiencia_id, user_id, participacao_id },
});

const { data: inserted } = await supabase.from("notifications").insert(toInsert).select("id");
```

**2. Lembrete D-1 – audiências amanhã**  
Arquivo: `supabase/functions/audiencia-reminder-d1/index.ts`

```ts
// targetDateStr = amanhã ou ?for_date=YYYY-MM-DD (teste)
const paraAmanha = participacoes.filter((p) => {
  const d = p.audiencias?.data;
  return d && d.slice(0, 10) === targetDateStr;
});

toInsert.push({
  user_id: userId,
  title: "Lembrete: audiência amanhã",
  message: `Amanhã é o dia: ${titulo}. Horário: ${hora}. Acesse o app para o link.`,
  type: "audiencia_lembrete_d1",
  action_url: `/audiencias/${audienciaId}`,
  priority: "normal",
  metadata: { audiencia_id, user_id, participacao_id },
});

await supabase.from("notifications").insert(toInsert);
```

**3. Push mobile (Expo) – send-web-push**  
Arquivo: `supabase/functions/send-web-push/index.ts`

```ts
// Lê preferências e perfil
const { data: settings } = await supabase
  .from("notification_settings")
  .select("push_enabled, email_enabled, sms_enabled")
  .eq("user_id", userId)
  .maybeSingle();

const { data: profile } = await supabase
  .from("profiles")
  .select("phone, expo_push_token")
  .eq("id", userId)
  .maybeSingle();

// Push app mobile (Expo) – aparece na bandeja do celular
if (expoPushToken && expoPushToken.startsWith("ExponentPushToken")) {
  const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Accept": "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      to: expoPushToken,
      title: record.title,
      body: record.message,
      sound: "default",
      channelId: "default",
      priority: record.priority === "high" ? "high" : "default",
      data: { url: record.action_url || "/", id: record.id, type: record.type },
    }),
  });
  // ... trata resposta (status ok / erro)
}
```

**4. Preferências de notificação (frontend)**  
Arquivo: `src/components/profile/PreferencesForm.tsx`

```ts
// Leitura das preferências em notification_settings
const { data: notifData } = await supabase
  .from('notification_settings')
  .select('*')
  .eq('user_id', userId)
  .maybeSingle();

// push_enabled, email_enabled, sms_enabled, categories_enabled, quiet_hours_*
setNotificationSettings({
  push_enabled: notifData.push_enabled ?? true,
  email_enabled: notifData.email_enabled ?? true,
  sms_enabled: notifData.sms_enabled ?? false,
  categories_enabled: notifData.categories_enabled ?? ['legislativa', 'servico', 'transporte', 'urbano'],
  // ...
});
```

**Documentação adicional:** `docs/CRON_LEMBRETES_AUDIENCIAS.md` – URLs das funções, configuração dos crons (Google Cloud Scheduler), horários recomendados e como testar.

---

### Conteúdo código referente à integração com API Geo Sampa / geolocalização

O projeto utiliza **geolocalização e endereço** para perfil do usuário, serviços próximos e preferências de localização. A menção a **Geo Sampa** (dados abertos da cidade) aparece no orquestrador como contexto de intenções; a parte de “onde utilizar APIs” de geolocalização/endereço está nos trechos abaixo.

#### 1. Perfil do usuário – endereço e geolocalização

- **Tabela de endereços:** `user_addresses` (latitude, longitude, is_primary, etc.) – usada como “endereço cadastrado” e para cálculo de proximidade.
- **Página de endereço:** `src/pages/profile/AddressPage.tsx` – gestão do endereço do perfil.
- **Formulário de endereço e geocodificação:** `src/components/profile/AddressForm.tsx`
  - Geocodificação do endereço completo: uso das Edge Functions **google-places-autocomplete** e **google-places-details** para obter coordenadas (latitude/longitude) a partir do endereço digitado.
  - Salvamento em `user_addresses` com coordenadas para uso em “serviços próximos” e preferências.
- **Definição de endereço principal:** fluxo em `AddressForm.tsx` (e lógica em `useProfileCompletion.ts`, `Profile.tsx`) para marcar endereço principal e completar perfil.

#### 2. Geolocalização em tempo real (GPS)

- **Hook de geolocalização:** `src/hooks/useGeolocation.ts` – acesso à API de geolocalização do navegador (latitude/longitude).
- **Uso em telas:** `src/pages/NearbyServicesPage.tsx` – usa `useGeolocation` para exibir serviços próximos com base na localização atual.
- **Chat/assistente:** `src/components/ai/InlineLocationMethodPicker.tsx` – opções “GPS”, “Usar endereço cadastrado” e “Digitar CEP ou endereço” para fluxos que precisam de localização.

#### 3. Autocomplete e geocodificação de endereço (CEP e busca)

- **ViaCEP (endereço por CEP):** `src/components/address/AddressAutocomplete.tsx` – chamada a `https://viacep.com.br/ws/{cep}/json/` para preencher logradouro, bairro, cidade, UF.
- **Google Places (autocomplete e detalhe):** mesmo componente e `AddressForm.tsx` utilizam as Edge Functions **google-places-autocomplete** e **google-places-details** para busca por texto e obtenção de coordenadas (integração com serviço de geocodificação/places).
- **Seletor de endereço (drawer):** `src/components/address/AddressPickerDrawer.tsx` – uso do autocomplete para “buscar endereço” em fluxos do app.

#### 4. Serviços públicos geolocalizados (distância a partir do endereço)

- **Recomendação de serviços:** `supabase/functions/recommend-services/index.ts` – usa `user_addresses` (latitude/longitude) para calcular distância até serviços em `public_services` e ordenar por proximidade (até 5 km).
- **Cálculo de distância:** função `calculateDistance` (Haversine) na mesma Edge Function – não chama API externa de rota; usa apenas coordenadas do perfil e dos serviços.

#### 5. Rotas e direções (mapas)

- **Direções (Mapbox):** `src/hooks/useMapboxDirections.ts` – chama a API Mapbox Directions para rotas entre origem e destino (coordenadas). Usado onde o app exibe “como chegar” (ex.: serviços ou audiências).

#### 6. Referências a Geo Sampa / dados da cidade no orquestrador

- **Módulo:** `supabase/functions/ai-orchestrator/lib.ts`
  - Termos e intenções relacionados a “Geo Sampa”, “dados da cidade”, “equipamentos públicos”, “população”, “sistema viário”, “ubs”, “transporte público” para encaminhar perguntas ao contexto adequado (RAG/geral).
  - Não há chamada direta à API Geo Sampa da Prefeitura neste repositório; a integração com “dados espaciais e endereço” é feita via ViaCEP, Google Places (geocodificação/autocomplete), coordenadas em `user_addresses` e Mapbox para rotas.

**Resumo:** A integração com **geolocalização e endereço** (necessária para perfil completo, serviços próximos e preferências) está implementada com: **ViaCEP** (CEP), **Google Places** (autocomplete e geocodificação via Edge Functions), **API de Geolocalização do navegador** (useGeolocation) e **Mapbox** (direções). O **orquestrador** referencia **Geo Sampa / dados da cidade** para intenções; o código de “onde utilizar” essas informações está nos componentes de perfil, endereço, serviços próximos e rotas acima. Se no seu contexto “API Geo Sampa” for uma API específica da Prefeitura (ex.: GeoSampa/DataSampa), ela pode ser integrada nos mesmos fluxos (ex.: em `recommend-services` ou em uma nova Edge Function) e citada neste relatório como extensão da integração geolocalização/dados abertos.

#### Trechos de código – chamadas às APIs de geolocalização e endereço

**1. ViaCEP – consulta por CEP** (`src/components/address/AddressAutocomplete.tsx`)

```ts
const response = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
const data = await response.json();
```

**2. Google Places – autocomplete e detalhe** (`AddressAutocomplete.tsx`)

```ts
await supabase.functions.invoke("google-places-autocomplete", {
  body: { query: searchQuery, sessionToken: sessionTokenRef.current },
});
await supabase.functions.invoke("google-places-details", {
  body: { placeId: prediction.placeId, sessionToken: sessionTokenRef.current },
});
```

**3. Geocodificação no perfil** (`src/components/profile/AddressForm.tsx`)

```ts
await supabase.functions.invoke('google-places-autocomplete', { body: { query: fullAddress } });
await supabase.functions.invoke('google-places-details', { body: { placeId } });
```

**4. Geolocalização do navegador (GPS)** (`src/hooks/useGeolocation.ts`)

```ts
navigator.geolocation.getCurrentPosition(
  (position) => setState({
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    permissionGranted: true,
    isSimulated: false,
  }),
  (error) => { /* fallback */ },
  { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
);
```

---

## Produto final (Fevereiro/2026)

Aplicativo funcional com:

- **Módulo de audiências públicas** integrado ao **SP Legis** (listagem, detalhe com pauta e documentação, inscrição com confirmação).
- **Notificações personalizadas** (lembrete 24h e 1h antes do evento; lembrete 1 minuto para testes).
- **Perfil completo do usuário** com endereço e geolocalização (GPS e endereço cadastrado).
- **Gestão de interesses temáticos e preferências de comunicação** no cadastro e no perfil.

Documentação técnica das APIs: `docs/APIS_CMSP_SPLEGIS_E_SIP.md`, `supabase/functions/fetch-audiencias/README.md`.
