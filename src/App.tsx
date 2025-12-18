import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AIProvider } from "@/contexts/AIContext";
import { AIJourneyProvider } from "@/contexts/AIJourneyContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { MenuProvider } from "@/contexts/MenuContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { TransportProvider } from "@/contexts/TransportContext";
import { EvaluationProvider } from "@/contexts/EvaluationContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import MenuDrawer from "@/components/MenuDrawer";
import { PageLoader } from "@/components/ui/page-loader";
import { useMenu } from "@/contexts/MenuContext";
import { ProtectedAdminRoute } from "@/components/admin/ProtectedAdminRoute";

// Critical pages - loaded immediately
import Splash from "./pages/Splash";
import NotFound from "./pages/NotFound";

// Auth pages - lazy loaded
const Welcome = lazy(() => import("./pages/Welcome"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Onboarding = lazy(() => import("./pages/Onboarding"));

// Profile pages - lazy loaded
const Profile = lazy(() => import("./pages/Profile"));
const PersonalInfoPage = lazy(() => import("./pages/profile/PersonalInfoPage"));
const DemographicsPage = lazy(() => import("./pages/profile/DemographicsPage"));
const AddressPage = lazy(() => import("./pages/profile/AddressPage"));
const PreferencesPage = lazy(() => import("./pages/profile/PreferencesPage"));
const InterestsPage = lazy(() => import("./pages/profile/InterestsPage"));

// Main citizen pages - lazy loaded
const IA = lazy(() => import("./pages/IA"));
const ConversationsPage = lazy(() => import("./pages/ConversationsPage"));
const Voz = lazy(() => import("./pages/Voz"));
const SearchPage = lazy(() => import("./pages/Search"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const Notifications = lazy(() => import("./pages/Notifications"));

// Audiencias pages - lazy loaded
const Audiencias = lazy(() => import("./pages/Audiencias"));
const AudienciaDetailPage = lazy(() => import("./pages/audiencias/AudienciaDetailPage"));
const ParticipacaoPage = lazy(() => import("./pages/audiencias/ParticipacaoPage"));

// Institutional pages - lazy loaded
const AgendaCMSP = lazy(() => import("./pages/institucional/AgendaCMSP"));
const Vereadores = lazy(() => import("./pages/institucional/Vereadores"));
const VereadorDetailPage = lazy(() => import("./pages/institucional/VereadorDetailPage"));
const ConhecaCamara = lazy(() => import("./pages/institucional/ConhecaCamara"));
const CamaraExplica = lazy(() => import("./pages/institucional/CamaraExplica"));
const EscolaParlamento = lazy(() => import("./pages/institucional/EscolaParlamento"));
const Noticias = lazy(() => import("./pages/institucional/Noticias"));
const NoticiaDetailPage = lazy(() => import("./pages/institucional/NoticiaDetailPage"));

// Services pages - lazy loaded
const NearbyServicesPage = lazy(() => import("./pages/NearbyServicesPage"));
const ServiceDetailPage = lazy(() => import("./pages/ServiceDetailPage"));
const EvaluationPage = lazy(() => import("./pages/EvaluationPage"));
const ServiceRecommendationsPage = lazy(() => import("./pages/ServiceRecommendationsPage"));

// Transport pages - lazy loaded
const TransportReportPage = lazy(() => import("./pages/TransportReportPage"));
const NewReportPage = lazy(() => import("./pages/transport/NewReportPage"));
const UrgentReportPage = lazy(() => import("./pages/transport/UrgentReportPage"));
const PatternsPage = lazy(() => import("./pages/transport/PatternsPage"));
const MyReportsPage = lazy(() => import("./pages/transport/MyReportsPage"));
const ReferralPage = lazy(() => import("./pages/transport/ReferralPage"));

// Urban report pages - lazy loaded
const UrbanReportPage = lazy(() => import("./pages/UrbanReportPage"));
const ChatReportPage = lazy(() => import("./pages/urban/ChatReportPage"));
const ManualReportPage = lazy(() => import("./pages/urban/ManualReportPage"));
const ReportHistoryPage = lazy(() => import("./pages/urban/ReportHistoryPage"));

// Analytics pages - lazy loaded
const AnalyticsDashboard = lazy(() => import("./pages/analytics/AnalyticsDashboard"));
const AdvancedAnalytics = lazy(() => import("./pages/analytics/AdvancedAnalytics"));
const CreateDashboard = lazy(() => import("./pages/analytics/CreateDashboard"));
const PublicDashboards = lazy(() => import("./pages/analytics/PublicDashboards"));

// Admin pages - lazy loaded
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

// Settings pages - lazy loaded
const AccessibilityPage = lazy(() => import("./pages/settings/AccessibilityPage"));

const AppContent = () => {
  const { isMenuOpen, closeMenu } = useMenu();

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Navigate to="/splash" replace />} />
          <Route path="/splash" element={<Splash />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/personal" element={<PersonalInfoPage />} />
          <Route path="/profile/interests" element={<InterestsPage />} />
          <Route path="/profile/demographics" element={<DemographicsPage />} />
          <Route path="/profile/address" element={<AddressPage />} />
          <Route path="/profile/preferences" element={<PreferencesPage />} />
          <Route path="/settings/accessibility" element={<AccessibilityPage />} />
          <Route path="/home" element={<Navigate to="/ia" replace />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/ia" element={<IA />} />
          <Route path="/conversas" element={<ConversationsPage />} />
          <Route path="/conversa" element={<Navigate to="/ia" replace />} />
          <Route path="/voz" element={<Voz />} />
          <Route path="/favoritos" element={<FavoritesPage />} />
          <Route path="/audiencias" element={<Audiencias />} />
          <Route path="/audiencias/:id" element={<AudienciaDetailPage />} />
          <Route path="/audiencias/:id/participar" element={<ParticipacaoPage />} />
          <Route path="/institucional/agenda" element={<AgendaCMSP />} />
          <Route path="/institucional/vereadores" element={<Vereadores />} />
          <Route path="/institucional/vereadores/:id" element={<VereadorDetailPage />} />
          <Route path="/institucional/conheca-camara" element={<ConhecaCamara />} />
          <Route path="/institucional/camara-explica" element={<CamaraExplica />} />
          <Route path="/institucional/escola-parlamento" element={<EscolaParlamento />} />
          <Route path="/institucional/noticias" element={<Noticias />} />
          <Route path="/institucional/noticias/:id" element={<NoticiaDetailPage />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/servicos-proximos" element={<NearbyServicesPage />} />
          <Route path="/perto-de-mim" element={<Navigate to="/servicos-proximos" replace />} />
          <Route path="/servico/:id" element={<ServiceDetailPage />} />
          <Route path="/avaliar" element={<EvaluationPage />} />
          <Route path="/avaliar/:visitId" element={<EvaluationPage />} />
          <Route path="/transporte" element={<TransportReportPage />} />
          <Route path="/transporte/novo" element={<NewReportPage />} />
          <Route path="/transporte/urgente" element={<UrgentReportPage />} />
          <Route path="/transporte/padroes" element={<PatternsPage />} />
          <Route path="/transporte/meus-relatos" element={<MyReportsPage />} />
          <Route path="/transporte/encaminhar/:reportId" element={<ReferralPage />} />
          <Route path="/analytics" element={<AnalyticsDashboard />} />
          <Route path="/analytics/advanced" element={<AdvancedAnalytics />} />
          <Route path="/analytics/criar-painel" element={<CreateDashboard />} />
          <Route path="/analytics/galeria" element={<PublicDashboards />} />
          <Route path="/relato-urbano" element={<UrbanReportPage />} />
          <Route path="/relato-urbano/chat" element={<ChatReportPage />} />
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
          {/* Redirect old routes to unified reports */}
          <Route path="/admin/urban-reports" element={<Navigate to="/admin/reports" replace />} />
          <Route path="/admin/transport-reports" element={<Navigate to="/admin/reports" replace />} />
          <Route path="/admin/referrals" element={<ProtectedAdminRoute><ReferralsManagement /></ProtectedAdminRoute>} />
          <Route path="/admin/reports-analytics" element={<ProtectedAdminRoute><ReportsAnalytics /></ProtectedAdminRoute>} />
          <Route path="/admin/sentiment-analysis" element={<ProtectedAdminRoute><SentimentAnalysis /></ProtectedAdminRoute>} />
          <Route path="/admin/settings/n8n" element={<ProtectedAdminRoute><N8NIntegration /></ProtectedAdminRoute>} />
          <Route path="/admin/settings/n8n-monitoring" element={<ProtectedAdminRoute><N8NMonitoring /></ProtectedAdminRoute>} />
          <Route path="/admin/settings/accessibility" element={<ProtectedAdminRoute><AccessibilitySettings /></ProtectedAdminRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <MenuDrawer isOpen={isMenuOpen} onClose={closeMenu} />
    </>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutos
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
                <TransportProvider>
                  <EvaluationProvider>
                    <AIProvider>
                      <AIJourneyProvider>
                        <NotificationsProvider>
                          <AppContent />
                        </NotificationsProvider>
                      </AIJourneyProvider>
                    </AIProvider>
                  </EvaluationProvider>
                </TransportProvider>
              </FavoritesProvider>
            </OnboardingProvider>
          </MenuProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
