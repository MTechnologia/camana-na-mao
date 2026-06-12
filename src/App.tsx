import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AIJourneyProvider } from "@/contexts/AIJourneyContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { MenuProvider } from "@/contexts/MenuContext";

import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { BackgroundAuthBridge } from "@/components/BackgroundAuthBridge";
import AppLayout from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProtectedAdminRoute, ProtectedAdminOnlyRoute } from "@/components/admin/ProtectedRoutes";
import { AdminAppLayout } from "@/components/admin/AdminAppLayout";
import { PaineisLayout } from "@/components/admin/PaineisLayout";
import {
  PaineisAvancadoRoute,
  PaineisCriarRoute,
  PaineisIndexRoute,
} from "@/components/admin/PaineisRoutes";
import { ConfigEnvironmentProvider } from "@/contexts/ConfigEnvironmentContext";
import { ProtectedVereadorRoute } from "@/components/vereador/ProtectedVereadorRoute";
import { usePrefetch } from "@/components/navigation/PrefetchLink";

// ============================================
// CRITICAL PAGES - Loaded immediately (no lazy)
// ============================================
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import TestDimensionRating from "./pages/TestDimensionRating";
import TestWaitTimePicker from "./pages/TestWaitTimePicker";
import TestInfraRating from "./pages/TestInfraRating";
import TestTask4 from "./pages/TestTask4";

