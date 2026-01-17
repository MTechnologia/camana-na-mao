# ADR-0003: Mobile com Expo/React Native + WebView (PoV)

- **Status**: Aceito
- **Data**: 2026-01-13

## Contexto

Precisávamos validar rapidamente o uso em Android (instalação e teste), mantendo evolução paralela do frontend web e do backend.

## Decisão

- Criar app em `mobile/` usando **Expo + React Native + TypeScript**
- Implementar **WebView** para carregar o frontend web por URL pública (Render) como **PoV**
- Manter uma aba de diagnóstico de API para testar conectividade e endpoints (Supabase/Health)

## Alternativas consideradas

- React Native “nativo” desde o início (reimplementar UI toda)
- Flutter
- PWA instalada

## Consequências

### Positivas

- Time-to-test rápido (Expo Go / APK via EAS)
- Permite validação com usuários sem depender de mesma rede local (URL pública)
- Reduz retrabalho enquanto UI web ainda muda bastante

### Negativas / Trade-offs

- WebView depende de conectividade e de um host público
- UX/performance podem ser inferiores a nativo em telas complexas
- Recursos nativos avançados exigem migração gradual para RN “de verdade”

### Próximos passos

- Definir quais fluxos precisam migrar para nativo (auth, navegação, formulários críticos)
- Padronizar configs do mobile por ambiente (`EXPO_PUBLIC_WEB_URL`, etc.)

