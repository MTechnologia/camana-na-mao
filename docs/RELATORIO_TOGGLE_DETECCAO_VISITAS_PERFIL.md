# Relatório técnico — Toggle de detecção de visitas no perfil (OS-06 / #2518786)

## Objetivo

Dar ao cidadão controle explícito sobre o monitoramento geolocalizado para **detecção automática de visitas** a equipamentos públicos, com preferência persistida e respeitada na **web** e no **mobile** (via Edge Function em background).

## Laudo de implementação

### 1. Banco de dados

**Arquivo:** `supabase/migrations/20260402193000_user_preferences_visit_detection_enabled.sql`

- Coluna `user_preferences.visit_detection_enabled` **BOOLEAN NOT NULL DEFAULT true**.
- Comentário na coluna documentando o efeito (sem criar visitas / monitoramento quando `false`).

Novas linhas criadas pelo trigger `initialize_user_preferences` passam a receber o default automaticamente.

### 2. Tipos TypeScript

**Arquivo:** `src/integrations/supabase/types.ts`

- `visit_detection_enabled` incluída em `Row`, `Insert` e `Update` de `user_preferences`.

### 3. Interface — `PreferencesForm`

**Arquivo:** `src/components/profile/PreferencesForm.tsx`

- Toggle com rótulo **"Detectar visitas a equipamentos públicos"** e texto explicativo (privacidade / localização).
- Card **Privacidade**, após telefone.
- Carga: `select` inclui `visit_detection_enabled`.
- Gravação: `upsert` envia `visit_detection_enabled` junto às demais preferências.

### 4. Web — detecção

**Arquivos:**

- `src/lib/visitDetectionPreference.ts` — `visitDetectionAllowedFromPreference()` (só bloqueia quando valor é **explicitamente `false`**).
- `src/hooks/useVisitDetectionEnabled.ts` — busca inicial + assinatura **Realtime** em `user_preferences` para o `user_id` logado (atualização ao salvar preferências sem precisar recarregar a página).
- `src/hooks/useVisitDetection.ts` — prop opcional `visitDetectionEnabled` (default `true`):
  - Com `false`: retorno antecipado em `checkProximity` (sem `recordDeparturesIfOutside`, sem dwell, sem inserts/notificações); **limpeza do mapa de dwell** ao desligar; **intervalo de checagem não é agendado**.
- `src/pages/NearbyServicesPage.tsx` — usa `useVisitDetectionEnabled` e repassa ao hook.

### 5. Mobile / background — Edge Function

**Arquivo:** `supabase/functions/detect-service-visit/index.ts`

- Após autenticar e criar o client com service role, lê `visit_detection_enabled` em `user_preferences`.
- Se **`false`**, responde imediatamente com `ok: true`, `visit_detection_disabled: true`, `visit_id: null`, `visit_ids_created: []` — **sem** atualizar `departed_at`, **sem** `visit_detection_state`, **sem** novas visitas.

Linha inexistente ou coluna “ausente” em bases antigas: tratamento como habilitado (`!== false`), alinhado ao default do banco após migration.

### 6. Exportação LGPD (opcional)

**Arquivo:** `supabase/functions/export-user-data/index.ts`

- Inclusão de `visit_detection_enabled` no objeto `preferences` exportado.

### 7. Testes automatizados

**Arquivo:** `src/lib/visitDetectionPreference.test.ts`

- Bloqueio com `false`.
- Permissão com `true`, `null` e `undefined` (retomada / padrão).

**Evidência:**

```bash
npx vitest run src/lib/visitDetectionPreference.test.ts
```

## Critérios de aceite

| Critério | Atendimento |
|----------|-------------|
| Toggle no `PreferencesForm` com rótulo e texto explicativo | Card Privacidade, `Switch` + copy conforme escopo. |
| OFF → interrompe monitoramento e não cria visitas (web + mobile) | Web: hook não agenda intervalo nem processa proximidade. Mobile: Edge retorna cedo sem efeitos colaterais de visita. |
| ON → detecção normal | Default `true`; ao religar e salvar, Realtime + próximo ciclo reativam. |
| Privacidade mandatória | Preferência persistida; leitura na Edge com service role; web só grava próprio `user_id` (RLS existente). |

## Regra de negócio

**Controle de privacidade:** a escolha de não ser monitorado para visitas é respeitada no cliente web e na função server-side usada pelo app nativo em background.
