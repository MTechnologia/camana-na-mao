import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { cleanupLegacyPWA, logPWADiagnostics } from "./lib/cleanupLegacyPWA";

// Executar limpeza de PWA legado antes de renderizar
(async () => {
  // Log de diagnóstico para debug
  await logPWADiagnostics();
  
  // Tentar limpar SW/caches legados
  const willReload = await cleanupLegacyPWA();
  
  // Se vai recarregar, não renderizar (evita flash)
  if (willReload) {
    return;
  }
  
  // Renderizar app normalmente
  createRoot(document.getElementById("root")!).render(<App />);
})();
