# Câmara na Mão

Aplicativo de participação cidadã da Câmara Municipal de São Paulo.

---

# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/b66b554b-a744-42b3-8868-c153c2d41290

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/b66b554b-a744-42b3-8868-c153c2d41290) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use Docker (Recomendado)**

A forma mais fácil e consistente de rodar o projeto localmente é usando Docker:

```sh
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory
cd <YOUR_PROJECT_NAME>

# Step 3: Configure environment variables
cp .env.example .env
# Edite .env e adicione suas credenciais do Supabase

# Step 4: Start with Docker Compose
docker-compose up

# A aplicação estará disponível em http://localhost:8080
```

📚 **Documentação Docker**: Veja [docs/docker-infra/DOCKER_GUIA_RAPIDO.md](./docs/docker-infra/DOCKER_GUIA_RAPIDO.md) para mais detalhes.

> **Nota sobre Backend**: O frontend roda em Docker, mas o backend (API REST) roda no Supabase Cloud. Veja [docs/INTEGRACAO_DOCKER_BACKEND.md](./docs/INTEGRACAO_DOCKER_BACKEND.md) para entender a integração completa.

**Use your preferred IDE (Sem Docker)**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Configure environment variables
cp .env.example .env
# Edite .env e adicione suas credenciais do Supabase

# Step 5: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

**Frontend:**
- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

**Backend:**
- Supabase (PostgreSQL + Edge Functions)
- Deno (Edge Functions runtime)
- API REST versionada (`/api/v1/`)

**Testes:**
- Vitest (Unitários)
- React Testing Library
- Playwright (E2E)

📚 **Documentação Backend**: Veja [docs/api-rest-mobile/](./docs/api-rest-mobile/) para mais informações sobre a API REST.

## Testes

O projeto possui uma infraestrutura de testes dividida entre Front-end (React/Hooks) e Backend (Edge Functions).

### Testes de Front-end (Unitários)

Utiliza **Vitest** e **React Testing Library** para validar a lógica de negócio dos hooks e componentes.

- **Hooks Testados:** `useVisitDetection`, `useReportPatterns`, `useTransportReport`, `usePendingRatings`.
- **Comandos:**
  ```sh
  # Executar testes de front-end
  npm test
  
  # Executar com relatório de cobertura (coverage)
  npm run test:coverage
  ```
  O relatório detalhado fica em `/coverage/index.html`.

### Testes de Backend (Edge Functions)

Utiliza o runtime **Deno** para validar as regras de negócio diretamente nas funções do Supabase.

- **Módulos Testados:**
  - `create_service_rating`: Validação de estrelas (RN-AVA-002) e campos obrigatórios (RN-AVA-003).
  - `create_transport_report`: Persistência de campos e limites geográficos.
  - `suggest-council-members`: Cálculo de score de afinidade e mapeamento de comissões.
- **Comandos:**
  ```sh
  # Executar apenas os testes de Edge Functions
  npm run test:edge
  ```

### Testes E2E (End-to-End)

Utiliza **Playwright** para simular o comportamento do usuário real navegando no aplicativo (Login, Registro, Chat, etc.).

- **Localização:** Pasta `tests/e2e/`.
- **Módulos Cobertos:** `auth`, `ai-chat`, `audiencias`, `evaluation`, `transport`, `urban`.
- **Relatórios:** Os relatórios de execução ficam em `playwright-report/` e os resultados temporários em `test-results/` (ambos ignorados pelo Git).
- **Comandos:**
  ```sh
  # Instalar navegadores do Playwright (necessário na primeira vez)
  npx playwright install

  # Executar testes E2E (Requer servidor rodando)
  npx playwright test

  # Abrir o relatório interativo após a execução
  npx playwright show-report
  ```

### Execução Completa

Para garantir a integridade de todo o sistema (Front + Back) em um único comando:
```sh
npm run test:all
```
*(Nota: Este comando foca nos testes unitários e de integração de lógica, não incluindo os testes E2E por padrão devido à necessidade de ambiente rodando).*

## Deploy (Render)

Este repo pode ser publicado no Render como **Static Site** (Vite build).

- **Build command**: `npm ci && npm run build`
- **Publish directory**: `dist`
- **SPA routing**: rewrite de `/*` para `/index.html` (já configurado em `render.yaml`)

### Variáveis de ambiente (Render)

No Render, configure as variáveis (Environment):
- `CAMARA_URL`
- `CAMARA_PUBLISHABLE_KEY`
- `CAMARA_PROJECT_ID` (opcional)

Veja `env.example`.

## How can I deploy this project?

**Using Docker (Production)**

```sh
# Build and run production container
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

**Using Lovable**

Simply open [Lovable](https://lovable.dev/projects/b66b554b-a744-42b3-8868-c153c2d41290) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
