import { useState, useRef, useEffect } from "react";
import { Mic, AudioWaveform, ArrowUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  onFocus?: () => void;
  autoFocus?: boolean;
}

const ChatInput = ({ onSendMessage, disabled, placeholder = "Pergunte qualquer coisa...", onFocus, autoFocus = true }: ChatInputProps) => {
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const hasText = inputValue.trim().length > 0;

  // Auto-focus when disabled changes from true to false (agent finished responding)
  useEffect(() => {
    if (!disabled && autoFocus && textareaRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [disabled, autoFocus]);

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

  const handleActionButtonClick = () => {
    if (hasText) {
      handleSend();
    } else {
      handleVoiceMode();
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Input with microphone */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={onFocus}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full rounded-2xl border-2 border-border bg-card pl-3 sm:pl-4 pr-10 sm:pr-12 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted-foreground"
            style={{ maxHeight: "120px" }}
          />
          
          {/* Microphone button for dictation */}
          <button
            onClick={toggleDictation}
            disabled={disabled}
            className={`absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 rounded-full transition-all ${
              isRecording 
                ? "text-red-500 bg-red-50 animate-pulse" 
                : "text-muted-foreground hover:text-primary hover:bg-accent"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label="Ditado por voz"
            title="Clique para ditar"
          >
            <Mic className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />
          </button>
        </div>

        {/* Dynamic action button: Voice mode (empty) or Send (with text) */}
        <Button
          onClick={handleActionButtonClick}
          disabled={disabled}
          size="icon"
          className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-foreground hover:bg-foreground/90 text-background shrink-0 transition-transform active:scale-95"
          aria-label={hasText ? "Enviar mensagem" : "Modo conversa por voz"}
          title={hasText ? "Enviar mensagem" : "Conversa completa por voz"}
        >
          {hasText ? (
            <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : (
            <AudioWaveform className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
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
