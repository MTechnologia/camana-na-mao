import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AIJourneyProvider } from "@/contexts/AIJourneyContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { MenuProvider } from "@/contexts/MenuContext";

import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { BackgroundAuthBridge } from "@/components/BackgroundAuthBridge";
import AppLayout from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProtectedAdminRoute } from "@/components/admin/ProtectedAdminRoute";
import { ProtectedAdminOnlyRoute } from "@/components/admin/ProtectedAdminOnlyRoute";
import { usePrefetch } from "@/components/navigation/PrefetchLink";

// ============================================
// CRITICAL PAGES - Loaded immediately (no lazy)
// ============================================
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";

// ============================================
// AUTH PAGES - Lazy loaded (used before main app)
// ============================================
const Welcome = lazy(() => import("./pages/Welcome"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const UpdatePassword = lazy(() => import("./pages/UpdatePassword"));
const Onboarding = lazy(() => import("./pages/Onboarding"));

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
const MyAudienciaInscricoesPage = lazy(() => import("./pages/audiencias/MyAudienciaInscricoesPage"));

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
const AdvancedAnalytics = lazy(() => import("./pages/analytics/AdvancedAnalytics"));
const CreateDashboard = lazy(() => import("./pages/analytics/CreateDashboard"));

// ============================================
// ADMIN PAGES - Lazy loaded (separate bundle)
// ============================================
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const ReportsAnalyticsPage = lazy(() => import("./pages/admin/ReportsAnalyticsPage"));
const ClassificationAccuracyPage = lazy(() => import("./pages/admin/ClassificationAccuracyPage"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const ExportLogs = lazy(() => import("./pages/admin/ExportLogs"));
const AuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const ReportsManagement = lazy(() => import("./pages/admin/ReportsManagement"));
const N8NIntegration = lazy(() => import("./pages/admin/settings/N8NIntegration"));
const N8NMonitoring = lazy(() => import("./pages/admin/settings/N8NMonitoring"));
const AccessibilitySettings = lazy(() => import("./pages/admin/settings/AccessibilitySettings"));
const ReferralsManagement = lazy(() => import("./pages/admin/ReferralsManagement"));
const ServiceCorrectionsManagement = lazy(() => import("./pages/admin/ServiceCorrectionsManagement"));

// ============================================
// OTHER PAGES - Lazy loaded
// ============================================
const PublicDocumentationPage = lazy(() => import("./pages/docs/PublicDocumentationPage"));
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
      prefetchMultiple([
        "/perfil",
        "/notificacoes",
        "/audiencias",
      ]);
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
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      // If it's a recovery token and we're not already on the password update page
      if (accessToken && type === 'recovery' && location.pathname !== '/nova-senha') {
        // Redirect to password update page with the hash
        window.location.replace(`/nova-senha${location.hash}`);
        return;
      }
      
      // If it's a signup confirmation and we're on home, let it process normally
      if (accessToken && type === 'signup' && location.pathname === '/') {
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
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/nova-senha" element={<UpdatePassword />} />
          <Route path="/privacidade" element={<PrivacyPolicyPage />} />
          <Route path="/docs" element={<Navigate to="/docs/overview" replace />} />
          <Route path="/docs/overview" element={<PublicDocumentationPage />} />

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
            <Route path="/perfil/consentimentos" element={<ConsentsPage />} />
            <Route path="/perfil/exportar-dados" element={<DataExportPage />} />
            <Route path="/perfil/direitos" element={<UserRightsPage />} />
            <Route path="/configuracoes/acessibilidade" element={<AccessibilityPage />} />
            <Route path="/profile" element={<Navigate to="/perfil" replace />} />
            <Route path="/profile/personal" element={<Navigate to="/perfil/dados-pessoais" replace />} />
            <Route path="/profile/interests" element={<Navigate to="/perfil/interesses" replace />} />
            <Route path="/profile/demographics" element={<Navigate to="/perfil/dados-demograficos" replace />} />
            <Route path="/profile/address" element={<Navigate to="/perfil/endereco" replace />} />
            <Route path="/profile/preferences" element={<Navigate to="/perfil/preferencias" replace />} />
            <Route path="/settings/accessibility" element={<Navigate to="/configuracoes/acessibilidade" replace />} />
            <Route path="/notificacoes" element={<Notifications />} />
            <Route path="/notifications" element={<Navigate to="/notificacoes" replace />} />
            <Route path="/busca" element={<SearchPage />} />
            <Route path="/search" element={<Navigate to="/busca" replace />} />
            <Route path="/relatos" element={<ReportsHub />} />
            <Route path="/conversas" element={<ConversationsPage />} />
            <Route path="/audiencias" element={<Audiencias />} />
            <Route path="/audiencias/:id" element={<AudienciaDetailPage />} />
            <Route path="/audiencias/:id/participar" element={<ParticipacaoPage />} />
            <Route path="/audiencias/minhas-inscricoes" element={<MyAudienciaInscricoesPage />} />
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
            <Route path="/transporte/historico" element={<MyReportsPage />} />
            <Route path="/paineis" element={<AnalyticsDashboard />} />
            <Route path="/paineis/avancado" element={<AdvancedAnalytics />} />
            <Route path="/paineis/criar" element={<CreateDashboard />} />
            <Route path="/analytics" element={<Navigate to="/paineis" replace />} />
            <Route path="/analytics/advanced" element={<Navigate to="/paineis/avancado" replace />} />
            <Route path="/analytics/criar-painel" element={<Navigate to="/paineis/criar" replace />} />
            <Route path="/relato-urbano" element={<UrbanReportPage />} />
            <Route path="/relato-urbano/manual" element={<ManualReportPage />} />
            <Route path="/relato-urbano/historico" element={<ReportHistoryPage />} />
            <Route path="/admin" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
            <Route path="/admin/notifications" element={<ProtectedAdminRoute><AdminNotifications /></ProtectedAdminRoute>} />
            <Route path="/admin/analytics" element={<ProtectedAdminRoute><ReportsAnalyticsPage /></ProtectedAdminRoute>} />
            <Route path="/admin/classification-accuracy" element={<ProtectedAdminRoute><ClassificationAccuracyPage /></ProtectedAdminRoute>} />
            <Route path="/admin/users" element={<ProtectedAdminOnlyRoute><UserManagement /></ProtectedAdminOnlyRoute>} />
            <Route path="/admin/exports" element={<ProtectedAdminRoute><ExportLogs /></ProtectedAdminRoute>} />
            <Route path="/admin/audit-logs" element={<ProtectedAdminOnlyRoute><AuditLogs /></ProtectedAdminOnlyRoute>} />
            <Route path="/admin/reports" element={<ProtectedAdminRoute><ReportsManagement /></ProtectedAdminRoute>} />
            <Route path="/admin/referrals" element={<ProtectedAdminRoute><ReferralsManagement /></ProtectedAdminRoute>} />
            <Route path="/admin/service-corrections" element={<ProtectedAdminOnlyRoute><ServiceCorrectionsManagement /></ProtectedAdminOnlyRoute>} />
            <Route path="/admin/settings/n8n" element={<ProtectedAdminOnlyRoute><N8NIntegration /></ProtectedAdminOnlyRoute>} />
            <Route path="/admin/settings/n8n-monitoring" element={<ProtectedAdminOnlyRoute><N8NMonitoring /></ProtectedAdminOnlyRoute>} />
            <Route path="/admin/settings/accessibility" element={<ProtectedAdminOnlyRoute><AccessibilitySettings /></ProtectedAdminOnlyRoute>} />
            <Route path="/admin/executive" element={<Navigate to="/admin" replace />} />
            <Route path="/admin/reports-analytics" element={<Navigate to="/admin/analytics" replace />} />
            <Route path="/admin/analytics/advanced" element={<Navigate to="/admin/analytics" replace />} />
            <Route path="/admin/sentiment-analysis" element={<Navigate to="/admin/analytics" replace />} />
            <Route path="/debug/rbac" element={<DebugRBAC />} />
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
