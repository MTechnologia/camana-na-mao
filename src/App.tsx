import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MenuProvider } from "@/contexts/MenuContext";
import { AIProvider } from "@/contexts/AIContext";
import MenuDrawer from "@/components/MenuDrawer";
import Splash from "./pages/Splash";
import Login from "./pages/Login";
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
        <MenuProvider>
          <AIProvider>
            <AppContent />
          </AIProvider>
        </MenuProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
