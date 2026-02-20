# OS 05 - Detecção de Visitantes a Serviços

Objetivo: assim como o Google pede avaliação após visitar um restaurante, o sistema deve detectar quando o cidadão visita um serviço público (ex: UBS) e, em seguida, solicitá-lo a avaliar o local.

## Fluxo desejado

1. Usuário visita fisicamente um serviço público (ex: UBS)
2. Sistema detecta a permanência (geofencing 50m, mínimo 10 min)
3. Após sair ou ao abrir o app: notificação "Você visitou [UBS X]. Gostaria de avaliar?"
4. Usuário confirma e é levado à tela de avaliação (`/avaliar/:visitId`)

## Implementação atual (Web)

### O que está pronto

- **Hook `useVisitDetection`** (`src/hooks/useVisitDetection.ts`)
  - Geofence: raio de 50m
  - Permanência mínima: 10 minutos
  - Verificação a cada 1 minuto
  - Cria `service_visit` automaticamente ao detectar
  - Desativa em modo simulado (localização Centro SP)

- **Integração em "Perto de Você"** (`src/pages/NearbyServicesPage.tsx`)
  - Quando o usuário está logado e usa GPS real
  - Permanece na página com serviços próximos carregados
  - Após 10 min dentro do geofence: toast "Você visitou [nome]. Gostaria de avaliar?" com botão Avaliar
  - Clique em Avaliar → navega para `/avaliar/:visitId`

### Limitações (Web)

- Funciona **somente enquanto o usuário mantém a página "Perto de Você" aberta**
- Não há background/geofencing quando o app está em segundo plano
- Não há push notification 30 min após saída (requer mobile)

## Implementação Mobile (background)

Implementado em background com `expo-location` e `expo-task-manager`:

1. **Migration** `20260218140000_visit_detection_state.sql`: tabela `visit_detection_state` (user_id, service_id, first_seen_at)
2. **Edge function** `detect-service-visit`: recebe `POST` com `Authorization: Bearer <jwt>` e `{ latitude, longitude }`; Haversine em public_services; geofence 50m, permanência 10 min → cria `service_visit` e INSERT em `notifications`
3. **Mobile** `src/tasks/visitDetectionTask.ts`: background task registrada com TaskManager; a cada atualização de localização chama a edge function
4. **Bridge de auth**: `BackgroundAuthBridge` no web app envia `CAMARA_AUTH_STATE` ao native; o native armazena user_id e access_token em AsyncStorage para o background task
5. **FrontendWebView**: trata `CAMARA_AUTH_STATE`, solicita permissões de localização (foreground e background), inicia `startLocationUpdatesAsync`

### Configuração Mobile

- **app.json**: plugin `expo-location` com `isIosBackgroundLocationEnabled` e `isAndroidBackgroundLocationEnabled`
- **Env**: definir `EXPO_PUBLIC_SUPABASE_URL` ou `EXPO_PUBLIC_CAMARA_URL` no `.env` do mobile (ou app.config.js) apontando para o projeto Supabase (ex.: `https://xxx.supabase.co`)

### Deploy da edge function

```bash
supabase functions deploy detect-service-visit
```

### Por que `detect-service-visit` não gera logs?

A background task pode não chegar a chamar a API em vários casos:

| Causa | Como verificar |
|-------|----------------|
| **EXPO_PUBLIC_SUPABASE_URL ausente** | Criar `mobile/.env` com `EXPO_PUBLIC_SUPABASE_URL=https://vjzkzsczlbtmrzewffdx.supabase.co` e refazer o build |
| **Auth não armazenada** | Estar logado e deixar o app aberto na WebView; o `BackgroundAuthBridge` precisa enviar os dados ao native |
| **Permissão de background negada** | Conferir nas configurações do app se a localização em segundo plano está permitida |
| **Task não recebe localização** | Em Fake GPS, garantir que o app receba a localização simulada; em emulador a task em background costuma não rodar |
| **Permanência de 10 min** | Ficar ao menos 10 minutos em um ponto a até 50 m de um registro em `public_services` |

### Sobre os logs do `save-expo-push-token`

O `save-expo-push-token` não depende de GPS. Ele é chamado quando o app está aberto e o web tenta registrar o token Expo (pelo `useExpoPushToken` em `NotificationsContext`). A coincidência com o Fake GPS provavelmente é porque, ao habilitá-lo, você estava usando o app (WebView carregada, usuário logado), o que dispara o fluxo de push normalmente. O **401** indica falha de autenticação; vale conferir se o JWT está sendo enviado corretamente no `Authorization`.

## Avaliação conversacional (implementado)

O fluxo de avaliação (`/avaliar/:visitId`) usa o **ConversationalEvaluation**, integrado ao ai-orchestrator:

- Diálogo natural com o assistente (IA)
- Quando há `evaluationContext` (visit_id, service_id, service_name): o assistente só pede nota e comentário
- Modo livre (`/avaliar` sem visitId): o assistente coleta tipo e nome do serviço
- Ferramenta `create_service_rating` aceita `visit_id` opcional para usar visita existente

---

## Regras de negócio (referência)

- RN-AVA-001: Permanência mínima de 10 minutos
- RN-AVA-002: Avaliação válida por 7 dias após visita (expires_at)
- RN-AVA-003: Máximo 1 avaliação por serviço por dia (não implementado ainda)
- Horário quieto para push: 22h–8h (evitar notificações à noite)
