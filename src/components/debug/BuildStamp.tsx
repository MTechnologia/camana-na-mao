/**
 * BuildStamp - Indicador visual de versão da build
 * Mostra timestamp para debug e verificação de cache
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bug, X, RefreshCw } from 'lucide-react';

// Declare global for TypeScript
declare const __BUILD_TIMESTAMP__: string;

const BUILD_TIMESTAMP = typeof __BUILD_TIMESTAMP__ !== 'undefined' 
  ? __BUILD_TIMESTAMP__ 
  : Date.now().toString();

const BuildStamp = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  
  // Mostrar apenas em dev ou com query param ?debug
  const isDev = import.meta.env.DEV;
  const hasDebugParam = typeof window !== 'undefined' && 
    new URLSearchParams(window.location.search).has('debug');
  
  // Detectar se está no editor
  const isInEditor = typeof window !== 'undefined' && (
    window.self !== window.top ||
    document.referrer.includes('lovable.dev/projects') ||
    window.location.hostname.includes('lovable.app')
  );
  
  if (!isDev && !hasDebugParam) {
    return null;
  }
  
  const buildDate = new Date(parseInt(BUILD_TIMESTAMP));
  const formattedDate = format(buildDate, "dd/MM/yy HH:mm:ss", { locale: ptBR });
  const shortHash = BUILD_TIMESTAMP.slice(-6);
  
  const handleForceReload = async () => {
    setIsReloading(true);
    
    // Limpar caches
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }
    
    // Desregistrar SWs
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(reg => reg.unregister()));
    }
    
    // Hard reload
    const url = new URL(window.location.href);
    url.searchParams.set('_bust', Date.now().toString());
    window.location.replace(url.toString());
  };
  
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-4 left-4 z-[9999] flex items-center gap-1.5 px-2 py-1 
                   bg-muted/80 backdrop-blur-sm rounded-full text-[10px] font-mono 
                   text-muted-foreground hover:bg-muted transition-colors shadow-sm
                   border border-border/50"
        title="Clique para ver informações da build"
      >
        <Bug className="w-3 h-3" />
        <span>v{shortHash}</span>
      </button>
    );
  }
  
  return (
    <div className="fixed bottom-4 left-4 z-[9999] p-3 bg-background/95 backdrop-blur-sm 
                    rounded-lg shadow-lg border border-border text-xs font-mono
                    min-w-[200px]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-foreground font-semibold">
          <Bug className="w-4 h-4 text-primary" />
          Debug Info
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="p-1 hover:bg-muted rounded"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      
      <div className="space-y-1 text-muted-foreground">
        <div className="flex justify-between">
          <span>Build:</span>
          <span className="text-foreground">{shortHash}</span>
        </div>
        <div className="flex justify-between">
          <span>Data:</span>
          <span className="text-foreground">{formattedDate}</span>
        </div>
        <div className="flex justify-between">
          <span>Env:</span>
          <span className="text-foreground">{import.meta.env.MODE}</span>
        </div>
        <div className="flex justify-between">
          <span>Editor:</span>
          <span className={isInEditor ? "text-amber-500" : "text-foreground"}>
            {isInEditor ? 'Sim' : 'Não'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>URL:</span>
          <span className="text-foreground truncate max-w-[120px]" title={window.location.pathname}>
            {window.location.pathname}
          </span>
        </div>
      </div>
      
      <div className="mt-3 pt-2 border-t border-border">
        <button
          onClick={handleForceReload}
          disabled={isReloading}
          className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5
                     bg-destructive/10 text-destructive rounded text-[11px]
                     hover:bg-destructive/20 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isReloading ? 'animate-spin' : ''}`} />
          {isReloading ? 'Limpando...' : 'Forçar Reload (Limpar Cache)'}
        </button>
      </div>
    </div>
  );
};

export default BuildStamp;
