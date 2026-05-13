# Testes E2E — Playwright

HU-13.1 — Cobertura de integração das jornadas críticas do admin.

## Specs

| Arquivo | Cobre |
|---|---|
| `admin-dashboard.spec.ts` | KPIs, realtime indicator, sidebar (HU-1.5) |
| `analytics-drills.spec.ts` | Volume + Territorial + MultiDrill + Cruzamentos (HU-1, HU-3) |
| `triagem.spec.ts` | Kanban, edição de triagem, timeline (HU-10) |
| `exportacao.spec.ts` | Export CSV/XLSX no analytics e audit-logs (HU-7, HU-12) |
| `rbac.spec.ts` | Bloqueio de rotas admin-only, visibilidade da sidebar (HU-11) |

## Setup inicial

### 1. Credenciais E2E

Crie `.env.e2e.local` na raiz do projeto (NÃO commite — já está no .gitignore):

```env
E2E_ADMIN_EMAIL=admin.e2e@camaranamao.test
E2E_ADMIN_PASSWORD=senha-admin-e2e
E2E_GESTOR_EMAIL=gestor.e2e@camaranamao.test
E2E_GESTOR_PASSWORD=senha-gestor-e2e
E2E_ASSESSOR_EMAIL=assessor.e2e@camaranamao.test
E2E_ASSESSOR_PASSWORD=senha-assessor-e2e
E2E_CIDADAO_EMAIL=cidadao.e2e@camaranamao.test
E2E_CIDADAO_PASSWORD=senha-cidadao-e2e
```

### 2. Criar contas no Supabase de teste

No Supabase Dashboard → Authentication → Users → Add user (4 contas), depois:

```sql
-- Atribui role a cada conta (substituir os UUIDs pelos retornados acima)
INSERT INTO public.user_roles (user_id, role) VALUES
  ('<admin-uuid>',    'admin'),
  ('<gestor-uuid>',   'gestor'),
  ('<assessor-uuid>', 'assessor'),
  ('<cidadao-uuid>',  'cidadao')
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
```

### 3. Instalar browsers do Playwright (1x)

```bash
npx playwright install chromium
```

## Como rodar

```bash
# Todos os testes (Vite dev server sobe automaticamente)
npm run test:e2e

# Um spec específico
npx playwright test tests/e2e/triagem.spec.ts

# UI interativo (debug)
npm run test:e2e:ui

# Ver último relatório HTML
npm run test:e2e:report
```

## Convenções

- **Não usar credenciais hardcoded** nos specs — sempre via helper `login()`.
- **Não modificar dados** que outros testes possam ler em paralelo. Quando precisar criar relato/triagem temporária, prefixe com `e2e-<timestamp>` e limpe no `afterAll`.
- **`test.skip(true, motivo)`** em cenários que dependem de dados específicos (ex: relato existente). Não falhar — pular.
- **`expect.toBeVisible({ timeout })`** explícito quando o elemento depende de carga de rede. Default do projeto é 15s.
- **Selecionar por role/label** sempre que possível (`getByRole`, `getByLabel`). Evitar XPath ou seletores frágeis.

## Modo CI

O `playwright.config.ts` usa `process.env.CI` para diferenciar:

- `retries: 2` no CI (vs 0 local)
- `workers: 1` no CI (evita race na auth/redirect)
- `forbidOnly: true` no CI

Para rodar como se fosse CI localmente: `CI=true npm run test:e2e`.

## Troubleshooting

**"Credenciais ausentes"** → verifica `.env.e2e.local` na raiz.

**Timeout em login** → app não está rodando ou Supabase está com problema. Confere `npm run dev` separadamente.

**Test escapa de RBAC e fica logado em outro spec** → o helper `clearAuth(page)` deve ser chamado em `afterEach` quando você muda de role. Cada test começa com cookies limpos por default no Playwright, mas se você usa `test.describe.serial`, force a limpeza.
