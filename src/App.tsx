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
import MenuDrawer from "@/components/MenuDrawer";
import Splash from "./pages/Splash";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";
import PersonalInfoPage from "./pages/profile/PersonalInfoPage";
import DemographicsPage from "./pages/profile/DemographicsPage";
import AddressPage from "./pages/profile/AddressPage";
import PreferencesPage from "./pages/profile/PreferencesPage";
import InterestsPage from "./pages/profile/InterestsPage";
import Home from "./pages/Home";
import IA from "./pages/IA";
import Conversa from "./pages/Conversa";
import Voz from "./pages/Voz";
import Audiencias from "./pages/Audiencias";
import AudienciaDetailPage from "./pages/audiencias/AudienciaDetailPage";
import FavoritesPage from "./pages/FavoritesPage";
import ParticipacaoPage from "./pages/audiencias/ParticipacaoPage";
import AgendaCMSP from "./pages/institucional/AgendaCMSP";
import Vereadores from "./pages/institucional/Vereadores";
import ConhecaCamara from "./pages/institucional/ConhecaCamara";
import CamaraExplica from "./pages/institucional/CamaraExplica";
import EscolaParlamento from "./pages/institucional/EscolaParlamento";
import Noticias from "./pages/institucional/Noticias";
import NoticiaDetailPage from "./pages/institucional/NoticiaDetailPage";
import Notifications from "./pages/Notifications";
import EvaluationPage from "./pages/EvaluationPage";
import ServiceDetailPage from "./pages/ServiceDetailPage";
import NearbyServicesPage from "./pages/NearbyServicesPage";
import TransportReportPage from "./pages/TransportReportPage";
import NewReportPage from "./pages/transport/NewReportPage";
import UrgentReportPage from "./pages/transport/UrgentReportPage";
import PatternsPage from "./pages/transport/PatternsPage";
import MyReportsPage from "./pages/transport/MyReportsPage";
import ReferralPage from "./pages/transport/ReferralPage";
import AnalyticsDashboard from "./pages/analytics/AnalyticsDashboard";
import AdvancedAnalytics from "./pages/analytics/AdvancedAnalytics";
import UrbanReportPage from "./pages/UrbanReportPage";
import ChatReportPage from "./pages/urban/ChatReportPage";
import ManualReportPage from "./pages/urban/ManualReportPage";
import ReportHistoryPage from "./pages/urban/ReportHistoryPage";
import ServiceRecommendationsPage from "./pages/ServiceRecommendationsPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import DashboardManagement from "./pages/admin/DashboardManagement";
import ExportLogs from "./pages/admin/ExportLogs";
import { ProtectedAdminRoute } from "@/components/admin/ProtectedAdminRoute";
import { useMenu } from "@/contexts/MenuContext";
import NotFound from "./pages/NotFound";
import SearchPage from "./pages/Search";

const AppContent = () => {
  const { isMenuOpen, closeMenu } = useMenu();
  
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/splash" replace />} />
        <Route path="/splash" element={<Splash />} />
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
        <Route path="/home" element={<Home />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/ia" element={<IA />} />
        <Route path="/conversa" element={<Conversa />} />
        <Route path="/voz" element={<Voz />} />
        <Route path="/favoritos" element={<FavoritesPage />} />
          <Route path="/audiencias" element={<Audiencias />} />
          <Route path="/audiencias/:id" element={<AudienciaDetailPage />} />
          <Route path="/audiencias/:id/participar" element={<ParticipacaoPage />} />
          <Route path="/institucional/agenda" element={<AgendaCMSP />} />
          <Route path="/institucional/vereadores" element={<Vereadores />} />
          <Route path="/institucional/conheca-camara" element={<ConhecaCamara />} />
          <Route path="/institucional/camara-explica" element={<CamaraExplica />} />
          <Route path="/institucional/escola-parlamento" element={<EscolaParlamento />} />
          <Route path="/institucional/noticias" element={<Noticias />} />
          <Route path="/institucional/noticias/:id" element={<NoticiaDetailPage />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/servicos-proximos" element={<NearbyServicesPage />} />
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
          <Route path="/admin/dashboards" element={<ProtectedAdminRoute><DashboardManagement /></ProtectedAdminRoute>} />
          <Route path="/admin/exports" element={<ProtectedAdminRoute><ExportLogs /></ProtectedAdminRoute>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <MenuDrawer isOpen={isMenuOpen} onClose={closeMenu} />
    </>
  );
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <MenuProvider>
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
          </MenuProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
