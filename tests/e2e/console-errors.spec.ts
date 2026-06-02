import { test, expect, type Page } from "@playwright/test";
import { e2eLogin } from "./helpers";

/**
 * A3.1 — Varredura de erros de console em TODAS as rotas estáticas do app.
 *
 * Para cada rota: navega, deixa estabilizar e coleta `console.error` +
 * `pageerror` (exceptions não capturadas). Ruído benigno conhecido é filtrado
 * (favicon, ResizeObserver loop, libs de terceiros, avisos do Vite/devtools).
 *
 * Rotas dinâmicas (`:id`, `:userId`, `:visitId`, `:panelId`) são omitidas —
 * precisam de IDs válidos e são cobertas por specs de fluxo dedicados.
 *
 * Use `--project=chromium` para uma passada (evita duplicar em mobile).
 */

const IGNORE_PATTERNS: RegExp[] = [
  /favicon/i,
  /ResizeObserver loop/i,
  /Download the React DevTools/i,
  /\[vite\]/i,
  /react-refresh/i,
  /Manifest:/i,
  // Recursos de terceiros (mapas, fontes, analytics) — fora do nosso controle.
  /maps\.googleapis\.com|maps\.gstatic\.com|fonts\.g(oogleapis|static)\.com/i,
  /google\.com\/maps/i,
  // Service worker / PWA em dev.
  /ServiceWorker|workbox|sw\.js/i,
];

function isBenign(text: string): boolean {
  return IGNORE_PATTERNS.some((re) => re.test(text));
}

/**
 * Erros de CONECTIVIDADE com o backend (Supabase DB/Auth/Edge Functions).
 * São artefatos de AMBIENTE — acontecem quando a suíte roda sem alcançar o
 * backend (local sandbox / CI sem secrets). NÃO são bugs de código: o app
 * apenas loga a falha de rede já tratada. Reportados à parte, não falham o teste.
 */
const NETWORK_PATTERNS: RegExp[] = [
  /Failed to fetch/i,
  /FunctionsFetchError/i,
  /Failed to send a request to the Edge Function/i,
  /NetworkError when attempting to fetch/i,
  /net::ERR_/i,
  /Load failed/i,
  /ERR_CONNECTION|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED/i,
];

function isNetwork(text: string): boolean {
  return NETWORK_PATTERNS.some((re) => re.test(text));
}

type RouteErrors = Record<string, string[]>;
interface SweepResult {
  /** Erros reais de código (uncaught, undefined, React, etc.) → falham o teste. */
  app: RouteErrors;
  /** Erros de rede/backend (ambiente) → informativos, não falham o teste. */
  network: RouteErrors;
}

async function sweep(page: Page, routes: string[]): Promise<SweepResult> {
  const app: RouteErrors = {};
  const network: RouteErrors = {};

  for (const route of routes) {
    const errors: string[] = [];
    const onConsole = (msg: { type: () => string; text: () => string }) => {
      if (msg.type() === "error") errors.push(msg.text());
    };
    const onPageError = (err: Error) => {
      errors.push(`pageerror: ${err.message}`);
    };
    page.on("console", onConsole);
    page.on("pageerror", onPageError);

    try {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30000 });
      // Estabiliza: deixa effects/fetch iniciais rodarem e dispararem erros.
      await page.waitForTimeout(2500);
    } catch (e) {
      errors.push(`navigation: ${(e as Error).message}`);
    } finally {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
    }

    const relevant = [...new Set(errors.filter((e) => !isBenign(e)))];
    const appErrs = relevant.filter((e) => !isNetwork(e));
    const netErrs = relevant.filter((e) => isNetwork(e));
    if (appErrs.length > 0) app[route] = appErrs;
    if (netErrs.length > 0) network[route] = netErrs;
  }

  return { app, network };
}

function report(results: RouteErrors): string {
  const routes = Object.keys(results);
  if (routes.length === 0) return "nenhum erro de console de código";
  return routes.map((r) => `\n● ${r}\n  - ${results[r].join("\n  - ")}`).join("");
}

