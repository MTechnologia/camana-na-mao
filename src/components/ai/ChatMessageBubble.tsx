import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, MapPin, ArrowRight, RotateCcw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { AddressAutocomplete, StructuredAddress } from "@/components/address";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: string | Date;
  source?: string;
}

const formatTimestamp = (timestamp: string | Date | undefined): string => {
  if (!timestamp) return '';
  
  if (typeof timestamp === 'string') {
    // Se já está formatado (ex: "20:27"), usar direto
    if (/^\d{2}:\d{2}$/.test(timestamp)) {
      return timestamp;
    }
    // Se for ISO string, formatar
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return format(date, "HH:mm", { locale: ptBR });
    }
    return '';
  }
  
  if (timestamp instanceof Date && !isNaN(timestamp.getTime())) {
    return format(timestamp, "HH:mm", { locale: ptBR });
  }
  
  return '';
};

// Human-readable journey names
const JOURNEY_NAMES: Record<string, string> = {
  'urban_report': 'Relato Urbano',
  'transport_report': 'Diagnóstico de Transporte',
  'service_rating': 'Avaliação de Serviço',
  'services': 'Busca de Serviços',
  'general': 'Dúvidas Gerais'
};

interface ChatMessageBubbleProps {
  message: ChatMessage;
  userAvatarUrl?: string | null;
  userInitials?: string;
  onAddressSelected?: (address: StructuredAddress) => void;
  onJourneySwitchDecision?: (decision: 'switch' | 'continue', newJourney?: string) => void;
  isLastAssistantMessage?: boolean;
}

