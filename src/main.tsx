import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { cleanupLegacyPWA } from "./lib/cleanupLegacyPWA";

// Limpeza passiva de PWA legado (não bloqueia renderização)
cleanupLegacyPWA().catch(console.error);

// Renderizar app imediatamente
createRoot(document.getElementById("root")!).render(<App />);
