import { cn } from "@/lib/utils";
import { sanitizeMessageContent } from "@/lib/sanitizeMarkers";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, MapPin, ArrowRight, RotateCcw, Bus, Calendar, Clock, Star, Building2, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { AddressAutocomplete, StructuredAddress } from "@/components/address";
import { ZONAS_SAO_PAULO, localParaZona } from "@/lib/audienciaZonas";
import { extrairEmailDeMaisInformacoes, normalizarConvidadosParaExibicao } from "@/lib/audienciaDisplay";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import InlineDatePicker from "./InlineDatePicker";
import InlineTimePicker from "./InlineTimePicker";
import InlineLinePicker from "./InlineLinePicker";
import InlineRatingPicker from "./InlineRatingPicker";
import InlineLocationMethodPicker from "./InlineLocationMethodPicker";
import InlineServiceTypePicker from "./InlineServiceTypePicker";
import InlineServicePicker from "./InlineServicePicker";
import InlineAddressConfirm from "./InlineAddressConfirm";
import PromptChips, { CollectionTypePreset } from "./PromptChips";
import { AudienciaInscricaoInline } from "./AudienciaInscricaoInline";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

/** Valor usado no Select para "qualquer"; Radix Select não aceita value="". */
const AUDIENCIA_CHAT_ANY = "__any__";