const ChatMessageBubble = ({ 
  message, 
  userAvatarUrl, 
  userInitials, 
  onAddressSelected, 
  onJourneySwitchDecision,
  isLastAssistantMessage = false 
}: ChatMessageBubbleProps) => {
  const isUser = message.role === "user";
  const navigate = useNavigate();
  const [addressSelected, setAddressSelected] = useState(false);
  const [decisionMade, setDecisionMade] = useState(false);
  
  // Detect journey switch prompt marker: [JOURNEY_SWITCH_PROMPT:new_journey:current_journey]
  const journeySwitchMatch = useMemo(() => {
    if (isUser || decisionMade) return null;
    const match = message.content.match(/\[JOURNEY_SWITCH_PROMPT:(\w+):(\w+)\]/);
    if (match) {
      return { newJourney: match[1], currentJourney: match[2] };
    }
    return null;
  }, [isUser, message.content, decisionMade]);
  
  // Check if message contains [ADDRESS_PICKER] marker OR asks for CEP/address
  const hasAddressPicker = !isUser && message.content.includes('[ADDRESS_PICKER]');
  
  // Detect if the message is asking for CEP or address (for inline autocomplete)
  const isAskingForAddress = useMemo(() => {
    if (isUser || addressSelected) return false;
    
    const content = message.content.toLowerCase();
    
    // Check for explicit field request marker
    if (message.content.includes('[FIELD_REQUEST:cep]')) return true;
    
    // Check for CEP question patterns
    const cepPatterns = [
      'qual o cep',
      'qual é o cep',
      'cep do local',
      'me diz o cep',
      'informe o cep',
    ];
    
    // Check for address question patterns (when user doesn't know CEP)
    const addressPatterns = [
      'qual a rua',
      'qual é a rua', 
      'qual o endereço',
      'qual é o endereço',
      'me diz a rua',
      'me diz o endereço',
      'se não souber, me diz a rua',
      'se não souber o cep',
    ];
    
    const isCepQuestion = cepPatterns.some(p => content.includes(p));
    const isAddressQuestion = addressPatterns.some(p => content.includes(p));
    
    return (isCepQuestion || isAddressQuestion) && isLastAssistantMessage;
  }, [isUser, message.content, addressSelected, isLastAssistantMessage]);
  
  // Clean content by removing markers
  const cleanContent = message.content
    .replace(/\[ADDRESS_PICKER\]/g, '')
    .replace(/\[FIELD_REQUEST:\w+\]/g, '')
    .replace(/\[JOURNEY_SWITCH_PROMPT:\w+:\w+\]/g, '')
    .trim();
  
  const handleAddressSelected = (address: StructuredAddress) => {
    setAddressSelected(true);
    if (onAddressSelected) {
      onAddressSelected(address);
    }
  };
  
  const handleJourneyDecision = (decision: 'switch' | 'continue') => {
    setDecisionMade(true);
    if (onJourneySwitchDecision && journeySwitchMatch) {
      onJourneySwitchDecision(decision, decision === 'switch' ? journeySwitchMatch.newJourney : undefined);
    }
  };
  
  return (
    <div
      className={cn(
        "flex gap-3 items-start",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      {isUser ? (
        <Avatar className="shrink-0 h-8 w-8">
          <AvatarImage src={userAvatarUrl || undefined} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {userInitials || "?"}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-muted">
          <Bot className="h-4 w-4" />
        </div>
      )}

      {/* Message Content */}
      <div
        className={cn(
          "flex flex-col gap-1 max-w-[75%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "px-4 py-3 rounded-2xl",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          )}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="text-sm mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="text-sm list-disc pl-4 mb-2">{children}</ul>,
                  ol: ({ children }) => <ol className="text-sm list-decimal pl-4 mb-2">{children}</ol>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  a: ({ href, children }) => {
                    // Check if internal link
                    const isInternal = href?.startsWith('/') && !href?.startsWith('//');
                    if (isInternal) {
                      return (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(href || '/');
                          }}
                          className="text-primary underline underline-offset-2 hover:text-primary/80 font-medium cursor-pointer"
                        >
                          {children}
                        </button>
                      );
                    }
                    return (
                      <a 
                        href={href} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-2 hover:text-primary/80 font-medium"
                      >
                        {children}
                      </a>
                    );
                  },
                  code: ({ children }) => (
                    <code className="bg-background/50 px-1 py-0.5 rounded text-xs">
                      {children}
                    </code>
                  ),
                }}
              >
                {cleanContent}
              </ReactMarkdown>
            </div>
          )}
        </div>
        
        {/* Inline Address Autocomplete - shown when asking for CEP/address */}
        {(isAskingForAddress || hasAddressPicker) && !addressSelected && (
          <div className="mt-2 w-full min-w-[280px] max-w-[320px]">
            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>Buscar endereço:</span>
            </div>
            <AddressAutocomplete
              onSelect={handleAddressSelected}
              placeholder="Digite rua, bairro ou CEP..."
              className="w-full"
            />
          </div>
        )}
        
        {/* Show confirmation when address was selected */}
        {addressSelected && (
          <div className="mt-2 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
            <MapPin className="h-3 w-3" />
            <span>Endereço selecionado ✓</span>
          </div>
        )}
        
        {/* Journey Switch Confirmation Buttons */}
        {journeySwitchMatch && isLastAssistantMessage && !decisionMade && (
          <div className="mt-3 flex flex-col gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => handleJourneyDecision('switch')}
              className="w-full justify-between"
            >
              <span>Sim, iniciar {JOURNEY_NAMES[journeySwitchMatch.newJourney] || journeySwitchMatch.newJourney}</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleJourneyDecision('continue')}
              className="w-full justify-between"
            >
              <span>Não, continuar {JOURNEY_NAMES[journeySwitchMatch.currentJourney] || journeySwitchMatch.currentJourney}</span>
              <RotateCcw className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
        
        {/* Show confirmation when journey decision was made */}
        {decisionMade && journeySwitchMatch && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span>Decisão registrada ✓</span>
          </div>
        )}
        
        {formatTimestamp(message.timestamp) && (
          <span className="text-xs text-muted-foreground px-2">
            {formatTimestamp(message.timestamp)}
          </span>
        )}
      </div>
    </div>
  );
};

export default ChatMessageBubble;
