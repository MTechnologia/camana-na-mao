# Relatório — Card UI/E2E

## Escopo atendido

Este relatório consolida o card de trabalho UI/E2E em três blocos:

- Inventário do que já existe em Playwright
- Implementação/cobertura dos fluxos críticos
- Redução de flakiness e dependências externas

## 1) Inventário (UI/E2E)

### Configuração Playwright

- Arquivo: `playwright.config.ts`
- Diretório de testes: `tests/e2e`
- Projetos: `chromium` e `mobile-chrome`
- Web server automático: `npm run dev` em `http://localhost:5173`
- Retries: `2` no CI e `0` local
- Workers: `1` no CI e `2` local

### Comandos de execução

- `npm run test:e2e`
- `npm run test:e2e:ui`
- `npm run test:e2e:report`
- `npm run playwright:install`

### Suíte existente em `tests/e2e`

- `auth.spec.ts` (registro, login, login inválido, logout)
- `evaluation.spec.ts` (avaliar serviço, encaminhar, serviços próximos)
- `ai-chat.spec.ts`
- `audiencias.spec.ts`
- `urban.spec.ts`
- `transport.spec.ts`

## 2) Fluxos críticos (status)

### Login

- Coberto em `auth.spec.ts`:
  - login com credenciais válidas
  - login inválido
  - logout

### Perto de Você

- Coberto em `evaluation.spec.ts` no teste `deve buscar serviços próximos`.
- Fluxo validado por carregamento da tela e interação por tipo de serviço (UBS).

### Avaliações

- Coberto em `evaluation.spec.ts`:
  - avaliar serviço pendente
  - encaminhar avaliação para vereador

## 3) Redução de instabilidade (flakiness)

### Ajustes aplicados

1. **Timeouts globais mais previsíveis** no `playwright.config.ts`:
   - `timeout: 60_000`
   - `expect.timeout: 15_000`
   - `actionTimeout: 15_000`
   - `navigationTimeout: 30_000`

2. **Mitigação de dependência externa (Google Maps) em E2E**:
   - no `webServer.env`, `VITE_GOOGLE_MAPS_API_KEY` foi definido como vazio para execução de teste.
   - efeito: fluxo "Perto de Você" não depende de chamadas externas no teste automatizado.

3. **Remoção de esperas fixas frágeis** em `tests/e2e/evaluation.spec.ts`:
   - substituição de vários `waitForTimeout(...)` por esperas baseadas em estado da UI:
     - `expect(textarea).toBeEnabled({ timeout: 30000 })`
     - `waitFor` de elementos visíveis antes de interação

### Lacunas identificadas

- Ainda existem `waitForTimeout` em outras suítes (`urban.spec.ts`, `transport.spec.ts`, `ai-chat.spec.ts`), que podem gerar intermitência.
- Parte dos cenários de chat depende de respostas de IA e dados de ambiente; ideal adicionar mocks específicos por endpoint para cenários determinísticos.

## Próximas recomendações

- Priorizar remoção de `waitForTimeout` restantes por sinais explícitos de UI/rede.
- Criar fixtures Playwright para mocks de APIs de geocoding/rota quando necessário.
- Separar testes "determinísticos" (pipeline de CI) de testes "integração real" (execução agendada).

