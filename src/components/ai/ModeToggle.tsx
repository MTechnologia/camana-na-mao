import { Keyboard, Mic } from "lucide-react";
import { motion } from "framer-motion";

interface ModeToggleProps {
  mode: "text" | "voice";
  onModeChange: (mode: "text" | "voice") => void;
}

const ModeToggle = ({ mode, onModeChange }: ModeToggleProps) => {
  return (
    <div className="flex flex-col items-center gap-2 mb-4">
      <div className="relative bg-secondary/50 rounded-full p-1 flex items-center">
        <motion.div
          className="absolute h-10 rounded-full bg-primary"
          animate={{
            left: mode === "text" ? 4 : "50%",
            right: mode === "voice" ? 4 : "50%",
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
        
        <button
          onClick={() => onModeChange("text")}
          className={`relative z-10 flex items-center gap-2 px-6 py-2 rounded-full transition-colors ${
            mode === "text" ? "text-white" : "text-muted-foreground"
          }`}
          aria-label="Modo texto"
        >
          <Keyboard className="w-4 h-4" />
          <span className="text-sm font-medium">Texto</span>
        </button>
        
        <button
          onClick={() => onModeChange("voice")}
          className={`relative z-10 flex items-center gap-2 px-6 py-2 rounded-full transition-colors ${
            mode === "voice" ? "text-white" : "text-muted-foreground"
          }`}
          aria-label="Modo voz"
        >
          <Mic className="w-4 h-4" />
          <span className="text-sm font-medium">Voz</span>
        </button>
      </div>
      
      <p className="text-xs text-muted-foreground">
        {mode === "text" ? "💬 Digite sua mensagem" : "🎤 Fale com o assistente"}
      </p>
    </div>
  );
};

export default ModeToggle;
