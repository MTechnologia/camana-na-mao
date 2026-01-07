import { cn } from "@/lib/utils";
import { sanitizeMessageContent } from "@/lib/sanitizeMarkers";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, MapPin, ArrowRight, RotateCcw, Bus, Calendar, Clock, Star, Building2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { AddressAutocomplete, StructuredAddress } from "@/components/address";
import InlineDatePicker from "./InlineDatePicker";
import InlineTimePicker from "./InlineTimePicker";
import InlineLinePicker from "./InlineLinePicker";
import InlineRatingPicker from "./InlineRatingPicker";
import InlineServiceTypePicker from "./InlineServiceTypePicker";
import InlineServicePicker from "./InlineServicePicker";

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
  // New picker callbacks
  onLineSelected?: (lineCode: string, lineName: string) => void;
  onDateSelected?: (date: string, displayText: string) => void;
  onTimeSelected?: (time: string, displayText: string) => void;
  onRatingSelected?: (stars: number) => void;
  onServiceTypeSelected?: (type: string, displayName: string) => void;
  onServiceSelected?: (name: string, neighborhood: string, serviceId?: string) => void;
  isLastAssistantMessage?: boolean;
}

const ChatMessageBubble = ({ 
  message, 
  userAvatarUrl, 
  userInitials, 
  onAddressSelected, 
  onJourneySwitchDecision,
  onLineSelected,
  onDateSelected,
  onTimeSelected,
  onRatingSelected,
  onServiceTypeSelected,
  onServiceSelected,
  isLastAssistantMessage = false 
}: ChatMessageBubbleProps) => {
  const isUser = message.role === "user";
  const navigate = useNavigate();
  const [addressSelected, setAddressSelected] = useState(false);
  const [decisionMade, setDecisionMade] = useState(false);
  const [lineSelected, setLineSelected] = useState(false);
  const [dateSelected, setDateSelected] = useState(false);
  const [timeSelected, setTimeSelected] = useState(false);
  const [ratingSelected, setRatingSelected] = useState(false);
  const [serviceTypeSelected, setServiceTypeSelected] = useState(false);
  const [serviceSelected, setServiceSelected] = useState(false);
  
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
  
  // Detect picker markers
  const hasLinePicker = !isUser && message.content.includes('[LINE_PICKER]');
  const hasDatePicker = !isUser && message.content.includes('[DATE_PICKER]');
  const hasTimePicker = !isUser && message.content.includes('[TIME_PICKER]');
  const hasRatingPicker = !isUser && message.content.includes('[RATING_PICKER]');
  const hasServiceTypePicker = !isUser && message.content.includes('[SERVICE_TYPE_PICKER]');
  const hasServicePicker = !isUser && message.content.includes('[SERVICE_PICKER]');
  
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
  
  // Detect line question without explicit marker
  const isAskingForLine = useMemo(() => {
    if (isUser || lineSelected || hasLinePicker) return false;
    const content = message.content.toLowerCase();
    return (
      content.includes('[field_request:line_code]') ||
      (content.includes('qual linha') && isLastAssistantMessage)
    );
  }, [isUser, message.content, lineSelected, hasLinePicker, isLastAssistantMessage]);
  
  // Detect date question without explicit marker
  const isAskingForDate = useMemo(() => {
    if (isUser || dateSelected || hasDatePicker) return false;
    const content = message.content.toLowerCase();
    return (
      content.includes('[field_request:occurrence_date]') ||
      (content.includes('quando') && content.includes('aconteceu') && isLastAssistantMessage)
    );
  }, [isUser, message.content, dateSelected, hasDatePicker, isLastAssistantMessage]);
  
  // Detect time question without explicit marker
  const isAskingForTime = useMemo(() => {
    if (isUser || timeSelected || hasTimePicker) return false;
    const content = message.content.toLowerCase();
    return (
      content.includes('[field_request:occurrence_time]') ||
      (content.includes('que horas') && isLastAssistantMessage)
    );
  }, [isUser, message.content, timeSelected, hasTimePicker, isLastAssistantMessage]);
  
  // Detect rating question without explicit marker
  const isAskingForRating = useMemo(() => {
    if (isUser || ratingSelected || hasRatingPicker) return false;
    const content = message.content.toLowerCase();
    return (
      content.includes('[field_request:rating_stars]') ||
      ((content.includes('que nota') || content.includes('de 1 a 5')) && isLastAssistantMessage)
    );
  }, [isUser, message.content, ratingSelected, hasRatingPicker, isLastAssistantMessage]);
  
  // Detect service type question
  const isAskingForServiceType = useMemo(() => {
    if (isUser || serviceTypeSelected || hasServiceTypePicker) return false;
    const content = message.content.toLowerCase();
    return (
      content.includes('[field_request:service_type]') ||
      (content.includes('qual serviço') && content.includes('ubs') && isLastAssistantMessage)
    );
  }, [isUser, message.content, serviceTypeSelected, hasServiceTypePicker, isLastAssistantMessage]);
  
  // Detect service name question
  const isAskingForService = useMemo(() => {
    if (isUser || serviceSelected || hasServicePicker) return false;
    const content = message.content.toLowerCase();
    return (
      content.includes('[field_request:service_name]') ||
      (content.includes('qual o nome') && isLastAssistantMessage)
    );
  }, [isUser, message.content, serviceSelected, hasServicePicker, isLastAssistantMessage]);
  
  // Clean content by removing markers using centralized utility
  const cleanContent = sanitizeMessageContent(message.content);
  
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
  
  const handleLineSelected = (lineCode: string, lineName: string) => {
    setLineSelected(true);
    if (onLineSelected) {
      onLineSelected(lineCode, lineName);
    }
  };
  
  const handleDateSelected = (date: string, displayText: string) => {
    setDateSelected(true);
    if (onDateSelected) {
      onDateSelected(date, displayText);
    }
  };
  
  const handleTimeSelected = (time: string, displayText: string) => {
    setTimeSelected(true);
    if (onTimeSelected) {
      onTimeSelected(time, displayText);
    }
  };
  
  const handleRatingSelected = (stars: number) => {
    setRatingSelected(true);
    if (onRatingSelected) {
      onRatingSelected(stars);
    }
  };
  
  const handleServiceTypeSelected = (type: string, displayName: string) => {
    setServiceTypeSelected(true);
    if (onServiceTypeSelected) {
      onServiceTypeSelected(type, displayName);
    }
  };
  
  const handleServiceSelected = (name: string, neighborhood: string, serviceId?: string) => {
    setServiceSelected(true);
    if (onServiceSelected) {
      onServiceSelected(name, neighborhood, serviceId);
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
            <p className="text-sm whitespace-pre-wrap">{sanitizeMessageContent(message.content)}</p>
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
        
        {/* Inline Line Picker */}
        {(hasLinePicker || isAskingForLine) && !lineSelected && isLastAssistantMessage && (
          <InlineLinePicker onSelect={handleLineSelected} />
        )}
        
        {/* Inline Date Picker */}
        {(hasDatePicker || isAskingForDate) && !dateSelected && isLastAssistantMessage && (
          <InlineDatePicker onSelect={handleDateSelected} />
        )}
        
        {/* Inline Time Picker */}
        {(hasTimePicker || isAskingForTime) && !timeSelected && isLastAssistantMessage && (
          <InlineTimePicker onSelect={handleTimeSelected} />
        )}
        
        {/* Inline Rating Picker */}
        {(hasRatingPicker || isAskingForRating) && !ratingSelected && isLastAssistantMessage && (
          <InlineRatingPicker onSelect={handleRatingSelected} />
        )}
        
        {/* Inline Service Type Picker */}
        {(hasServiceTypePicker || isAskingForServiceType) && !serviceTypeSelected && isLastAssistantMessage && (
          <InlineServiceTypePicker onSelect={handleServiceTypeSelected} />
        )}
        
        {/* Inline Service Picker */}
        {(hasServicePicker || isAskingForService) && !serviceSelected && isLastAssistantMessage && (
          <InlineServicePicker onSelect={handleServiceSelected} />
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
