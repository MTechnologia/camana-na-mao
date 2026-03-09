import React, { forwardRef, useState, useEffect, useCallback } from "react";
import { WifiOff, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OfflineModeProps {
  onRetry: () => Promise<boolean>;
}

const AUTO_RETRY_INTERVAL_S = 5;

const OfflineMode = forwardRef<HTMLDivElement, OfflineModeProps>(({ onRetry }, ref) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_RETRY_INTERVAL_S);

  const handleRetry = useCallback(async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    const success = await onRetry();
    if (!success) {
      setIsRetrying(false);
      setCountdown(AUTO_RETRY_INTERVAL_S);
    }
  }, [isRetrying, onRetry]);

  // Auto-retry countdown
  useEffect(() => {
    if (isRetrying) return;
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          handleRetry();
          return AUTO_RETRY_INTERVAL_S;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRetrying, handleRetry]);

  return (
    <div ref={ref} className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
        {isRetrying ? (
          <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
        ) : (
          <WifiOff className="w-10 h-10 text-muted-foreground" />
        )}
      </div>

      <h2 className="text-xl font-bold text-foreground mb-2 text-center">
        {isRetrying ? "Verificando conexão..." : "Você está offline"}
      </h2>
      
      <p className="text-muted-foreground text-center mb-6 max-w-sm">
        {isRetrying 
          ? "Aguarde enquanto tentamos reconectar..."
          : "Não foi possível conectar aos serviços. Tentando automaticamente..."
        }
      </p>

      <Button
        onClick={handleRetry}
        disabled={isRetrying}
        className="bg-primary hover:bg-primary/90"
      >
        {isRetrying ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <RefreshCw className="w-4 h-4 mr-2" />
        )}
        {isRetrying ? "Verificando..." : "Tentar agora"}
      </Button>

      {!isRetrying && (
        <p className="text-xs text-muted-foreground mt-3">
          Próxima tentativa em {countdown}s
        </p>
      )}

      <div className="mt-8 p-4 bg-muted rounded-xl max-w-md">
        <h3 className="font-semibold text-sm text-foreground mb-2">
          💡 Dica
        </h3>
        <p className="text-xs text-muted-foreground">
          Verifique sua conexão Wi-Fi ou dados móveis. A reconexão será automática assim que a internet voltar.
        </p>
      </div>
    </div>
  );
});

OfflineMode.displayName = "OfflineMode";

export default OfflineMode;
