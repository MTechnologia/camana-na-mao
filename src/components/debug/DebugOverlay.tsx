import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X, Bug } from "lucide-react";
import { cleanupLegacyPWA } from "@/lib/cleanupLegacyPWA";

// Build ID - atualizado a cada deploy
const BUILD_ID = "2024-12-23-v2";

export const DebugOverlay = () => {
  const { user, session, loading } = useAuth();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Só mostrar se ?debug=1 está na URL
  const params = new URLSearchParams(location.search);
  const isDebugMode = params.get("debug") === "1";

  if (!isDebugMode) return null;

  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    try {
      await cleanupLegacyPWA();
      // Adicionar timestamp para forçar revalidação
      const url = new URL(window.location.href);
      url.searchParams.set("v", Date.now().toString());
      window.location.href = url.toString();
    } catch (e) {
      console.error("Erro ao forçar atualização:", e);
      window.location.reload();
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-4 right-4 z-[9999] bg-yellow-500 text-black p-2 rounded-full shadow-lg"
        aria-label="Abrir debug"
      >
        <Bug className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-black/90 text-white p-4 rounded-lg shadow-xl text-xs font-mono max-w-xs">
      <div className="flex items-center justify-between mb-3">
        <span className="text-yellow-400 font-bold flex items-center gap-1">
          <Bug className="h-4 w-4" />
          DEBUG MODE
        </span>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-400 hover:text-white"
          aria-label="Fechar debug"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-400">Build ID:</span>
          <span className="text-green-400">{BUILD_ID}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Pathname:</span>
          <span className="text-blue-400">{location.pathname}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">authLoading:</span>
          <span className={loading ? "text-yellow-400" : "text-green-400"}>
            {String(loading)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">user.id:</span>
          <span className={user?.id ? "text-green-400" : "text-red-400"}>
            {user?.id ? user.id.slice(0, 8) + "..." : "null"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">session:</span>
          <span className={session ? "text-green-400" : "text-red-400"}>
            {session ? "✓ ativo" : "✗ null"}
          </span>
        </div>
      </div>

      <Button
        onClick={handleForceRefresh}
        disabled={isRefreshing}
        variant="outline"
        size="sm"
        className="w-full mt-4 bg-yellow-500/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
        {isRefreshing ? "Atualizando..." : "Forçar Atualização"}
      </Button>
    </div>
  );
};
