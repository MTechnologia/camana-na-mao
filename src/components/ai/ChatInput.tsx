import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, ArrowUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  onFocus?: () => void;
  autoFocus?: boolean;
  draftKey?: string | null;
}

const ChatInput = ({
  onSendMessage,
  disabled,
  placeholder = "Pergunte qualquer coisa...",
  onFocus,
  autoFocus = true,
  draftKey,
}: ChatInputProps) => {
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasLoadedDraftRef = useRef(false);
  const { toast } = useToast();

  const draftStorageKey = `cmsp_chat_input_draft_${draftKey || "new"}`;

  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto";
    const maxHeight = 120;
    const next = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${Math.max(next, 44)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, []);

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

  // Load draft once per draftKey
  useEffect(() => {
    if (hasLoadedDraftRef.current) return;
    hasLoadedDraftRef.current = true;

    try {
      const stored = sessionStorage.getItem(draftStorageKey);
      if (stored) {
        setInputValue(stored);
        // Let React paint before measuring
        requestAnimationFrame(() => adjustTextareaHeight());
      }
    } catch {
      // ignore
    }
  }, [draftStorageKey, adjustTextareaHeight]);

  // Persist draft while typing (prevents losing text on refresh)
  useEffect(() => {
    try {
      const t = window.setTimeout(() => {
        sessionStorage.setItem(draftStorageKey, inputValue);
      }, 250);
      return () => window.clearTimeout(t);
    } catch {
      return;
    }
  }, [draftStorageKey, inputValue]);

  // Auto-grow textarea
  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue, adjustTextareaHeight]);

  const handleSend = () => {
    if (inputValue.trim() && !disabled) {
      onSendMessage(inputValue.trim());
      setInputValue("");
      try {
        sessionStorage.removeItem(draftStorageKey);
      } catch {
        // ignore
      }
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

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Input with microphone */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onInput={adjustTextareaHeight}
            onKeyPress={handleKeyPress}
            onFocus={onFocus}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full rounded-2xl border-2 border-border bg-card pl-3 sm:pl-4 pr-10 sm:pr-12 py-3 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted-foreground overflow-y-auto"
            style={{ maxHeight: "120px" }}
          />
          
          {/* Microphone button for dictation - aligned to center vertically */}
          <button
            onClick={toggleDictation}
            disabled={disabled}
            className={`absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 rounded-full transition-all ${
              isRecording 
                ? "text-white bg-primary animate-pulse" 
                : "text-muted-foreground hover:text-primary-foreground hover:bg-primary"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label="Ditado por voz"
            title="Clique para ditar"
          >
            <Mic className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />
          </button>
        </div>

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={disabled || !inputValue.trim()}
          size="icon"
          className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-foreground hover:bg-foreground/90 text-background shrink-0 transition-transform active:scale-95 disabled:opacity-50"
          aria-label="Enviar mensagem"
          title="Enviar mensagem"
        >
          <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
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