// ============================================
// AUTH PAGES - Lazy loaded (used before main app)
// ============================================
const Welcome = lazy(() => import("./pages/Welcome"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ConfirmarEmail = lazy(() => import("./pages/ConfirmarEmail"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const UpdatePassword = lazy(() => import("./pages/UpdatePassword"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const CompleteInvitePage = lazy(() => import("./pages/CompleteInvitePage"));

// ============================================
// PROFILE PAGES - Lazy loaded
// ============================================
const PersonalInfoPage = lazy(() => import("./pages/profile/PersonalInfoPage"));
const DemographicsPage = lazy(() => import("./pages/profile/DemographicsPage"));
const AddressPage = lazy(() => import("./pages/profile/AddressPage"));
const PreferencesPage = lazy(() => import("./pages/profile/PreferencesPage"));
const InterestsPage = lazy(() => import("./pages/profile/InterestsPage"));
const ConsentsPage = lazy(() => import("./pages/profile/ConsentsPage"));
const DataExportPage = lazy(() => import("./pages/profile/DataExportPage"));
const UserRightsPage = lazy(() => import("./pages/profile/UserRightsPage"));
const PublicProfilePage = lazy(() => import("./pages/profile/PublicProfilePage"));
const VisitHistoryPage = lazy(() => import("./pages/profile/VisitHistoryPage"));
const SubscriptionsPage = lazy(() => import("./pages/profile/SubscriptionsPage"));

// ============================================
// CITIZEN PAGES - Lazy loaded
// ============================================
const ConversationsPage = lazy(() => import("./pages/ConversationsPage"));
const SearchPage = lazy(() => import("./pages/Search"));

// ============================================
// AUDIENCIAS PAGES - Lazy loaded
// ============================================
const Audiencias = lazy(() => import("./pages/Audiencias"));
const AudienciaDetailPage = lazy(() => import("./pages/audiencias/AudienciaDetailPage"));
const ParticipacaoPage = lazy(() => import("./pages/audiencias/ParticipacaoPage"));

// ============================================
// INSTITUTIONAL PAGES - Lazy loaded
// ============================================
const AgendaCMSP = lazy(() => import("./pages/institucional/AgendaCMSP"));
const Vereadores = lazy(() => import("./pages/institucional/Vereadores"));
const VereadorDetailPage = lazy(() => import("./pages/institucional/VereadorDetailPage"));
const ConhecaCamara = lazy(() => import("./pages/institucional/ConhecaCamara"));
const CamaraExplica = lazy(() => import("./pages/institucional/CamaraExplica"));
const Comissoes = lazy(() => import("./pages/institucional/Comissoes"));
const EscolaParlamento = lazy(() => import("./pages/institucional/EscolaParlamento"));
const Noticias = lazy(() => import("./pages/institucional/Noticias"));
const NoticiaDetailPage = lazy(() => import("./pages/institucional/NoticiaDetailPage"));

// ============================================
// SERVICES PAGES - Lazy loaded
// ============================================
const NearbyServicesPage = lazy(() => import("./pages/NearbyServicesPage"));
const ServiceDetailPage = lazy(() => import("./pages/ServiceDetailPage"));
const EvaluationPage = lazy(() => import("./pages/EvaluationPage"));
const RatingsHistoryPage = lazy(() => import("./pages/ratings/RatingsHistoryPage"));
const MyFavoritesPage = lazy(() => import("./pages/services/MyFavoritesPage"));

// ============================================
// LEGAL PAGES - Lazy loaded
// ============================================
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsOfUsePage = lazy(() => import("./pages/TermsOfUsePage"));

// ============================================
// TRANSPORT PAGES - Lazy loaded
// ============================================
const TransportReportPage = lazy(() => import("./pages/TransportReportPage"));
const NewReportPage = lazy(() => import("./pages/transport/NewReportPage"));
const PatternsPage = lazy(() => import("./pages/transport/PatternsPage"));
const MyReportsPage = lazy(() => import("./pages/transport/MyReportsPage"));

// ============================================
// URBAN REPORT PAGES - Lazy loaded
// ============================================
const UrbanReportPage = lazy(() => import("./pages/UrbanReportPage"));
const ManualReportPage = lazy(() => import("./pages/urban/ManualReportPage"));
const ReportHistoryPage = lazy(() => import("./pages/urban/ReportHistoryPage"));

// ============================================
// ANALYTICS PAGES - Lazy loaded
// ============================================
const AnalyticsDashboard = lazy(() => import("./pages/analytics/AnalyticsDashboard"));
const MinhaCidade = lazy(() => import("./pages/analytics/MinhaCidade"));
const AdvancedAnalytics = lazy(() => import("./pages/analytics/AdvancedAnalytics"));
const CreateDashboard = lazy(() => import("./pages/analytics/CreateDashboard"));
const WorstServicesByDimensionPage = lazy(
  () => import("./pages/analytics/WorstServicesByDimensionPage"),
);

// ============================================
// ADMIN PAGES (mapeamento PO) — lazy loaded
// ============================================
const AdminDashboard = lazy(() =>
  import("./pages/admin/AdminDashboard").then((m) => ({ default: m.AdminDashboard })),
);
const AdminIndexRedirect = lazy(() =>
  import("./components/admin/AdminIndexRedirect").then((m) => ({
    default: m.AdminIndexRedirect,
  })),
);
const AdminNotificationsPage = lazy(() =>
  import("./pages/admin/AdminNotificationsPage").then((m) => ({
    default: m.AdminNotificationsPage,
  })),
);
const ReportsAnalyticsPage = lazy(() =>
  import("./pages/admin/ReportsAnalyticsPage").then((m) => ({ default: m.ReportsAnalyticsPage })),
);
const TrendDashboardPage = lazy(() =>
  import("./pages/admin/TrendDashboardPage").then((m) => ({ default: m.TrendDashboardPage })),
);
const ReportsHeatmapPage = lazy(() =>
  import("./pages/admin/ReportsHeatmapPage").then((m) => ({ default: m.ReportsHeatmapPage })),
);
const ClassificationAccuracyPage = lazy(() =>
  import("./pages/admin/ClassificationAccuracyPage").then((m) => ({
    default: m.ClassificationAccuracyPage,
  })),
);
const ExportLogsPage = lazy(() =>
  import("./pages/admin/ExportLogsPage").then((m) => ({ default: m.ExportLogsPage })),
);
const ReportsManagementPage = lazy(() =>
  import("./pages/admin/ReportsManagementPage").then((m) => ({ default: m.ReportsManagementPage })),
);
const ReferralsManagementPage = lazy(() =>
  import("./pages/admin/ReferralsManagementPage").then((m) => ({
    default: m.ReferralsManagementPage,
  })),
);
const CommissionsPage = lazy(() =>
  import("./pages/admin/CommissionsPage").then((m) => ({ default: m.CommissionsPage })),
);
const EquipmentRatingsPage = lazy(() =>
  import("./pages/admin/EquipmentRatingsPage").then((m) => ({ default: m.EquipmentRatingsPage })),
);
const PublicHearingsPage = lazy(() =>
  import("./pages/admin/PublicHearingsPage").then((m) => ({ default: m.PublicHearingsPage })),
);
const PublicDocumentationPageAdmin = lazy(() =>
  import("./pages/admin/PublicDocumentationPage").then((m) => ({
    default: m.PublicDocumentationPage,
  })),
);
const UserManagementPage = lazy(() =>
  import("./pages/admin/UserManagementPage").then((m) => ({ default: m.UserManagementPage })),
);
const AuditLogsPage = lazy(() =>
  import("./pages/admin/AuditLogsPage").then((m) => ({ default: m.AuditLogsPage })),
);
const ServiceCorrectionsPage = lazy(() =>
  import("./pages/admin/ServiceCorrectionsPage").then((m) => ({
    default: m.ServiceCorrectionsPage,
  })),
);
const AccessibilitySettingsPage = lazy(() =>
  import("./pages/admin/AccessibilitySettingsPage").then((m) => ({
    default: m.AccessibilitySettingsPage,
  })),
);
const AiConfigPage = lazy(() =>
  import("./pages/admin/settings/AiConfigPage").then((m) => ({ default: m.AiConfigPage })),
);
const SystemParametersPage = lazy(() =>
  import("./pages/admin/settings/SystemParametersPage").then((m) => ({
    default: m.SystemParametersPage,
  })),
);
const ApiIntegrationsPage = lazy(() =>
  import("./pages/admin/settings/ApiIntegrationsPage").then((m) => ({
    default: m.ApiIntegrationsPage,
  })),
);
const ReferralRoutingRulesPage = lazy(() =>
  import("./pages/admin/settings/ReferralRoutingRulesPage").then((m) => ({
    default: m.ReferralRoutingRulesPage,
  })),
);
// Rotas legadas (deep links / bookmarks)
const SchedulesManagementPage = lazy(
  () => import("./pages/admin/settings/SchedulesManagementPage"),
);
const PatternsManagementPage = lazy(() => import("./pages/admin/PatternsManagementPage"));
const ForecastPage = lazy(() => import("./pages/admin/ForecastPage"));
const AnomaliesPage = lazy(() => import("./pages/admin/AnomaliesPage"));
const TriageKanbanPage = lazy(() => import("./pages/admin/TriageKanbanPage"));
const PermissionsMatrixPage = lazy(() => import("./pages/admin/PermissionsMatrixPage"));
const GabineteDashboard = lazy(() => import("./pages/gabinete/GabineteDashboard"));
const GabineteManifestacoes = lazy(() => import("./pages/gabinete/GabineteManifestacoes"));
const GabineteEncaminhamentos = lazy(() => import("./pages/gabinete/GabineteEncaminhamentos"));

// ============================================
// OTHER PAGES - Lazy loaded
// ============================================
const PublicDocumentationPageCitizen = lazy(() => import("./pages/docs/PublicDocumentationPage"));
const AccessibilityPage = lazy(() => import("./pages/settings/AccessibilityPage"));
const DebugRBAC = lazy(() => import("./pages/debug/DebugRBAC"));
const ReportsHub = lazy(() => import("./pages/reports/ReportsHub"));

// Prefetch common routes on app load
const RoutePrefetcher = () => {
  const { prefetchMultiple } = usePrefetch();
  const location = useLocation();

  useEffect(() => {
    // Prefetch common routes after initial render
    const timer = setTimeout(() => {
      prefetchMultiple(["/perfil", "/notificacoes", "/audiencias"]);
    }, 1000);

    return () => clearTimeout(timer);
  }, [prefetchMultiple]);

  // Prefetch related routes based on current location
  useEffect(() => {
    const timer = setTimeout(() => {
      if (location.pathname === "/") {
        prefetchMultiple(["/busca", "/conversas"]);
      } else if (location.pathname.startsWith("/transporte")) {
        prefetchMultiple(["/transporte/novo", "/transporte/historico"]);
      } else if (location.pathname.startsWith("/institucional")) {
        prefetchMultiple([
          "/institucional/agenda",
          "/institucional/vereadores",
          "/institucional/comissoes",
          "/institucional/noticias",
        ]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [location.pathname, prefetchMultiple]);

  return null;
};

const AppContent = () => {
  const location = useLocation();

  // Handle Supabase auth redirects with hash tokens
  useEffect(() => {
    // Check if we have auth tokens in the hash (from email links)
    if (location.hash) {
      const hashParams = new URLSearchParams(location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const type = hashParams.get("type");

      // If it's a recovery token and we're not already on the password update page
      if (accessToken && type === "recovery" && location.pathname !== "/nova-senha") {
        // Redirect to password update page with the hash
        window.location.replace(`/nova-senha${location.hash}`);
        return;
      }

      // HU-11.1 — Convite: redireciona para a página de completar cadastro
      // (definir senha + nome + telefone). Se não fizer isso aqui, o usuário
      // cai direto na home logado.
      if (accessToken && type === "invite" && location.pathname !== "/completar-convite") {
        window.location.replace(`/completar-convite${location.hash}`);
        return;
      }

      // If it's a signup confirmation and we're on home, let it process normally
      if (accessToken && type === "signup" && location.pathname === "/") {
        // Supabase will handle this automatically
        return;
      }
    }
  }, [location]);

  return (
    <>
      <RoutePrefetcher />
      <AppLayout>
        <Routes>
          {/* Rotas públicas - acessíveis sem login */}
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/confirmar-email" element={<ConfirmarEmail />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/nova-senha" element={<UpdatePassword />} />
          {/* HU-11.1 — Página de complemento de cadastro pós-convite. */}
          <Route path="/completar-convite" element={<CompleteInvitePage />} />
          <Route path="/privacidade" element={<PrivacyPolicyPage />} />
          <Route path="/termos-de-uso" element={<TermsOfUsePage />} />
          {/* Documentação: apenas admin — redireciona URLs antigas */}
          <Route path="/docs" element={<Navigate to="/admin/docs/overview" replace />} />
          <Route path="/docs/overview" element={<Navigate to="/admin/docs/overview" replace />} />

          {/* Rotas protegidas - redirecionam para /welcome se não logado */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Home />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/perfil" element={<Profile />} />
            <Route path="/perfil/visitas" element={<VisitHistoryPage />} />
            <Route path="/perfil/:userId" element={<PublicProfilePage />} />
            <Route path="/perfil/dados-pessoais" element={<PersonalInfoPage />} />
            <Route path="/perfil/interesses" element={<InterestsPage />} />
            <Route path="/perfil/dados-demograficos" element={<DemographicsPage />} />
            <Route path="/perfil/endereco" element={<AddressPage />} />
            <Route path="/perfil/preferencias" element={<PreferencesPage />} />
            <Route path="/perfil/inscricoes" element={<SubscriptionsPage />} />
            <Route path="/perfil/consentimentos" element={<ConsentsPage />} />
            <Route path="/perfil/exportar-dados" element={<DataExportPage />} />
            <Route path="/perfil/direitos" element={<UserRightsPage />} />
            <Route path="/configuracoes/acessibilidade" element={<AccessibilityPage />} />
            <Route path="/profile" element={<Navigate to="/perfil" replace />} />
            <Route
              path="/profile/personal"
              element={<Navigate to="/perfil/dados-pessoais" replace />}
            />
            <Route
              path="/profile/interests"
              element={<Navigate to="/perfil/interesses" replace />}
            />
            <Route
              path="/profile/demographics"
              element={<Navigate to="/perfil/dados-demograficos" replace />}
            />
            <Route path="/profile/address" element={<Navigate to="/perfil/endereco" replace />} />
            <Route
              path="/profile/preferences"
              element={<Navigate to="/perfil/preferencias" replace />}
            />
            <Route
              path="/settings/accessibility"
              element={<Navigate to="/configuracoes/acessibilidade" replace />}
            />
            <Route path="/notificacoes" element={<Notifications />} />
            <Route path="/notifications" element={<Navigate to="/notificacoes" replace />} />
            <Route path="/busca" element={<SearchPage />} />
            <Route path="/search" element={<Navigate to="/busca" replace />} />
            <Route path="/relatos" element={<ReportsHub />} />
            <Route path="/conversas" element={<ConversationsPage />} />
            <Route path="/audiencias" element={<Audiencias />} />
            <Route path="/audiencias/:id" element={<AudienciaDetailPage />} />
            <Route path="/audiencias/:id/participar" element={<ParticipacaoPage />} />
            <Route
              path="/audiencias/minhas-inscricoes"
              element={<Navigate to="/perfil/inscricoes?aba=audiencias" replace />}
            />
            <Route path="/institucional/agenda" element={<AgendaCMSP />} />
            <Route path="/institucional/vereadores" element={<Vereadores />} />
            <Route path="/institucional/vereadores/:id" element={<VereadorDetailPage />} />
            <Route path="/institucional/conheca-camara" element={<ConhecaCamara />} />
            <Route path="/institucional/comissoes" element={<Comissoes />} />
            <Route path="/institucional/camara-explica" element={<CamaraExplica />} />
            <Route path="/institucional/escola-parlamento" element={<EscolaParlamento />} />
            <Route path="/institucional/noticias" element={<Noticias />} />
            <Route path="/institucional/noticias/:id" element={<NoticiaDetailPage />} />
            <Route path="/servicos-proximos" element={<NearbyServicesPage />} />
            <Route path="/servicos/favoritos" element={<MyFavoritesPage />} />
            <Route path="/servico/:id" element={<ServiceDetailPage />} />
            <Route path="/avaliar" element={<EvaluationPage />} />
            <Route path="/avaliar/:visitId" element={<EvaluationPage />} />
            <Route path="/avaliacoes/historico" element={<RatingsHistoryPage />} />
            <Route path="/transporte" element={<Navigate to="/relatos" replace />} />
            <Route path="/transporte/novo" element={<NewReportPage />} />
            <Route path="/transporte/padroes" element={<PatternsPage />} />
            <Route
              path="/relatos/padroes"
              element={<Navigate to="/transporte/padroes" replace />}
            />
            <Route path="/transporte/historico" element={<MyReportsPage />} />
            {/* Alias usado em deep links (notificações, mensagem pós-registro no chat, docs) */}
            <Route path="/transporte/meus-relatos" element={<MyReportsPage />} />
            <Route path="/minha-cidade" element={<MinhaCidade />} />
            <Route path="/paineis" element={<PaineisLayout />}>
              <Route index element={<PaineisIndexRoute />} />
              <Route path="avancado" element={<PaineisAvancadoRoute />} />
              <Route path="criar" element={<PaineisCriarRoute />} />
              <Route path="criar/:panelId" element={<PaineisCriarRoute />} />
              <Route path="piores-servicos" element={<WorstServicesByDimensionPage />} />
            </Route>
            <Route path="/analytics" element={<Navigate to="/paineis" replace />} />
            <Route
              path="/analytics/advanced"
              element={<Navigate to="/paineis/avancado" replace />}
            />
            <Route
              path="/analytics/criar-painel"
              element={<Navigate to="/paineis/criar" replace />}
            />
            <Route
              path="/gabinete"
              element={
                <ProtectedVereadorRoute>
                  <GabineteDashboard />
                </ProtectedVereadorRoute>
              }
            />
            <Route
              path="/gabinete/manifestacoes"
              element={
                <ProtectedVereadorRoute>
                  <GabineteManifestacoes />
                </ProtectedVereadorRoute>
              }
            />
            <Route
              path="/gabinete/encaminhamentos"
              element={
                <ProtectedVereadorRoute>
                  <GabineteEncaminhamentos />
                </ProtectedVereadorRoute>
              }
            />
            <Route path="/relato-urbano" element={<UrbanReportPage />} />
            <Route path="/relato-urbano/manual" element={<ManualReportPage />} />
            <Route path="/relato-urbano/historico" element={<ReportHistoryPage />} />
            <Route path="/debug/rbac" element={<DebugRBAC />} />
            <Route path="/test-dimension-rating" element={<TestDimensionRating />} />
            <Route path="/test-wait-time" element={<TestWaitTimePicker />} />
            <Route path="/test-infra-rating" element={<TestInfraRating />} />
            <Route path="/test-task-4" element={<TestTask4 />} />
          </Route>

          {/* Redirects legados → rotas PO */}
          <Route path="/admin/executive" element={<Navigate to="/admin" replace />} />
          <Route
            path="/admin/reports-analytics"
            element={<Navigate to="/admin/analytics" replace />}
          />
          <Route
            path="/admin/analytics/general"
            element={<Navigate to="/admin/analytics" replace />}
          />
          <Route
            path="/admin/analytics/demograficos"
            element={<Navigate to="/admin/analytics" replace />}
          />
          <Route
            path="/admin/analytics/advanced"
            element={<Navigate to="/admin/analytics" replace />}
          />
          <Route
            path="/admin/sentiment-analysis"
            element={<Navigate to="/admin/analytics" replace />}
          />
          <Route
            path="/admin/avaliacoes-polarizacao"
            element={<Navigate to="/admin/reports-heatmap?metric=avaliacoes" replace />}
          />
          <Route
            path="/admin/intensidade-demanda"
            element={<Navigate to="/admin/reports-heatmap?metric=demanda" replace />}
          />
          <Route path="/admin/padroes" element={<Navigate to="/admin/analytics" replace />} />
          <Route path="/admin/previsoes" element={<Navigate to="/admin/analytics" replace />} />
          <Route path="/admin/anomalias" element={<Navigate to="/admin/analytics" replace />} />
          <Route path="/admin/comissions" element={<Navigate to="/admin/commissions" replace />} />
          <Route
            path="/admin/configuracoes/agendamentos"
            element={<Navigate to="/admin/exports" replace />}
          />
          <Route path="/admin/docs" element={<Navigate to="/admin/docs/overview" replace />} />

          <Route element={<ProtectedAdminRoute />}>
            <Route element={<AdminAppLayout />}>
              <Route path="/admin">
                <Route index element={<AdminIndexRedirect />} />
                <Route path="notifications" element={<AdminNotificationsPage />} />
                <Route path="analytics" element={<ReportsAnalyticsPage />} />
                <Route path="trends" element={<TrendDashboardPage />} />
                <Route path="reports-heatmap" element={<ReportsHeatmapPage />} />
                <Route path="classification-accuracy" element={<ClassificationAccuracyPage />} />
                <Route path="exports" element={<ExportLogsPage />} />
                <Route path="reports" element={<ReportsManagementPage />} />
                <Route path="triagem" element={<TriageKanbanPage />} />
                <Route path="referrals" element={<ReferralsManagementPage />} />
                <Route path="commissions" element={<CommissionsPage />} />
                <Route path="equipment-ratings" element={<EquipmentRatingsPage />} />
                <Route path="public-hearings" element={<PublicHearingsPage />} />
                <Route path="docs">
                  <Route path="overview" element={<PublicDocumentationPageAdmin />} />
                </Route>

                <Route element={<ProtectedAdminOnlyRoute />}>
                  <Route path="users" element={<UserManagementPage />} />
                  <Route path="permissions" element={<PermissionsMatrixPage />} />
                  <Route path="audit-logs" element={<AuditLogsPage />} />
                  <Route path="service-corrections" element={<ServiceCorrectionsPage />} />
                  <Route
                    path="settings"
                    element={
                      <ConfigEnvironmentProvider>
                        <Outlet />
                      </ConfigEnvironmentProvider>
                    }
                  >
                    <Route index element={<Navigate to="ai" replace />} />
                    <Route path="ai" element={<AiConfigPage />} />
                    <Route path="parameters" element={<SystemParametersPage />} />
                    <Route path="referral-rules" element={<ReferralRoutingRulesPage />} />
                    <Route path="integrations" element={<ApiIntegrationsPage />} />
                    <Route path="accessibility" element={<AccessibilitySettingsPage />} />
                  </Route>
                </Route>
              </Route>
            </Route>
          </Route>

          {/* Catch-all - 404 (sem proteção para exibir página de não encontrado) */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppLayout>
    </>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <BackgroundAuthBridge />
          <MenuProvider>
            <OnboardingProvider>
              <AIJourneyProvider>
                <NotificationsProvider>
                  <AppContent />
                </NotificationsProvider>
              </AIJourneyProvider>
            </OnboardingProvider>
          </MenuProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