/** Loga (sem falhar) o resumo de erros de rede/backend (ambiente). */
function logNetwork(label: string, network: RouteErrors): void {
  const routes = Object.keys(network);
  if (routes.length === 0) return;
  const total = routes.reduce((n, r) => n + network[r].length, 0);
  console.log(
    `[A3.1] ${label}: ${total} erro(s) de rede/backend em ${routes.length} rota(s) ` +
      `(ambiente sem backend — não são bugs de código): ${routes.join(", ")}`,
  );
}

const PUBLIC_ROUTES = [
  "/welcome",
  "/login",
  "/register",
  "/confirmar-email",
  "/reset-password",
  "/nova-senha",
  "/completar-convite",
  "/privacidade",
];

const CITIZEN_ROUTES = [
  "/",
  "/onboarding",
  "/perfil",
  "/perfil/visitas",
  "/perfil/dados-pessoais",
  "/perfil/interesses",
  "/perfil/dados-demograficos",
  "/perfil/endereco",
  "/perfil/preferencias",
  "/perfil/inscricoes",
  "/perfil/consentimentos",
  "/perfil/exportar-dados",
  "/perfil/direitos",
  "/configuracoes/acessibilidade",
  "/notificacoes",
  "/busca",
  "/relatos",
  "/conversas",
  "/audiencias",
  "/audiencias/minhas-inscricoes",
  "/institucional/agenda",
  "/institucional/vereadores",
  "/institucional/conheca-camara",
  "/institucional/comissoes",
  "/institucional/camara-explica",
  "/institucional/escola-parlamento",
  "/institucional/noticias",
  "/servicos-proximos",
  "/servicos/favoritos",
  "/avaliar",
  "/avaliacoes/historico",
  "/transporte/novo",
  "/transporte/padroes",
  "/transporte/historico",
  "/transporte/meus-relatos",
  "/paineis",
  "/paineis/avancado",
  "/paineis/criar",
  "/paineis/piores-servicos",
  "/gabinete",
  "/gabinete/manifestacoes",
  "/gabinete/encaminhamentos",
  "/relato-urbano",
  "/relato-urbano/manual",
  "/relato-urbano/historico",
  "/debug/rbac",
  "/test-dimension-rating",
  "/test-wait-time",
  "/test-infra-rating",
  "/test-task-4",
];

const ADMIN_ROUTES = [
  "/admin",
  "/admin/notifications",
  "/admin/analytics",
  "/admin/trends",
  "/admin/reports-heatmap",
  "/admin/classification-accuracy",
  "/admin/exports",
  "/admin/reports",
  "/admin/triagem",
  "/admin/referrals",
  "/admin/commissions",
  "/admin/equipment-ratings",
  "/admin/public-hearings",
  "/admin/docs/overview",
  "/admin/users",
  "/admin/permissions",
  "/admin/audit-logs",
  "/admin/service-corrections",
  "/admin/settings/ai",
  "/admin/settings/parameters",
  "/admin/settings/referral-rules",
  "/admin/settings/integrations",
  "/admin/settings/accessibility",
  "/admin/reports-analytics",
  "/admin/analytics/general",
  "/admin/analytics/demograficos",
  "/admin/analytics/advanced",
  "/admin/sentiment-analysis",
  "/admin/avaliacoes-polarizacao",
  "/admin/intensidade-demanda",
  "/admin/configuracoes/agendamentos",
];

test.describe("A3.1 — erros de console por rota", () => {
  // Varredura sequencial e pesada; dá folga ao timeout do teste.
  test.setTimeout(5 * 60 * 1000);

  test("rotas públicas (sem login)", async ({ page }) => {
    const { app, network } = await sweep(page, PUBLIC_ROUTES);
    logNetwork("públicas", network);
    expect(app, report(app)).toEqual({});
  });

  test("rotas autenticadas (cidadão)", async ({ page }) => {
    await e2eLogin(page);
    const { app, network } = await sweep(page, CITIZEN_ROUTES);
    logNetwork("cidadão", network);
    expect(app, report(app)).toEqual({});
  });

  test("rotas admin", async ({ page }) => {
    await e2eLogin(page);
    const { app, network } = await sweep(page, ADMIN_ROUTES);
    logNetwork("admin", network);
    expect(app, report(app)).toEqual({});
  });
});
