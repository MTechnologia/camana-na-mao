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
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import AppLayout from "@/components/layout/AppLayout";
import { ProtectedAdminRoute } from "@/components/admin/ProtectedAdminRoute";
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
const Onboarding = lazy(() => import("./pages/Onboarding"));

// ============================================
// PROFILE PAGES - Lazy loaded
// ============================================
const PersonalInfoPage = lazy(() => import("./pages/profile/PersonalInfoPage"));
const DemographicsPage = lazy(() => import("./pages/profile/DemographicsPage"));
const AddressPage = lazy(() => import("./pages/profile/AddressPage"));
const PreferencesPage = lazy(() => import("./pages/profile/PreferencesPage"));
const InterestsPage = lazy(() => import("./pages/profile/InterestsPage"));

// ============================================
// CITIZEN PAGES - Lazy loaded
// ============================================
const ConversationsPage = lazy(() => import("./pages/ConversationsPage"));
const Voz = lazy(() => import("./pages/Voz"));
const SearchPage = lazy(() => import("./pages/Search"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));

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
const EscolaParlamento = lazy(() => import("./pages/institucional/EscolaParlamento"));
const Noticias = lazy(() => import("./pages/institucional/Noticias"));
const NoticiaDetailPage = lazy(() => import("./pages/institucional/NoticiaDetailPage"));

// ============================================
// SERVICES PAGES - Lazy loaded
// ============================================
const NearbyServicesPage = lazy(() => import("./pages/NearbyServicesPage"));
const ServiceDetailPage = lazy(() => import("./pages/ServiceDetailPage"));
const EvaluationPage = lazy(() => import("./pages/EvaluationPage"));
const ServiceRecommendationsPage = lazy(() => import("./pages/ServiceRecommendationsPage"));

// ============================================
// TRANSPORT PAGES - Lazy loaded
// ============================================
const TransportReportPage = lazy(() => import("./pages/TransportReportPage"));
const NewReportPage = lazy(() => import("./pages/transport/NewReportPage"));
const UrgentReportPage = lazy(() => import("./pages/transport/UrgentReportPage"));
const PatternsPage = lazy(() => import("./pages/transport/PatternsPage"));
const MyReportsPage = lazy(() => import("./pages/transport/MyReportsPage"));
const ReferralPage = lazy(() => import("./pages/transport/ReferralPage"));

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
const PublicDashboards = lazy(() => import("./pages/analytics/PublicDashboards"));

// ============================================
// ADMIN PAGES - Lazy loaded (separate bundle)
// ============================================
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const ExportLogs = lazy(() => import("./pages/admin/ExportLogs"));
const AuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const ReportsManagement = lazy(() => import("./pages/admin/ReportsManagement"));
const ReportsAnalytics = lazy(() => import("./pages/admin/ReportsAnalytics"));
const SentimentAnalysis = lazy(() => import("./pages/admin/SentimentAnalysis"));
const N8NIntegration = lazy(() => import("./pages/admin/settings/N8NIntegration"));
const N8NMonitoring = lazy(() => import("./pages/admin/settings/N8NMonitoring"));
const AccessibilitySettings = lazy(() => import("./pages/admin/settings/AccessibilitySettings"));
const ReferralsManagement = lazy(() => import("./pages/admin/ReferralsManagement"));

// ============================================
// OTHER PAGES - Lazy loaded
// ============================================
const PublicDocumentationPage = lazy(() => import("./pages/docs/PublicDocumentationPage"));
const AccessibilityPage = lazy(() => import("./pages/settings/AccessibilityPage"));

// Failsafe: If somehow /ia is accessed, immediately redirect to /
const IAFailsafe = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Immediate client-side redirect before any rendering
    navigate("/", { replace: true });
  }, [navigate]);
  
  return null;
};

