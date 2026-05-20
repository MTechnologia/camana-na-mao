# Câmara na Mão

Aplicativo de participação cidadã da Câmara Municipal de São Paulo.

## Como rodar localmente

### Docker (recomendado)

```sh
git clone <URL_DO_REPOSITORIO>
cd camana-na-mao
cp .env.example .env
# Edite .env com credenciais do Supabase
docker-compose up
```

A aplicação fica em http://localhost:8080.

Documentação: [docs/docker-infra/DOCKER_GUIA_RAPIDO.md](./docs/docker-infra/DOCKER_GUIA_RAPIDO.md)

> O frontend roda em Docker; o backend (API e Edge Functions) fica no Supabase Cloud. Veja [docs/INTEGRACAO_DOCKER_BACKEND.md](./docs/INTEGRACAO_DOCKER_BACKEND.md).

### Node.js (sem Docker)

Requisitos: Node.js e npm ([nvm](https://github.com/nvm-sh/nvm#installing-and-updating)).

```sh
git clone <URL_DO_REPOSITORIO>
cd camana-na-mao
npm i
cp .env.example .env
npm run dev
```

Dev server: http://localhost:5173

## Stack

**Frontend:** Vite, TypeScript, React, shadcn-ui, Tailwind CSS

**Backend:** Supabase (PostgreSQL + Edge Functions), Deno, API REST (`/api/v1/`)

**Testes:** Vitest, React Testing Library, Playwright (E2E)

Documentação da API: [docs/api-rest-mobile/](./docs/api-rest-mobile/)

## Testes

### Front-end (unitários)

```sh
npm test
npm run test:coverage
```

Relatório em `coverage/index.html`.

### Edge Functions

```sh
npm run test:edge
```

### E2E (Playwright)

```sh
npx playwright install
npx playwright test
npx playwright show-report
```

### Tudo (unitários + edge)

```sh
npm run test:all
```

## Deploy

### Render (Static Site)

- **Build:** `npm ci && npm run build`
- **Publish:** `dist`
- **SPA:** `render.yaml` (rewrite para `/index.html`)

Variáveis no Render: `CAMARA_URL`, `CAMARA_PUBLISHABLE_KEY`, `CAMARA_PROJECT_ID` (opcional). Modelo em `.env.example`.

### Docker (produção)

```sh
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```
