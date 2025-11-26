import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MenuProvider } from "@/contexts/MenuContext";
import { AIProvider } from "@/contexts/AIContext";
import { AuthProvider } from "@/contexts/AuthContext";
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
import Home from "./pages/Home";
import IA from "./pages/IA";
import Conversa from "./pages/Conversa";
import Voz from "./pages/Voz";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import { useMenu } from "@/contexts/MenuContext";

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
        <Route path="/profile/demographics" element={<DemographicsPage />} />
        <Route path="/profile/address" element={<AddressPage />} />
        <Route path="/profile/preferences" element={<PreferencesPage />} />
        <Route path="/home" element={<Home />} />
        <Route path="/ia" element={<IA />} />
        <Route path="/conversa" element={<Conversa />} />
        <Route path="/voz" element={<Voz />} />
        <Route path="/notifications" element={<Notifications />} />
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
            <AIProvider>
              <AppContent />
            </AIProvider>
          </MenuProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