// Prefetch common routes on app load
const RoutePrefetcher = () => {
  const { prefetchMultiple } = usePrefetch();
  const location = useLocation();

  useEffect(() => {
    // Prefetch common routes after initial render
    const timer = setTimeout(() => {
      prefetchMultiple([
        "/profile",
        "/notifications",
        "/audiencias",
      ]);
    }, 1000);

    return () => clearTimeout(timer);
  }, [prefetchMultiple]);

  // Prefetch related routes based on current location
  useEffect(() => {
    const timer = setTimeout(() => {
      if (location.pathname === "/") {
        prefetchMultiple(["/search", "/favoritos", "/conversas"]);
      } else if (location.pathname.startsWith("/transporte")) {
        prefetchMultiple(["/transporte/novo", "/transporte/meus-relatos"]);
      } else if (location.pathname.startsWith("/institucional")) {
        prefetchMultiple([
          "/institucional/agenda",
          "/institucional/vereadores",
          "/institucional/noticias",
        ]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [location.pathname, prefetchMultiple]);

  return null;
};

const AppContent = () => {
  return (
    <>
      <RoutePrefetcher />
      <AppLayout>
        <Routes>
          {/* Main route - Home */}
          <Route path="/" element={<Home />} />
          
          {/* Auth routes - No layout header */}
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/onboarding" element={<Onboarding />} />
          
          {/* Profile routes - Critical page loaded immediately */}
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/personal" element={<PersonalInfoPage />} />
          <Route path="/profile/interests" element={<InterestsPage />} />
          <Route path="/profile/demographics" element={<DemographicsPage />} />
          <Route path="/profile/address" element={<AddressPage />} />
          <Route path="/profile/preferences" element={<PreferencesPage />} />
          <Route path="/settings/accessibility" element={<AccessibilityPage />} />
          
          {/* Notifications - Critical page loaded immediately */}
          <Route path="/notifications" element={<Notifications />} />
          
          {/* Citizen routes */}
          <Route path="/search" element={<SearchPage />} />
          <Route path="/conversas" element={<ConversationsPage />} />
          <Route path="/voz" element={<Voz />} />
          <Route path="/favoritos" element={<FavoritesPage />} />
          <Route path="/audiencias" element={<Audiencias />} />
          <Route path="/audiencias/:id" element={<AudienciaDetailPage />} />
          <Route path="/audiencias/:id/participar" element={<ParticipacaoPage />} />
          
          {/* Institutional routes */}
          <Route path="/institucional/agenda" element={<AgendaCMSP />} />
          <Route path="/institucional/vereadores" element={<Vereadores />} />
          <Route path="/institucional/vereadores/:id" element={<VereadorDetailPage />} />
          <Route path="/institucional/conheca-camara" element={<ConhecaCamara />} />
          <Route path="/institucional/camara-explica" element={<CamaraExplica />} />
          <Route path="/institucional/escola-parlamento" element={<EscolaParlamento />} />
          <Route path="/institucional/noticias" element={<Noticias />} />
          <Route path="/institucional/noticias/:id" element={<NoticiaDetailPage />} />
          
          {/* Services routes */}
          <Route path="/servicos-proximos" element={<NearbyServicesPage />} />
          <Route path="/perto-de-mim" element={<Navigate to="/servicos-proximos" replace />} />
          <Route path="/servico/:id" element={<ServiceDetailPage />} />
          <Route path="/avaliar" element={<EvaluationPage />} />
          <Route path="/avaliar/:visitId" element={<EvaluationPage />} />
          
          {/* Transport routes */}
          <Route path="/transporte" element={<TransportReportPage />} />
          <Route path="/transporte/novo" element={<NewReportPage />} />
          <Route path="/transporte/urgente" element={<UrgentReportPage />} />
          <Route path="/transporte/padroes" element={<PatternsPage />} />
          <Route path="/transporte/meus-relatos" element={<MyReportsPage />} />
          <Route path="/transporte/encaminhar/:reportId" element={<ReferralPage />} />
          
          {/* Analytics routes */}
          <Route path="/analytics" element={<AnalyticsDashboard />} />
          <Route path="/analytics/advanced" element={<AdvancedAnalytics />} />
          <Route path="/analytics/criar-painel" element={<CreateDashboard />} />
          <Route path="/analytics/galeria" element={<PublicDashboards />} />
          
          {/* Urban report routes */}
          <Route path="/relato-urbano" element={<UrbanReportPage />} />
          <Route path="/relato-urbano/chat" element={<Navigate to="/?journey=urban_report" replace />} />
          <Route path="/relato-urbano/manual" element={<ManualReportPage />} />
          <Route path="/relato-urbano/historico" element={<ReportHistoryPage />} />
          <Route path="/meus-relatos-urbanos" element={<ReportHistoryPage />} />
          <Route path="/recomendacoes" element={<ServiceRecommendationsPage />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
          <Route path="/admin/analytics" element={<ProtectedAdminRoute><AnalyticsDashboard /></ProtectedAdminRoute>} />
          <Route path="/admin/analytics/advanced" element={<ProtectedAdminRoute><AdvancedAnalytics /></ProtectedAdminRoute>} />
          <Route path="/admin/users" element={<ProtectedAdminRoute><UserManagement /></ProtectedAdminRoute>} />
          <Route path="/admin/exports" element={<ProtectedAdminRoute><ExportLogs /></ProtectedAdminRoute>} />
          <Route path="/admin/audit-logs" element={<ProtectedAdminRoute><AuditLogs /></ProtectedAdminRoute>} />
          <Route path="/admin/reports" element={<ProtectedAdminRoute><ReportsManagement /></ProtectedAdminRoute>} />
          <Route path="/admin/urban-reports" element={<Navigate to="/admin/reports" replace />} />
          <Route path="/admin/transport-reports" element={<Navigate to="/admin/reports" replace />} />
          <Route path="/admin/referrals" element={<ProtectedAdminRoute><ReferralsManagement /></ProtectedAdminRoute>} />
          <Route path="/admin/reports-analytics" element={<ProtectedAdminRoute><ReportsAnalytics /></ProtectedAdminRoute>} />
          <Route path="/admin/sentiment-analysis" element={<ProtectedAdminRoute><SentimentAnalysis /></ProtectedAdminRoute>} />
          <Route path="/admin/settings/n8n" element={<ProtectedAdminRoute><N8NIntegration /></ProtectedAdminRoute>} />
          <Route path="/admin/settings/n8n-monitoring" element={<ProtectedAdminRoute><N8NMonitoring /></ProtectedAdminRoute>} />
          <Route path="/admin/settings/accessibility" element={<ProtectedAdminRoute><AccessibilitySettings /></ProtectedAdminRoute>} />
          
          {/* Documentation */}
          <Route path="/docs" element={<Navigate to="/docs/overview" replace />} />
          <Route path="/docs/overview" element={<PublicDocumentationPage />} />
          
          {/* Compatibility redirects - old routes to new */}
          <Route path="/ia" element={<IAFailsafe />} />
          <Route path="/splash" element={<Navigate to="/" replace />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/conversa" element={<Navigate to="/" replace />} />
          
          {/* Catch-all */}
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
      <BrowserRouter>
        <AuthProvider>
          <MenuProvider>
            <OnboardingProvider>
              <FavoritesProvider>
                <AIJourneyProvider>
                  <NotificationsProvider>
                    <AppContent />
                  </NotificationsProvider>
                </AIJourneyProvider>
              </FavoritesProvider>
            </OnboardingProvider>
          </MenuProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
