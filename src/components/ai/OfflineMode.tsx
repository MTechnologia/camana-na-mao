import React, { forwardRef } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const OfflineMode = forwardRef<HTMLDivElement>((_, ref) => {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div ref={ref} className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <WifiOff className="w-10 h-10 text-muted-foreground" />
      </div>

      <h2 className="text-xl font-bold text-foreground mb-2 text-center">
        Você está offline
      </h2>
      
      <p className="text-muted-foreground text-center mb-6 max-w-sm">
        Não foi possível conectar aos serviços. Algumas funcionalidades podem estar limitadas.
      </p>

      <Button
        onClick={handleRetry}
        className="bg-primary hover:bg-primary/90"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Tentar novamente
      </Button>

      <div className="mt-8 p-4 bg-muted rounded-xl max-w-md">
        <h3 className="font-semibold text-sm text-foreground mb-2">
          💡 Dica
        </h3>
        <p className="text-xs text-muted-foreground">
          Verifique sua conexão Wi-Fi ou dados móveis e tente novamente. Todas as funcionalidades requerem conexão com a internet.
        </p>
      </div>
    </div>
  );
});

OfflineMode.displayName = "OfflineMode";

export default OfflineMode;
