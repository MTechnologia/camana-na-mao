import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { cleanupLegacyPWA } from "./lib/cleanupLegacyPWA";
import { installStaleChunkHandler } from "./lib/handleStaleChunks";

// Detecta chunks stale (deploy substituiu bundles) e força reload automático
// para evitar tela branca após deploy. Idempotente.
installStaleChunkHandler();

// Limpeza passiva de PWA legado (não bloqueia renderização)
cleanupLegacyPWA().catch(console.error);

// Em dev, use VITE_DISABLE_STRICT_MODE=true no .env para desativar Strict Mode
// e evitar efeitos duplos / refreshs que atrapalham debugar no console
const useStrict = !(import.meta.env.DEV && import.meta.env.VITE_DISABLE_STRICT_MODE === "true");
const root = createRoot(document.getElementById("root")!);

if (useStrict) {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} else {
  root.render(<App />);
}
