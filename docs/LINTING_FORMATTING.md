## ESLint e Prettier

### Objetivo

- **ESLint**: capturar problemas de qualidade/código e padrões perigosos
- **Prettier**: padronizar formatação automaticamente (sem “bikeshedding”)
- Evitar conflito ESLint vs Prettier usando `eslint-config-prettier`

### ESLint

- Configuração: `eslint.config.js` (flat config, ESLint v9)
- TypeScript: `typescript-eslint`
- React: `eslint-plugin-react-hooks` e `eslint-plugin-react-refresh`
- Execução:
  - `npm run lint`
  - `npm run lint:fix`

### Prettier

- Configuração: `prettier.config.cjs`
- Ignore: `prettierignore`
- Execução:
  - `npm run format`
  - `npm run format:check`

### Observação (adoção)

O repositório possui arquivos legados que podem não estar formatados.
Recomendação:
- Rodar `npm run format` como uma ação dedicada (PR/commit separado) quando o time decidir,
  para evitar um diff gigante misturado com outras mudanças.

