import { useState, useRef, useEffect } from "react";
import { Mic, AudioWaveform } from "lucide-react";
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
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 z-30">
      <div className="max-w-4xl mx-auto flex items-center gap-3">
        {/* Input with blue accent line */}
        <div className="flex-1 relative">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Pergunte qualquer coisa ou selecione um tema acima"
            disabled={disabled}
            rows={1}
            className="w-full rounded-2xl border-2 border-border bg-card pl-4 pr-12 py-3.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted-foreground"
            style={{ maxHeight: "120px" }}
          />
          
          {/* Microphone button for dictation - outline style */}
          <button
            onClick={toggleDictation}
            disabled={disabled}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all ${
              isRecording 
                ? "text-red-500 bg-red-50 animate-pulse" 
                : "text-muted-foreground hover:text-primary hover:bg-accent"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label="Ditado por voz"
            title="Clique para ditar"
          >
            <Mic className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {/* Voice mode button - dark rounded square */}
        <Button
          onClick={handleVoiceMode}
          size="icon"
          className="h-12 w-12 rounded-xl bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-800 dark:hover:bg-gray-700 shrink-0"
          aria-label="Modo conversa por voz"
          title="Conversa completa por voz"
        >
          <AudioWaveform className="w-5 h-5" />
        </Button>
      </div>

      {isRecording && (
        <p className="text-center text-xs text-red-500 mt-2 animate-pulse">
          🎤 Gravando... Fale agora
        </p>
      )}
    </div>
  );
};

export default ChatInput;
