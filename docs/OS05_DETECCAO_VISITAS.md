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

## Próximos passos (Mobile)

O app mobile (Expo) permite geofencing e background location:

1. **Adicionar `expo-location`** ao `mobile/package.json`
2. **`startGeofencingAsync`** ou **`startLocationUpdatesAsync`** com task em background
3. Detectar entrada em geofence de 50m em torno dos `public_services`
4. Ao permanecer 10 min: criar `service_visit` via edge function
5. Ao sair do geofence: agendar push notification 30 min depois (respeitando horário 22h–8h)

### Edge function sugerida

```
detect-service-visit
  Input: user_id, latitude, longitude
  Lógica: Haversine para public_services; se dist < 50m por 10 min, insert service_visit
  Output: visit_id ou null
```

O mobile chamaria essa função periodicamente em background (ou ao detectar região).

## Regras de negócio (referência)

- RN-AVA-001: Permanência mínima de 10 minutos
- RN-AVA-002: Avaliação válida por 7 dias após visita (expires_at)
- RN-AVA-003: Máximo 1 avaliação por serviço por dia (não implementado ainda)
- Horário quieto para push: 22h–8h (evitar notificações à noite)
