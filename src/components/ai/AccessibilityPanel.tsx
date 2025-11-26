import { useState } from "react";
import { Settings, Type, BookOpen, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccessibility } from "@/hooks/useAccessibility";

const AccessibilityPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { fontSize, readingMode, textSpacing, setFontSize, toggleReadingMode, toggleTextSpacing } = useAccessibility();

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-4 top-20 z-50 w-12 h-12 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Abrir painel de acessibilidade"
      >
        <Settings className="w-5 h-5" />
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div
              className="fixed right-4 top-36 z-50 w-72 bg-card border border-border rounded-2xl shadow-2xl p-6"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
            >
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Acessibilidade
              </h3>

              {/* Font Size */}
              <div className="mb-4">
                <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                  <Type className="w-4 h-4" />
                  Tamanho da fonte
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFontSize("small")}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm ${
                      fontSize === "small" ? "bg-primary text-white" : "bg-secondary text-foreground"
                    }`}
                    aria-label="Fonte pequena"
                  >
                    A
                  </button>
                  <button
                    onClick={() => setFontSize("medium")}
                    className={`flex-1 py-2 px-3 rounded-lg border text-base ${
                      fontSize === "medium" ? "bg-primary text-white" : "bg-secondary text-foreground"
                    }`}
                    aria-label="Fonte média"
                  >
                    A
                  </button>
                  <button
                    onClick={() => setFontSize("large")}
                    className={`flex-1 py-2 px-3 rounded-lg border text-lg ${
                      fontSize === "large" ? "bg-primary text-white" : "bg-secondary text-foreground"
                    }`}
                    aria-label="Fonte grande"
                  >
                    A
                  </button>
                </div>
              </div>

              {/* Reading Mode */}
              <div className="mb-4">
                <button
                  onClick={toggleReadingMode}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    readingMode ? "bg-primary text-white" : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                  aria-label="Modo leitura"
                  aria-pressed={readingMode}
                >
                  <BookOpen className="w-5 h-5" />
                  <span className="text-sm font-medium">Modo leitura</span>
                </button>
              </div>

              {/* Text Spacing */}
              <div>
                <button
                  onClick={toggleTextSpacing}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    textSpacing ? "bg-primary text-white" : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                  aria-label="Espaçamento de texto"
                  aria-pressed={textSpacing}
                >
                  <Maximize2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Espaçamento ampliado</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default AccessibilityPanel;
