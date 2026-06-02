import { ReactNode, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { VereadorSidebar } from "@/components/vereador/VereadorSidebar";

interface VereadorLayoutProps {
  children: ReactNode;
}

const titlesByPath: Record<string, string> = {
  "/gabinete": "Dashboard do Gabinete",
  "/gabinete/manifestacoes": "Manifestações em Aberto",
  "/gabinete/encaminhamentos": "Encaminhamentos",
};

export const VereadorLayout = ({ children }: VereadorLayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();

  const pageTitle = useMemo(
    () => titlesByPath[location.pathname] || "Gabinete",
    [location.pathname],
  );

  return (
    <div className="min-h-screen flex w-full overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      <VereadorSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} isMobile={isMobile} />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="h-16 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 md:px-6 flex items-center gap-3">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-lg font-semibold">{pageTitle}</h1>
            <p className="text-xs text-muted-foreground">
              Acompanhe manifestações e encaminhamentos do gabinete.
            </p>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto overflow-x-hidden">
          <div className="max-w-screen-2xl mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  );
};