const AUDIENCIA_CHAT_TEMAS = [
  { id: AUDIENCIA_CHAT_ANY, label: "Qualquer tema" },
  { id: "Mobilidade", label: "Mobilidade" },
  { id: "Educação", label: "Educação" },
  { id: "Saúde", label: "Saúde" },
  { id: "Meio Ambiente", label: "Meio Ambiente" },
  { id: "Cultura", label: "Cultura" },
  { id: "Segurança", label: "Segurança" },
];

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
  'audiencias': 'Audiências Públicas',
  'history': 'Meu Histórico',
  'general': 'Dúvidas Gerais',
  'vereadores': 'Vereadores da Região',
  'noticias': 'Notícias Legislativas',
  'chamber_feedback': 'Feedback sobre Vereador'
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
  onLocationMethodSelected?: (method: string, messageToSend: string) => void;
  onServiceTypeSelected?: (type: string, displayName: string) => void;
  onServiceSelected?: (name: string, neighborhood: string, address: string, serviceId?: string) => void;
  onServiceAddressConfirmed?: (confirmed: boolean) => void;
  isLastAssistantMessage?: boolean;
  /** Envia os filtros atuais para a IA trazer a listagem filtrada (nova mensagem no chat). */
  onRequestAudienciasWithFilters?: (filters: { tema: string; regiao: string; dateFrom: string; dateTo: string }) => void;
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
  onLocationMethodSelected,
  onServiceTypeSelected,
  onServiceSelected,
  onServiceAddressConfirmed,
  isLastAssistantMessage = false,
  onChipSelect,
  onOpenDiscovery,
  onRequestAudienciasWithFilters,
}: ChatMessageBubbleProps) => {
  const isUser = message.role === "user";
  const navigate = useNavigate();
  const [addressSelected, setAddressSelected] = useState(false);
  const [decisionMade, setDecisionMade] = useState(false);
  const [lineSelected, setLineSelected] = useState(false);
  const [dateSelected, setDateSelected] = useState(false);
  const [timeSelected, setTimeSelected] = useState(false);
  const [ratingSelected, setRatingSelected] = useState(false);
  const [locationMethodSelected, setLocationMethodSelected] = useState(false);
  const [serviceTypeSelected, setServiceTypeSelected] = useState(false);
  const [serviceSelected, setServiceSelected] = useState(false);
  const [serviceAddressConfirmed, setServiceAddressConfirmed] = useState(false);
  const [contentExpanded, setContentExpanded] = useState(false);
  const [showAudienciaInscricaoInline, setShowAudienciaInscricaoInline] = useState(false);
  const [showAudienciasFilters, setShowAudienciasFilters] = useState(false);
  const [audienciaChatTema, setAudienciaChatTema] = useState("");
  const [audienciaChatRegiao, setAudienciaChatRegiao] = useState("");
  const [audienciaChatDateFrom, setAudienciaChatDateFrom] = useState("");
  const [audienciaChatDateTo, setAudienciaChatDateTo] = useState("");

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
  const hasLocationMethodPicker = !isUser && /\[\s*LOCATION_METHOD_PICKER\s*\]/.test(message.content);
  const hasServiceTypePicker = !isUser && message.content.includes('[SERVICE_TYPE_PICKER]');
  const hasServicePicker = !isUser && message.content.includes('[SERVICE_PICKER]');
  const hasServiceAddressConfirm = !isUser && message.content.includes('[SERVICE_ADDRESS_CONFIRM]');

  // Listagem de audiências com filtros (tema, data, região): mostrar sempre que o assistente falar de audiências.
  const shouldShowAudienciasCta = useMemo(() => {
    if (isUser || !isLastAssistantMessage) return false;
    const content = message.content.toLowerCase();
    const hasAudienciasContext = content.includes('audiên') || content.includes('audienc');
    return hasAudienciasContext;
  }, [isUser, isLastAssistantMessage, message.content]);

  // Dados para listagem filtrada no chat (tema, data, região) — query dedicada, ordem ascendente para próximas primeiro.
  const { data: audienciasData = [] } = useQuery({
    queryKey: ["audiencias-chat"],
    queryFn: async () => {
      const all: { id: string; titulo: string; descricao: string | null; data: string; hora: string | null; local: string; tema: string; status: string; comissao: string | null; convidados: string | null; projeto_referencia: string | null; link_transmissao: string | null; mais_informacoes: string | null }[] = [];
      let offset = 0;
      const pageSize = 500;
      while (true) {
        const { data, error } = await supabase
          .from("audiencias")
          .select("id, titulo, descricao, data, hora, local, tema, status, comissao, convidados, projeto_referencia, link_transmissao, mais_informacoes")
          .order("data", { ascending: true })
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        const page = (data || []) as typeof all;
        all.push(...page);
        if (page.length < pageSize) break;
        offset += pageSize;
      }
      return all;
    },
    staleTime: 5 * 60 * 1000,
    enabled: shouldShowAudienciasCta,
  });

  const audienciasFiltradasNoChat = useMemo(() => {
    if (!audienciasData.length) return [];
    const todayStr = new Date().toISOString().slice(0, 10);
    const filtered = audienciasData.filter((a) => {
      const tema = (a.tema || "").toLowerCase();
      const title = (a.titulo || "").toLowerCase();
      const desc = (a.descricao || "").toLowerCase();
      const matchesTheme =
        !audienciaChatTema ||
        tema.includes(audienciaChatTema.toLowerCase()) ||
        title.includes(audienciaChatTema.toLowerCase()) ||
        desc.includes(audienciaChatTema.toLowerCase());
      const zona = localParaZona(a.local);
      const matchesRegion = !audienciaChatRegiao || zona === audienciaChatRegiao;
      const itemDate = (a.data || "").slice(0, 10);
      const matchesDate =
        (!audienciaChatDateFrom && !audienciaChatDateTo) ||
        (audienciaChatDateFrom && audienciaChatDateTo && itemDate >= audienciaChatDateFrom && itemDate <= audienciaChatDateTo) ||
        (audienciaChatDateFrom && !audienciaChatDateTo && itemDate >= audienciaChatDateFrom) ||
        (!audienciaChatDateFrom && audienciaChatDateTo && itemDate <= audienciaChatDateTo);
      const isUpcoming = a.data >= todayStr;
      return matchesTheme && matchesRegion && matchesDate && isUpcoming;
    });
    return [...filtered].sort((a, b) => (a.data || "").localeCompare(b.data || "")).slice(0, 5);
  }, [audienciasData, audienciaChatTema, audienciaChatRegiao, audienciaChatDateFrom, audienciaChatDateTo]);
  
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
  
  // Detect "como informar localização" so we show the 3 buttons even if backend didn't send the marker
  const isAskingForLocationMethod = useMemo(() => {
    if (isUser || locationMethodSelected || hasLocationMethodPicker) return false;
    const content = message.content.toLowerCase();
    return (
      (content.includes('como você quer informar sua localização') ||
       content.includes('como quer informar sua localização') ||
       content.includes('informar sua localização para buscar')) &&
      isLastAssistantMessage
    );
  }, [isUser, message.content, locationMethodSelected, hasLocationMethodPicker, isLastAssistantMessage]);

  // Clean content: remove ALL markers so they never show as text (LOCATION_METHOD_PICKER etc.)
  const cleanContent = useMemo(() => {
    let text = sanitizeMessageContent(message.content);
    text = text.replace(/\[\s*LOCATION_METHOD_PICKER\s*\]/g, '');
    text = text.replace(/\[LOCATION_METHOD_PICKER\]/g, '');
    // Garantir que o marcador de chips nunca apareça como texto (defesa em profundidade)
    text = text.split('[SHOW_SERVICES_CHIPS]').join('').trim();
    return text.trim();
  }, [message.content]);

  const isLongContent = cleanContent.length > 450;
  const showVerMais = !isUser && isLongContent;

  // Split para colocar Documentos e Convidados acima de "Quer saber mais sobre alguma ou inscrever-se?"
  const audienciaContentSplit = useMemo(() => {
    const needle = "Quer saber mais sobre alguma ou inscrever-se?";
    const idx = cleanContent.indexOf(needle);
    if (idx < 0) return { contentBefore: cleanContent, contentAfter: null as string | null };
    return {
      contentBefore: cleanContent.slice(0, idx).trim(),
      contentAfter: cleanContent.slice(idx).trim(),
    };
  }, [cleanContent]);
  // Mostrar chips quando o backend enviou o marcador OU quando a mensagem é a resposta "off-topic" (fallback)
  const hasShowServicesChips = !isUser && (
    message.content.includes('[SHOW_SERVICES_CHIPS]') ||
    message.content.includes('o intuito deste canal é poder te ajudar com estes serviços')
  );

  const handleAddressSelected = (address: StructuredAddress) => {
    setAddressSelected(true);
    if (onAddressSelected) {
      onAddressSelected(address);
    }
  };
  
  const handleJourneyDecision = (decision: 'switch' | 'continue') => {
    setDecisionMade(true);
    if (onJourneySwitchDecision && journeySwitchMatch) {
      // Always pass newJourney so we can track which journey was declined
      onJourneySwitchDecision(decision, journeySwitchMatch.newJourney);
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
  
  const handleLocationMethodSelected = (method: string, messageToSend: string) => {
    setLocationMethodSelected(true);
    if (onLocationMethodSelected) {
      onLocationMethodSelected(method, messageToSend);
    }
  };

  const handleServiceTypeSelected = (type: string, displayName: string) => {
    setServiceTypeSelected(true);
    if (onServiceTypeSelected) {
      onServiceTypeSelected(type, displayName);
    }
  };
  
  const handleServiceSelected = (name: string, neighborhood: string, address: string, serviceId?: string) => {
    setServiceSelected(true);
    if (onServiceSelected) {
      onServiceSelected(name, neighborhood, address, serviceId);
    }
  };
  
  const handleServiceAddressConfirmed = (confirmed: boolean) => {
    setServiceAddressConfirmed(true);
    if (onServiceAddressConfirmed) {
      onServiceAddressConfirmed(confirmed);
    }
  };
  
  // Extract address from [SERVICE_ADDRESS_CONFIRM:address] marker
  const serviceAddressToConfirm = useMemo(() => {
    if (!hasServiceAddressConfirm) return null;
    const match = message.content.match(/\[SERVICE_ADDRESS_CONFIRM:([^\]]+)\]/);
    return match ? match[1] : null;
  }, [hasServiceAddressConfirm, message.content]);
  
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
            <div className="w-full">
              <div
                className={cn(
                  "prose prose-sm dark:prose-invert max-w-none",
                  showVerMais && !contentExpanded && "line-clamp-6"
                )}
              >
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="text-sm mb-2 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="text-sm list-disc pl-4 mb-2">{children}</ul>,
                    ol: ({ children }) => <ol className="text-sm list-decimal pl-4 mb-2">{children}</ol>,
                    li: ({ children }) => <li className="mb-1">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    a: ({ href, children }) => {
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
                  {audienciaContentSplit.contentAfter === null
                    ? cleanContent
                    : audienciaContentSplit.contentBefore}
                </ReactMarkdown>
              </div>
              {/* Documentos e materiais de referência + Convidados — acima de "Quer saber mais..." */}
              {audienciaContentSplit.contentAfter !== null && !isUser && shouldShowAudienciasCta && audienciasFiltradasNoChat.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border/50 space-y-3">
                  {audienciasFiltradasNoChat
                    .filter((a) => a.projeto_referencia?.trim() || a.link_transmissao?.trim() || a.mais_informacoes?.trim() || a.convidados?.trim())
                    .map((a) => (
                      <div key={a.id} className="text-sm space-y-2">
                        {!(a.projeto_referencia?.trim() || a.link_transmissao?.trim() || a.mais_informacoes?.trim()) && (a.comissao || a.titulo) && (
                          <p className="font-normal text-muted-foreground text-xs">
                            {a.comissao || a.titulo}
                          </p>
                        )}
                        {a.convidados?.trim() && (() => {
                          const textoNorm = normalizarConvidadosParaExibicao(a.convidados);
                          const itens = textoNorm
                            .split(/\s*;\s*/)
                            .map((s) => s.replace(/^\s*-\s*/, "").trim())
                            .filter(Boolean);
                          if (itens.length === 0) return null;
                          return (
                            <div className="space-y-1 text-muted-foreground">
                              <p className="font-semibold text-foreground text-xs">Convidados:</p>
                              <ul className="list-none space-y-0.5 pl-0 text-xs">
                                {itens.map((item, i) => (
                                  <li key={i} className="flex gap-2">
                                    <span className="shrink-0">–</span>
                                    <span>{item.endsWith(".") ? item : `${item};`}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })()}
                        {(a.projeto_referencia?.trim() || a.link_transmissao?.trim() || a.mais_informacoes?.trim()) && (
                          <>
                            <p className="font-semibold text-foreground flex items-center gap-2">
                              <FileText className="h-4 w-4 shrink-0 text-primary" />
                              Documentos e materiais de referência
                              {(a.comissao || a.titulo) && (
                                <span className="font-normal text-muted-foreground text-xs">
                                  — {a.comissao || a.titulo}
                                </span>
                              )}
                            </p>
                            <div className="space-y-2 text-muted-foreground pl-6">
                              {a.link_transmissao?.trim() && (
                                <div className="space-y-0.5">
                                  <p className="font-medium text-foreground text-xs">Transmissão ao vivo</p>
                                  <a
                                    href={a.link_transmissao}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary underline underline-offset-2 text-xs block"
                                  >
                                    Acessar link da videoconferência
                                  </a>
                                </div>
                              )}
                              {a.mais_informacoes?.trim() && (
                                <div className="space-y-0.5">
                                  <p className="font-medium text-foreground text-xs">Contato para mais informações</p>
                                  {(() => {
                                    const email = extrairEmailDeMaisInformacoes(a.mais_informacoes);
                                    if (email) {
                                      return (
                                        <a
                                          href={`mailto:${email}`}
                                          className="text-primary underline underline-offset-2 text-xs block"
                                        >
                                          {email}
                                        </a>
                                      );
                                    }
                                    return (
                                      <span className="text-xs">
                                        {a.mais_informacoes.replace(/^Mais\s+informa[cç][oõ]es\s*:\s*/i, "").trim()}
                                      </span>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                </div>
              )}
              {audienciaContentSplit.contentAfter !== null && (
                <div className={cn("prose prose-sm dark:prose-invert max-w-none", showVerMais && !contentExpanded && "line-clamp-6")}>
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="text-sm mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="text-sm list-disc pl-4 mb-2">{children}</ul>,
                      ol: ({ children }) => <ol className="text-sm list-decimal pl-4 mb-2">{children}</ol>,
                      li: ({ children }) => <li className="mb-1">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      a: ({ href, children }) => {
                        const isInternal = href?.startsWith('/') && !href?.startsWith('//');
                        if (isInternal) {
                          return (
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); navigate(href || '/'); }}
                              className="text-primary underline underline-offset-2 hover:text-primary/80 font-medium cursor-pointer"
                            >
                              {children}
                            </button>
                          );
                        }
                        return (
                          <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80 font-medium">
                            {children}
                          </a>
                        );
                      },
                      code: ({ children }) => <code className="bg-background/50 px-1 py-0.5 rounded text-xs">{children}</code>,
                    }}
                  >
                    {audienciaContentSplit.contentAfter}
                  </ReactMarkdown>
                </div>
              )}
              {showVerMais && (
                <button
                  type="button"
                  onClick={() => setContentExpanded((v) => !v)}
                  className="mt-2 text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  {contentExpanded ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" />
                      Ver menos
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" />
                      Ver mais
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Inline Address Autocomplete - shown when asking for CEP/address */}
        {(isAskingForAddress || hasAddressPicker) && !addressSelected && (
          <div className="mt-2 w-full max-w-xs">
            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 flex-shrink-0" />
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
        
        {/* Inline Location Method Picker (GPS / endereço cadastrado / digitar) */}
        {(hasLocationMethodPicker || isAskingForLocationMethod) && !locationMethodSelected && isLastAssistantMessage && (
          <InlineLocationMethodPicker onSelect={handleLocationMethodSelected} />
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
        
        {/* Inline Service Address Confirm */}
        {hasServiceAddressConfirm && serviceAddressToConfirm && !serviceAddressConfirmed && isLastAssistantMessage && (
          <InlineAddressConfirm 
            address={serviceAddressToConfirm}
            onConfirm={handleServiceAddressConfirmed}
          />
        )}
        
        {/* Journey Switch Confirmation Buttons */}
        {journeySwitchMatch && isLastAssistantMessage && !decisionMade && (
          <div className="mt-3 flex flex-col gap-2 w-full max-w-[280px]">
            <Button
              variant="default"
              size="sm"
              onClick={() => handleJourneyDecision('switch')}
              className="w-full justify-between min-h-[40px]"
            >
              <span className="truncate flex-1 text-left">Sim, iniciar {JOURNEY_NAMES[journeySwitchMatch.newJourney] || journeySwitchMatch.newJourney}</span>
              <ArrowRight className="h-4 w-4 ml-2 flex-shrink-0" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleJourneyDecision('continue')}
              className="w-full justify-between min-h-[40px]"
            >
              <span className="truncate flex-1 text-left">Não, continuar {JOURNEY_NAMES[journeySwitchMatch.currentJourney] || journeySwitchMatch.currentJourney}</span>
              <RotateCcw className="h-4 w-4 ml-2 flex-shrink-0" />
            </Button>
          </div>
        )}

        {/* Audiências: os 3 botões sempre visíveis (ordem: Inscrever-se, Abrir, Buscar outras); "Buscar outras" abre o bloco de filtros */}
        {shouldShowAudienciasCta && (
          <div className="mt-3 flex flex-col gap-3 w-full max-w-[320px]">
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAudienciaInscricaoInline((v) => !v)}
                className="w-full justify-center min-h-[40px]"
              >
                {showAudienciaInscricaoInline ? "Ocultar formulário" : "Inscrever-se aqui no chat"}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  const params = new URLSearchParams();
                  if (audienciaChatTema) params.set("themes", audienciaChatTema);
                  if (audienciaChatRegiao) params.set("regions", audienciaChatRegiao);
                  if (audienciaChatDateFrom) params.set("dateFrom", audienciaChatDateFrom);
                  if (audienciaChatDateTo) params.set("dateTo", audienciaChatDateTo);
                  const qs = params.toString();
                  navigate(qs ? `/audiencias?${qs}` : "/audiencias");
                }}
                className="w-full justify-between min-h-[40px]"
              >
                <span className="truncate flex-1 text-left">Abrir Audiências</span>
                <ArrowRight className="h-4 w-4 ml-2 flex-shrink-0" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-center min-h-[40px]"
                onClick={() => setShowAudienciasFilters((v) => !v)}
              >
                {showAudienciasFilters ? "Ocultar filtros" : "Buscar outras audiências públicas"}
              </Button>
            </div>
            {showAudienciaInscricaoInline && <AudienciaInscricaoInline />}

            {showAudienciasFilters && (
              <>
            <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
              <p className="text-sm font-semibold text-foreground">Listagem de audiências públicas</p>
              <p className="text-xs text-muted-foreground">Filtros por tema, data e região</p>
              <div className="grid grid-cols-1 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tema</Label>
                  <Select
                    value={audienciaChatTema || AUDIENCIA_CHAT_ANY}
                    onValueChange={(v) => setAudienciaChatTema(v === AUDIENCIA_CHAT_ANY ? "" : v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Qualquer tema" />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIENCIA_CHAT_TEMAS.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Região</Label>
                  <Select
                    value={audienciaChatRegiao || AUDIENCIA_CHAT_ANY}
                    onValueChange={(v) => setAudienciaChatRegiao(v === AUDIENCIA_CHAT_ANY ? "" : v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Qualquer região" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AUDIENCIA_CHAT_ANY}>Qualquer região</SelectItem>
                      {ZONAS_SAO_PAULO.map((z) => (
                        <SelectItem key={z} value={z}>
                          {z}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">De</Label>
                    <input
                      type="date"
                      value={audienciaChatDateFrom}
                      onChange={(e) => setAudienciaChatDateFrom(e.target.value)}
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Até</Label>
                    <input
                      type="date"
                      value={audienciaChatDateTo}
                      onChange={(e) => setAudienciaChatDateTo(e.target.value)}
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                    />
                  </div>
                </div>
                {onRequestAudienciasWithFilters && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={() =>
                      onRequestAudienciasWithFilters({
                        tema: audienciaChatTema,
                        regiao: audienciaChatRegiao,
                        dateFrom: audienciaChatDateFrom,
                        dateTo: audienciaChatDateTo,
                      })
                    }
                  >
                    Trazer audiências filtradas (perguntar à IA)
                  </Button>
                )}
              </div>
            </div>
              </>
            )}
          </div>
        )}

        {/* Serviços (ex.: após mensagem off-topic) */}
        {hasShowServicesChips && onChipSelect && (
          <div className="mt-3 w-full">
            <PromptChips onSelect={onChipSelect} onOpenDiscovery={onOpenDiscovery} />
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
