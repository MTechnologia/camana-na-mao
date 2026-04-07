import { cn } from "@/lib/utils";
import { sanitizeMessageContent, getAppActionsFromContent } from "@/lib/sanitizeMarkers";
import { UserChatBubbleText } from "./UserChatBubbleText";
import { parseUrbanReportPreview, isUrbanConfirmCorrectQuickReply } from "@/lib/parseUrbanReportPreview";
import { UrbanReportPreviewInChat } from "./UrbanReportPreviewInChat";
import { SimilarUrbanReportsInChat, parseSimilarUrbanReportsB64 } from "./SimilarUrbanReportsInChat";
import { parseServicePickerMarker } from "@/lib/parseServicePickerMarker";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, MapPin, ArrowRight, RotateCcw, Bus, Calendar, Clock, Star, Building2, ChevronDown, ChevronUp, FileText, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { AddressAutocomplete, StructuredAddress } from "@/components/address";
import { ZONAS_SAO_PAULO, localParaZona } from "@/lib/audienciaZonas";
import { extrairEmailDeMaisInformacoes, parseConvidadosItens } from "@/lib/audienciaDisplay";
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
import NearbyServicesFiltersInline, { type NearbyFiltersValues } from "./NearbyServicesFiltersInline";
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
  /** URLs públicas de imagens anexadas na mensagem do usuário. */
  attachmentUrls?: string[];
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
  onServiceTypeSelected?: (type: string, displayName: string, otherSpec?: string) => void;
  onServiceSelected?: (name: string, neighborhood: string, address: string, serviceId?: string) => void;
  onServiceAddressConfirmed?: (confirmed: boolean) => void;
  isLastAssistantMessage?: boolean;
  /** Envia os filtros atuais para a IA trazer a listagem filtrada (nova mensagem no chat). */
  onRequestAudienciasWithFilters?: (filters: { tema: string; regiao: string; dateFrom: string; dateTo: string }) => void;
  /** Aplicar filtros de raio/avaliação/busca no fluxo Perto de você (envia mensagem e re-busca). */
  onApplyNearbyFilters?: (filters: NearbyFiltersValues) => void;
  /** Envia mensagem como se o usuário tivesse digitado (ex.: botão "Encaminhar para vereador"). */
  onSendMessage?: (message: string) => void;
  /** Desabilita o botão Registrar até o usuário anexar fotos (fluxo "Pode anexar até 3 fotos"). */
  disableRegistrarUntilPhotosAttached?: boolean;
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
  onApplyNearbyFilters,
  onSendMessage,
  disableRegistrarUntilPhotosAttached = false,
}: ChatMessageBubbleProps) => {
  const isUser = message.role === "user";
  const attachmentUrls = isUser ? (Array.isArray(message.attachmentUrls) ? message.attachmentUrls : []) : [];
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

  // Botões de audiências (Inscrever-se ou Inscrições encerradas, Abrir Audiências, Buscar outras): quando a resposta for sobre listagem/agenda de audiências ou "este ano não foram realizadas... últimas 5".
  const shouldShowAudienciasCta = useMemo(() => {
    if (isUser || !isLastAssistantMessage) return false;
    const content = message.content.toLowerCase();
    const mentionsAudiencias = content.includes("audiên") || content.includes("audienc");
    const isListingAudiencias =
      content.includes("próximas audiências") ||
      content.includes("proximas audiencias") ||
      content.includes("audiências públicas agendadas") ||
      content.includes("audiencias publicas agendadas") ||
      content.includes("quer saber mais sobre alguma ou inscrever-se") ||
      content.includes("este ano ainda não foram realizadas") ||
      content.includes("últimas 5 realizadas") ||
      content.includes("quer buscar outras audiências ou outro tema") ||
      (content.includes("inscrever-se") && (content.includes("agendadas") || content.includes("próximas")));
    return mentionsAudiencias && isListingAudiencias;
  }, [isUser, isLastAssistantMessage, message.content]);

  // Dados para listagem filtrada no chat (tema, data, região) — query dedicada, ordem ascendente para próximas primeiro.
  const { data: audienciasData = [] } = useQuery({
    queryKey: ["audiencias-chat"],
    queryFn: async () => {
      const all: {
        id: string;
        titulo: string;
        descricao: string | null;
        data: string;
        hora: string | null;
        local: string;
        tema: string;
        status: string;
        comissao: string | null;
        convidados: string | null;
        projeto_referencia: string | null;
        link_transmissao: string | null;
        mais_informacoes: string | null;
        inscricoes_abertas: boolean | null;
        vagas_disponiveis: number | null;
      }[] = [];
      let offset = 0;
      const pageSize = 500;
      while (true) {
        const { data, error } = await supabase
          .from("audiencias")
          .select("id, titulo, descricao, data, hora, local, tema, status, comissao, convidados, projeto_referencia, link_transmissao, mais_informacoes, inscricoes_abertas, vagas_disponiveis")
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

  // Verifica se existe pelo menos uma audiência futura com inscrições abertas (dados estruturados).
  const hasFutureOpenAudiencia = useMemo(() => {
    if (!shouldShowAudienciasCta || !audienciasData.length) return false;
    const todayStr = new Date().toISOString().slice(0, 10);
    return audienciasData.some((a) => {
      const dataStr = (a.data || "").slice(0, 10);
      return (a.inscricoes_abertas ?? false) && dataStr >= todayStr;
    });
  }, [shouldShowAudienciasCta, audienciasData]);

  // Inscrições abertas: se houver audiência futura aberta (preferência), ou se a resposta textual mencionar isso (fallback).
  const hasInscricoesAbertas = useMemo(() => {
    if (!shouldShowAudienciasCta) return false;
    if (hasFutureOpenAudiencia) return true;
    return message.content.includes("Inscrições abertas") || message.content.includes("🎫");
  }, [shouldShowAudienciasCta, hasFutureOpenAudiencia, message.content]);

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

  /**
   * Backend/LLM às vezes pergunta só "Qual o CEP do local?" antes do passo correto (GPS / cadastrado / digitar).
   * Nesse caso mostramos o picker de método — não o autocomplete de endereço.
   */
  const treatCepQuestionAsUrbanLocationStep = useMemo(() => {
    if (isUser || !isLastAssistantMessage || addressSelected || locationMethodSelected) return false;
    const raw = message.content;
    const content = raw.toLowerCase();
    const asksCepLoose =
      content.includes("cep do local") ||
      /\bqual\s+o\s+cep\b/i.test(content) ||
      /\bqual\s+é\s+o\s+cep\b/i.test(content);
    if (!asksCepLoose) return false;
    if (raw.includes("[FIELD_REQUEST:cep]") || raw.includes("[ADDRESS_PICKER]")) return false;
    if (/\[\s*LOCATION_METHOD_PICKER\s*\]/i.test(raw) || raw.includes("[FIELD_REQUEST:location_method]")) {
      return false;
    }
    const urbanProgress = /\[COLLECTION_PROGRESS:urban_report:/i.test(raw);
    const urgentTone =
      content.includes("perigoso") ||
      content.includes("urgente") ||
      content.includes("incêndio") ||
      content.includes("incendio") ||
      content.includes("fogo") ||
      content.includes("queimando") ||
      /registrar\s+urgent/i.test(content);
    // Água / drenagem: a LLM costuma pular para CEP; mesmo fluxo que GPS/cadastrado/digitar
    const waterOrDrainageUrban =
      content.includes("drenagem") ||
      content.includes("alag") ||
      content.includes("enchent") ||
      content.includes("inunda") ||
      content.includes("chovendo") ||
      content.includes("chuva forte") ||
      content.includes("bueiro") ||
      content.includes("água na rua") ||
      content.includes("agua na rua");
    return urbanProgress || urgentTone || waterOrDrainageUrban;
  }, [isUser, isLastAssistantMessage, message.content, addressSelected, locationMethodSelected]);
  
  // Detect if the message is asking for CEP or address (for inline autocomplete)
  const isAskingForAddress = useMemo(() => {
    if (isUser || addressSelected) return false;
    
    const content = message.content.toLowerCase();
    
    // Check for explicit field request marker
    if (message.content.includes('[FIELD_REQUEST:cep]')) return true;

    if (treatCepQuestionAsUrbanLocationStep) return false;
    
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
  }, [isUser, message.content, addressSelected, isLastAssistantMessage, treatCepQuestionAsUrbanLocationStep]);
  
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
  
  // Detect service name question (incl. "Qual CEU você visitou em X? Selecione na lista")
  const isAskingForService = useMemo(() => {
    if (isUser || serviceSelected || hasServicePicker) return false;
    const content = message.content.toLowerCase();
    return (
      content.includes('[field_request:service_name]') ||
      (content.includes('qual o nome') && isLastAssistantMessage) ||
      (content.includes('selecione na lista') && isLastAssistantMessage) ||
      (/qual\s+(ubs|ceu|hospital|escola)\s+você\s+visitou/i.test(content) && isLastAssistantMessage)
    );
  }, [isUser, message.content, serviceSelected, hasServicePicker, isLastAssistantMessage]);
  
  // Detect "como informar localização" so we show the 3 buttons even if backend didn't send the marker
  const isAskingForLocationMethod = useMemo(() => {
    if (isUser || locationMethodSelected || hasLocationMethodPicker) return false;
    if (treatCepQuestionAsUrbanLocationStep) return true;
    const content = message.content.toLowerCase();
    return (
      (content.includes('como você quer informar sua localização') ||
        content.includes('como quer informar sua localização') ||
        content.includes('informar sua localização para buscar') ||
        content.includes('onde fica** o problema') ||
        content.includes('onde fica o problema') ||
        content.includes('como você quer informar **onde fica**') ||
        (content.includes('toque em') && content.includes('usar minha localização')) ||
        (content.includes('endereço cadastrado') && content.includes('digitar cep'))) &&
      isLastAssistantMessage
    );
  }, [
    isUser,
    message.content,
    locationMethodSelected,
    hasLocationMethodPicker,
    isLastAssistantMessage,
    treatCepQuestionAsUrbanLocationStep,
  ]);

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

  /** Relato/avaliação já registrados: mostrar texto completo (gravidade, trâmite, links) sem line-clamp. */
  const isRegisteredReportSuccessMessage =
    !isUser &&
    (message.content.includes("[REPORT_CREATED:") ||
      message.content.includes("[TRANSPORT_CREATED:") ||
      message.content.includes("[RATING_CREATED:"));

  // Ações do app após respostas RAG (ex.: audiências) — botões para ver no chat ou no módulo
  const appActions = useMemo(
    () => (!isUser ? getAppActionsFromContent(message.content) : {}),
    [isUser, message.content]
  );

  // Preserva quebra de linha a cada step no "Passo a passo" (Markdown: dois espaços + \n = <br>)
  const withStepLineBreaks = (text: string): string => {
    if (text.includes('**Passo a passo:**') && text.includes('•')) return text.replace(/\n/g, '  \n');
    return text;
  };

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

  // Botão "Encaminhar para vereador" após relato registrado (evita perder contexto com pergunta em texto)
  const hasEncaminharVereadorCta = !isUser && message.content.includes('[REPORT_CREATED:');

  // Botões de resposta rápida (relato urbano: Sim/Não, Registrar, Confirmar/Corrigir)
  const quickReplyButtons = useMemo(() => {
    if (isUser || !onSendMessage) return [];
    const match = message.content.match(/\[QUICK_REPLY:([^\]]+)\]/);
    if (!match) return [];
    const values = match[1].split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);
    const labels: Record<string, string> = {
      sim: 'Sim',
      não: 'Não',
      nao: 'Não',
      registrar: 'Registrar',
      novo_relato: 'Registrar novo relato',
      confirmar: 'Confirmar',
      corrigir: 'Corrigir',
      descrição: 'Descrição',
      endereco: 'Endereço',
      endereço: 'Endereço',
      categoria: 'Categoria',
      tipo_detalhe: 'Tipo / detalhe',
      gravidade: 'Gravidade',
      tipos_de_risco: 'Tipos de risco',
      afetação: 'Afetação',
      afetacao: 'Afetação',
      cep: 'CEP',
      natureza: 'Natureza',
      critical: 'Crítico',
      moderate: 'Moderado',
      low: 'Baixo',
      none: 'Nenhum',
      reclamacao: 'Reclamação',
      duvida: 'Dúvida',
      sugestao: 'Sugestão',
      elogio: 'Elogio',
    };
    return values.map((value) => ({
      value,
      label: labels[value] || value.charAt(0).toUpperCase() + value.slice(1),
    }));
  }, [isUser, message.content, onSendMessage]);

  /** Relatos próximos (RPC) embutidos em Base64 no texto da assistente. */
  const similarUrbanReportsPayload = useMemo(
    () => (!isUser ? parseSimilarUrbanReportsB64(message.content) : null),
    [isUser, message.content]
  );

  /** Preview estruturado do relato urbano (PO: melhor UX que parágrafo denso em markdown). */
  const urbanReportPreviewParsed = useMemo(() => parseUrbanReportPreview(cleanContent), [cleanContent]);
  const showUrbanPreviewCard =
    !isUser &&
    !!urbanReportPreviewParsed &&
    isUrbanConfirmCorrectQuickReply(message.content) &&
    audienciaContentSplit.contentAfter === null;

  /** Card urbano já é legível; evita "Ver mais" sem sentido se o texto bruto for longo. */
  const showVerMais =
    !isUser && isLongContent && !showUrbanPreviewCard && !isRegisteredReportSuccessMessage;

  // Mostrar filtros (raio, avaliação, busca) só quando já tiver lista de resultados (assim temos service_type + localização e "Aplicar filtros" re-busca com os filtros)
  const shouldShowNearbyFilters = !isUser && isLastAssistantMessage && onApplyNearbyFilters && (
    message.content.includes('opções mais próximas') ||
    message.content.includes('Quer que eu calcule a rota')
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

  const handleServiceTypeSelected = (type: string, displayName: string, otherSpec?: string) => {
    setServiceTypeSelected(true);
    if (onServiceTypeSelected) {
      onServiceTypeSelected(type, displayName, otherSpec);
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

  // Extract serviceType e district para InlineServicePicker (lista filtrada por bairro + tipo)
  const servicePickerContext = useMemo(() => {
    let serviceType: string | undefined;
    let district: string | undefined;

    if (message.content.includes("[SERVICE_PICKER")) {
      const parsed = parseServicePickerMarker(message.content);
      serviceType = parsed.serviceType;
      district = parsed.district;
    }
    if (!serviceType) {
      const typeMatch = message.content.match(/"service_type"\s*:\s*"([^"]+)"/);
      if (typeMatch) serviceType = typeMatch[1];
    }
    if (!district) {
      const neighMatch = message.content.match(/"service_neighborhood"\s*:\s*"([^"]+)"/);
      if (neighMatch) district = neighMatch[1];
    }
    return { serviceType, district };
  }, [message.content]);
  
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
            <UserChatBubbleText content={message.content} />
          ) : (
            <div className="w-full">
              {showUrbanPreviewCard && urbanReportPreviewParsed ? (
                <UrbanReportPreviewInChat preview={urbanReportPreviewParsed} />
              ) : (
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
                    ? withStepLineBreaks(cleanContent)
                    : withStepLineBreaks(audienciaContentSplit.contentBefore)}
                </ReactMarkdown>
              </div>
              )}
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
                          const itens = parseConvidadosItens(a.convidados);
                          if (itens.length === 0) return null;
                          return (
                            <div className="space-y-1 text-muted-foreground">
                              <p className="font-semibold text-foreground text-xs">Foram convidados para a Audiência Pública:</p>
                              <ul className="list-none space-y-0.5 pl-0 text-xs">
                                {itens.map((item, i) => (
                                  <li key={i} className="space-y-0.5">
                                    <span className="block">- {item.nome}</span>
                                    {item.cargo ? <span className="block">– {item.cargo}{i < itens.length - 1 ? ";" : ""}</span> : null}
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
                                    href="https://www.youtube.com/user/camarasaopaulo"
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
                    {withStepLineBreaks(audienciaContentSplit.contentAfter)}
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
              {!isUser && similarUrbanReportsPayload && (
                <SimilarUrbanReportsInChat payload={similarUrbanReportsPayload} className="mt-3" />
              )}
            </div>
          )}
        </div>

        {/* Preview das fotos anexadas no chat (após upload). */}
        {isUser && attachmentUrls.length > 0 && (
          <div className="w-full max-w-[320px] grid grid-cols-3 gap-2 mt-1">
            {attachmentUrls.slice(0, 3).map((url, index) => (
              <a
                key={`${message.id}-attachment-${index}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg overflow-hidden border border-primary/30 bg-primary/10 hover:opacity-90 transition-opacity"
                aria-label={`Abrir imagem anexada ${index + 1}`}
              >
                <img
                  src={url}
                  alt={`Imagem anexada ${index + 1}`}
                  className="w-full h-24 object-cover"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        )}
        
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
        
        {/* Avaliação geral (1–5 estrelas) */}
        {(hasRatingPicker || isAskingForRating) && !ratingSelected && isLastAssistantMessage && onRatingSelected && (
          <InlineRatingPicker onSelect={handleRatingSelected} />
        )}
        
        {/* Inline Service Type Picker */}
        {(hasServiceTypePicker || isAskingForServiceType) && !serviceTypeSelected && isLastAssistantMessage && (
          <InlineServiceTypePicker onSelect={handleServiceTypeSelected} />
        )}
        
        {/* Inline Service Picker */}
        {(hasServicePicker || isAskingForService) && !serviceSelected && isLastAssistantMessage && (
          <InlineServicePicker
            serviceType={servicePickerContext.serviceType}
            district={servicePickerContext.district}
            onSelect={handleServiceSelected}
          />
        )}
        
        {/* Inline Service Address Confirm */}
        {hasServiceAddressConfirm && serviceAddressToConfirm && !serviceAddressConfirmed && isLastAssistantMessage && (
          <InlineAddressConfirm 
            address={serviceAddressToConfirm}
            onConfirm={handleServiceAddressConfirmed}
          />
        )}

        {/* Filtros Perto de você: raio, avaliação mínima, busca por nome/endereço/bairro */}
        {shouldShowNearbyFilters && (
          <NearbyServicesFiltersInline
            defaultRadius={2000}
            defaultMinRating="all"
            defaultSearchQuery=""
            onApply={onApplyNearbyFilters}
          />
        )}
        
        {/* Botões de resposta rápida (Sim/Não, Registrar, Confirmar/Corrigir) */}
        {quickReplyButtons.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {quickReplyButtons.map((btn) => {
              const isRegistrar = btn.value === "registrar";
              const disabled = isRegistrar && disableRegistrarUntilPhotosAttached;
              const isCorrigir = btn.value === "corrigir";
              const isConfirmar = btn.value === "confirmar";
              return (
                <Button
                  key={btn.value}
                  variant={isCorrigir ? "outline" : "default"}
                  size={showUrbanPreviewCard ? "default" : "sm"}
                  disabled={disabled}
                  onClick={() => !disabled && onSendMessage?.(btn.value)}
                  className={cn(
                    "rounded-lg",
                    showUrbanPreviewCard && isConfirmar && "min-h-11 px-5",
                    showUrbanPreviewCard && isCorrigir && "min-h-11 px-5",
                  )}
                >
                  {btn.label}
                </Button>
              );
            })}
          </div>
        )}

        {/* Botão Encaminhar para vereador (após relato registrado) */}
        {hasEncaminharVereadorCta && onSendMessage && (
          <div className="mt-3 w-full max-w-[280px]">
            <Button
              variant="default"
              size="sm"
              onClick={() => onSendMessage('Quero encaminhar meu relato para um vereador')}
              className="w-full justify-between min-h-[40px]"
            >
              <span className="truncate flex-1 text-left">Encaminhar para vereador</span>
              <ArrowRight className="h-4 w-4 ml-2 flex-shrink-0" />
            </Button>
          </div>
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

        {/* Audiências: Inscrever-se (ou Inscrições encerradas), Abrir Audiências, Buscar outras; "Buscar outras" abre o bloco de filtros */}
        {shouldShowAudienciasCta && (
          <div className="mt-3 flex flex-col gap-3 w-full max-w-[320px]">
            <div className="flex flex-col gap-2">
              {hasInscricoesAbertas ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAudienciaInscricaoInline((v) => !v)}
                  className="w-full justify-center min-h-[40px]"
                >
                  {showAudienciaInscricaoInline ? "Ocultar formulário" : "Inscrever-se aqui no chat"}
                </Button>
              ) : (
                <Button disabled className="w-full bg-muted text-muted-foreground cursor-default min-h-[40px]">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Inscrições encerradas
                </Button>
              )}
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
            {hasInscricoesAbertas && showAudienciaInscricaoInline && <AudienciaInscricaoInline />}

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
