## Aliases de importação

### Objetivo

Padronizar imports e evitar caminhos relativos longos, facilitando manutenção e refatorações.

## Web (Vite/React)

- Alias: `@/*` → `src/*`
- Configurado em:
  - `vite.config.ts` (runtime/bundler)
  - `tsconfig.json` e `tsconfig.app.json` (TypeScript)

## Mobile (Expo/React Native)

- Alias: `@/*` → `mobile/src/*`
- Configurado em:
  - `mobile/tsconfig.json` (TypeScript)
  - `mobile/babel.config.js` + `babel-plugin-module-resolver` (runtime)

## Exemplo

Em vez de:
- `../../src/utils/fetchWithTimeout`

Use:
- `@/utils/fetchWithTimeout`

