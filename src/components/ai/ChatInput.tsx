import { useState, useRef, useEffect } from "react";
import { Mic, Volume2, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

const ChatInput = ({ onSendMessage, disabled }: ChatInputProps) => {
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Initialize Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'pt-BR';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result) => result.transcript)
          .join('');
        setInputValue(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        toast({
          title: "Erro no reconhecimento de voz",
          description: "Não foi possível capturar sua voz. Tente digitar sua mensagem.",
          variant: "destructive",
        });
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);

  const handleSend = () => {
    if (inputValue.trim() && !disabled) {
      onSendMessage(inputValue.trim());
      setInputValue("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleDictation = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Recurso não disponível",
        description: "Seu navegador não suporta reconhecimento de voz.",
        variant: "destructive",
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleVoiceMode = () => {
    navigate("/voz");
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border p-4 z-30">
      <div className="max-w-4xl mx-auto flex items-end gap-2">
        {/* Main Input Container */}
        <div className="flex-1 relative">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            disabled={disabled}
            rows={1}
            className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 pr-12 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: "48px", maxHeight: "120px" }}
          />
          
          {/* Dictation Button (inside input) */}
          <button
            onClick={toggleDictation}
            disabled={disabled}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors ${
              isRecording
                ? "bg-red-500 text-white animate-pulse"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label="Ditado por voz"
            title="Clique para ditar sua mensagem"
          >
            <Mic size={20} />
          </button>
        </div>

        {/* Voice Mode Button */}
        <Button
          onClick={handleVoiceMode}
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full shrink-0"
          aria-label="Modo conversa por voz"
          title="Conversa completa por voz"
        >
          <Volume2 size={20} />
        </Button>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!inputValue.trim() || disabled}
          size="icon"
          className="h-12 w-12 rounded-full shrink-0"
          aria-label="Enviar mensagem"
        >
          <Send size={20} />
        </Button>
      </div>

      {isRecording && (
        <p className="text-center text-sm text-red-500 mt-2 animate-pulse">
          🎤 Gravando... Fale agora
        </p>
      )}
    </div>
  );
};

export default ChatInput;
