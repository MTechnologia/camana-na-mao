import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUnifiedAIChat } from "@/hooks/useUnifiedAIChat";
import { useAIConversations } from "@/hooks/useAIConversations";
import { useAIJourney } from "@/contexts/AIJourneyContext";
import { useProfile } from "@/hooks/useProfile";
import ChatMessageBubble from "./ChatMessageBubble";
import ChatInput from "./ChatInput";
// ReportSuccessCard removed - success summary now shown in agent message
import ContextualGreeting from "./ContextualGreeting";
import ContextualFeed from "./ContextualFeed";
import PriorityAction from "./PriorityAction";
import PromptChips, { CollectionTypePreset } from "./PromptChips";
import TypingIndicator from "./TypingIndicator";
import DataCollectionTracker from "./DataCollectionTracker";
import CapabilitiesOverlay from "./CapabilitiesOverlay";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ImageIcon, X, Camera, FileEdit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { CollectionType } from "./DataCollectionTracker";
import type { StructuredAddress } from "@/components/address";
import {
  extractFieldRequestFromContent,
  isPhotoAttachStepContent,
} from "@/lib/chatOrchestratorClient";
import {
  buildManualReportNavigateOptions,
  isOpenManualReportMessage,
  resolveManualReportPath,
} from "@/lib/manualReportNavigation";
import { conversationUsesDimensionOnlyRating } from "@/lib/serviceRatingFlow";

const contentVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const }
  }
};

const AgentChatArea = () => {
  const navigate = useNavigate();
  const { activeConversationId, setActiveConversationId } = useAIJourney();
  const { profile, getInitials } = useProfile();
  const hasCleared = useRef(false);
  const pendingMessageRef = useRef<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [presetCollectionType, setPresetCollectionType] = useState<CollectionType>(null);
  const MAX_CHAT_PHOTOS = 3;
  const MAX_CHAT_PHOTO_MB = 50;
  const [chatPhotoFiles, setChatPhotoFiles] = useState<File[]>([]);
  const [chatPhotoPreviews, setChatPhotoPreviews] = useState<string[]>([]);
  const { toast } = useToast();

  const { 
    messages, 
    isLoading,
    isHistoryLoaded,
    sendMessage, 
    createdReport, 
    clearCreatedReport, 
    clearMessages,
    addOptimisticMessage,
    collectionType,
    collectedFields,
    handleJourneySwitchDecision,
    handleLineSelected,
    handleDateSelected,
    handleTimeSelected,
    handleDirectionSelected,
    handleSubcategorySelected,
    handleRecurrenceFrequencySelected,
    handleImpactSelected,
    handleAccessibilityDetailsSelected,
    handleRatingSelected,
    handleWaitTimeSelected,
    handleDimensionRatingSelected,
    handleRatingDimensionWaitTimeSelected,
    handleMultiDimensionRatingComplete,
    handleLocationMethodSelected,
    handleServiceTypeSelected,
    handleServiceSelected,
    handleApplyNearbyFilters,
    patchMessageContent,
  } = useUnifiedAIChat(activeConversationId, presetCollectionType);
  
  const { createConversation } = useAIConversations();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Extrai o campo atual sendo solicitado da última mensagem do assistente
  const currentField = useMemo(() => {
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
    if (!lastAssistantMsg) return undefined;
    
    return extractFieldRequestFromContent(lastAssistantMsg.content);
  }, [messages]);

  // Mostrar botões de anexar fotos apenas após "Você deseja anexar imagens?" e usuário ter respondido Sim (backend envia "Pode anexar até 3 fotos")
  const hasReachedAttachPhotosStep = useMemo(() => {
    return messages.some(
      (m) => m.role === "assistant" && isPhotoAttachStepContent(m.content),
    );
  }, [messages]);

  const suppressLegacyStarRating = useMemo(
    () => conversationUsesDimensionOnlyRating(messages),
    [messages],
  );

  /** Última mensagem do assistente (para não misturar passo "anexar" com resumo final). */
  const lastAssistantContent = useMemo(() => {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    return last?.content ?? "";
  }, [messages]);

  const showUrbanAttachmentUI = useMemo(() => {
    if (
      collectionType !== "urban_report" &&
      collectionType !== "transport_report"
    ) {
      return false;
    }
    if (!hasReachedAttachPhotosStep) return false;
    // Resumo final: não mostrar Câmera/Galeria (evita confusão com o Registrar do resumo)
    if (/resumo do relato de transporte/i.test(lastAssistantContent)) return false;
    if (
      /\*\*resumo do relato\*\*/i.test(lastAssistantContent) &&
      /\[QUICK_REPLY:[^\]]*confirmar/i.test(lastAssistantContent)
    ) {
      return false;
    }
    return true;
  }, [collectionType, hasReachedAttachPhotosStep, lastAssistantContent]);

  // Só exige fotos no passo em que a última mensagem ainda é "Pode anexar…".
  // Depois do envio, chatPhotoPreviews zera — se usássemos só hasReachedAttachPhotosStep,
  // o Registrar do resumo final ficaria desabilitado para sempre.
  const disableRegistrarUntilPhotosAttached = useMemo(() => {
    if (!isPhotoAttachStepContent(lastAssistantContent)) return false;
    return chatPhotoPreviews.length === 0;
  }, [lastAssistantContent, chatPhotoPreviews.length]);

  // Força re-render após hydration completa
  useEffect(() => {
    requestAnimationFrame(() => {
      setIsInitialized(true);
    });
  }, []);

  // No app (WebView): remove foco automático que o WebView pode dar ao carregar a tela
  useEffect(() => {
    const isInApp = typeof window !== "undefined" && !!(window as unknown as { __CAMARA_IN_APP__?: boolean }).__CAMARA_IN_APP__;
    if (!isInApp) return;
    const t = setTimeout(() => {
      try {
        if (document.activeElement && typeof (document.activeElement as HTMLTextAreaElement).blur === "function") {
          (document.activeElement as HTMLTextAreaElement).blur();
        }
      } catch {
        // ignore
      }
    }, 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (activeConversationId === null && !hasCleared.current) {
      hasCleared.current = true;
      clearMessages();
    } else if (activeConversationId !== null) {
      hasCleared.current = false;
    }
  }, [activeConversationId, clearMessages]);

  // Enviar mensagem pendente após conversa carregar completamente
  useEffect(() => {
    if (activeConversationId && pendingMessageRef.current && isHistoryLoaded && !isLoading) {
      const msg = pendingMessageRef.current;
      pendingMessageRef.current = null;
      sendMessage(msg);
    }
  }, [activeConversationId, isHistoryLoaded, isLoading, sendMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, createdReport]);

  const showWelcome = !activeConversationId;
  const userAvatarUrl = profile?.avatar_url;
  const userInitials = profile?.full_name ? getInitials(profile.full_name) : "?";

  const handleSendMessage = async (content: string) => {
    if (!content.trim() && !chatPhotoFiles.length) return;

    if (isOpenManualReportMessage(content)) {
      navigate(
        resolveManualReportPath(collectionType),
        buildManualReportNavigateOptions({ returnToChatConversationId: activeConversationId }),
      );
      return;
    }

    if (!activeConversationId) {
      // Guardar mensagem para enviar após conversa criada
      pendingMessageRef.current = content.trim();
      
      const newConvId = await createConversation('general');
      if (newConvId) {
        setActiveConversationId(newConvId);
      }
      return;
    }

    const text = content.trim();
    const opts = chatPhotoFiles.length
      ? { attachmentFiles: chatPhotoFiles.slice(0, MAX_CHAT_PHOTOS) }
      : undefined;
    sendMessage(text || " ", opts);
    // Limpar anexos após enviar
    chatPhotoPreviews.forEach((url) => URL.revokeObjectURL(url));
    setChatPhotoFiles([]);
    setChatPhotoPreviews([]);
  };

  const handleChatPhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    const remaining = MAX_CHAT_PHOTOS - chatPhotoFiles.length;
    if (remaining <= 0) {
      toast({
        title: `Máximo de ${MAX_CHAT_PHOTOS} fotos`,
        description: "Remova uma para adicionar outra.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }
    const maxBytes = MAX_CHAT_PHOTO_MB * 1024 * 1024;
    const toAdd: File[] = [];
    for (let i = 0; i < files.length && toAdd.length < remaining; i++) {
      if (files[i].size > maxBytes) {
        toast({
          title: "Foto muito grande",
          description: `Máximo ${MAX_CHAT_PHOTO_MB}MB por imagem. "${files[i].name}" ignorada.`,
          variant: "destructive",
        });
        continue;
      }
      toAdd.push(files[i]);
    }
    if (toAdd.length) {
      setChatPhotoFiles((prev) => [...prev, ...toAdd].slice(0, MAX_CHAT_PHOTOS));
      setChatPhotoPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))].slice(0, MAX_CHAT_PHOTOS));
    }
    e.target.value = "";
  };

  const removeChatPhoto = (index: number) => {
    URL.revokeObjectURL(chatPhotoPreviews[index]);
    setChatPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setChatPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNewReport = () => {
    clearCreatedReport();
    clearMessages(false); // Clear messages but don't preserve collection type
    // Stay in chat - don't navigate away or set conversation to null
    // User can start typing immediately for a new report
  };

  const handleStartConversation = async (initialMessage?: string, collectionTypePreset?: CollectionTypePreset) => {
    setIsDiscoveryOpen(false);

    if (initialMessage && isOpenManualReportMessage(initialMessage)) {
      navigate(
        resolveManualReportPath(
          (collectionTypePreset as CollectionType) ?? collectionType,
        ),
        buildManualReportNavigateOptions({ returnToChatConversationId: activeConversationId }),
      );
      return;
    }

    if (collectionTypePreset) {
      setPresetCollectionType(collectionTypePreset as CollectionType);
    } else {
      setPresetCollectionType(null);
    }

    // Se já estamos em uma conversa (ex.: clicou no chip da resposta off-topic), só envia a mensagem na conversa atual
    if (activeConversationId && initialMessage) {
      sendMessage(initialMessage.trim());
      return;
    }

    // Tela inicial: limpa, adiciona mensagem otimista e cria nova conversa
    clearMessages(!!collectionTypePreset);
    if (initialMessage) {
      addOptimisticMessage(initialMessage);
      pendingMessageRef.current = initialMessage;
    }

    const newConvId = await createConversation('general');
    if (newConvId) {
      setActiveConversationId(newConvId);
    }
  };

  const handleOpenDiscovery = () => {
    setIsDiscoveryOpen(true);
  };

  // Handle address selection from Google Places picker (or ViaCEP when coords available)
  const handleAddressSelected = useCallback((address: StructuredAddress) => {
    // Format address as a structured message that the AI can understand
    const addressMessage = `Endereço selecionado: ${address.street}${address.streetNumber ? `, ${address.streetNumber}` : ''} - ${address.neighborhood}, ${address.city}${address.cep ? ` - CEP: ${address.cep}` : ''}`;
    // When we have coordinates (e.g. from Google Place Details), send them so the backend
    // uses the same point for "nearby" search as with GPS, avoiding wrong results from CEP-only geocoding.
    const hasValidCoords =
      typeof address.latitude === 'number' &&
      typeof address.longitude === 'number' &&
      Math.abs(address.latitude) > 1e-6 &&
      Math.abs(address.longitude) > 1e-6;
    const message = hasValidCoords
      ? `${addressMessage}\nLocalização GPS: ${address.latitude},${address.longitude}`
      : addressMessage;
    sendMessage(message);
  }, [sendMessage]);

  // Pedir à IA que traga audiências com os filtros selecionados no bloco do chat
  const handleRequestAudienciasWithFilters = useCallback(
    (filters: { tema: string; regiao: string; dateFrom: string; dateTo: string }) => {
      const parts: string[] = ["Mostre as audiências públicas agendadas"];
      const opts: string[] = [];
      if (filters.tema) opts.push(`tema: ${filters.tema}`);
      if (filters.regiao) opts.push(`região: ${filters.regiao}`);
      if (filters.dateFrom || filters.dateTo) {
        if (filters.dateFrom && filters.dateTo) opts.push(`de ${filters.dateFrom} a ${filters.dateTo}`);
        else if (filters.dateFrom) opts.push(`a partir de ${filters.dateFrom}`);
        else if (filters.dateTo) opts.push(`até ${filters.dateTo}`);
      }
      if (opts.length) parts.push("com os filtros: " + opts.join(", "));
      parts.push(".");
      sendMessage(parts.join(" "));
    },
    [sendMessage]
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <AnimatePresence mode="wait">
        {showWelcome ? (
          <motion.div
            key="welcome"
            variants={contentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 flex flex-col px-4 pt-4 pb-2"
          >
            {/* Topo: Saudação + Feed */}
            <motion.div 
              className="w-full max-w-md lg:max-w-2xl xl:max-w-4xl 2xl:max-w-5xl mx-auto flex flex-col items-center"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <ContextualGreeting />
              <ContextualFeed />
            </motion.div>
            
            {/* Spacer */}
            <div className="flex-1 min-h-4" />
            
            {/* Priority Action + Prompt Chips */}
            <motion.div 
              className="w-full max-w-md lg:max-w-2xl xl:max-w-4xl 2xl:max-w-5xl mx-auto space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              {/* Priority Action - conditional */}
              <PriorityAction onAction={handleStartConversation} />
              
              {/* Prompt Chips Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Sobre o que deseja falar?
                  </span>
                </div>
                
                <PromptChips 
                  onSelect={handleStartConversation} 
                  onOpenDiscovery={handleOpenDiscovery}
                />
                
                <p className="text-xs text-muted-foreground text-center">
                  Ou digite sua mensagem abaixo
                </p>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            variants={contentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 min-h-0 flex flex-col"
          >
            {/* Data Collection Progress Tracker */}
            <DataCollectionTracker 
              collectionType={collectionType}
              collectedFields={collectedFields}
              currentField={currentField}
            />
            
            <ScrollArea className="flex-1">
              <div
                className="w-full max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-auto px-4 py-6 space-y-4"
                data-testid="chat-messages"
                role="log"
                aria-live="polite"
                aria-relevant="additions"
                aria-atomic="false"
                aria-label="Mensagens da conversa com o assistente"
              >
                {messages.map((msg, index) => {
                  // Find last assistant message index
                  const lastAssistantIndex = messages.reduce((acc, m, i) => 
                    m.role === 'assistant' ? i : acc, -1);
                  const isLastAssistantMessage = msg.role === 'assistant' && index === lastAssistantIndex;
                  
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.2 }}
                    >
                      <ChatMessageBubble 
                        message={msg}
                        userAvatarUrl={userAvatarUrl}
                        userInitials={userInitials}
                        onAddressSelected={handleAddressSelected}
                        onJourneySwitchDecision={handleJourneySwitchDecision}
                        onLineSelected={handleLineSelected}
                        onDateSelected={handleDateSelected}
                        onTimeSelected={handleTimeSelected}
                        onDirectionSelected={handleDirectionSelected}
                        onSubcategorySelected={handleSubcategorySelected}
                        onRecurrenceFrequencySelected={handleRecurrenceFrequencySelected}
                        onImpactSelected={handleImpactSelected}
                        onAccessibilityDetailsSelected={handleAccessibilityDetailsSelected}
                        onRatingSelected={handleRatingSelected}
                        onWaitTimeSelected={handleWaitTimeSelected}
                        onDimensionRatingSelected={handleDimensionRatingSelected}
                        onRatingDimensionWaitTimeSelected={handleRatingDimensionWaitTimeSelected}
                        onMultiDimensionRatingComplete={handleMultiDimensionRatingComplete}
                        onLocationMethodSelected={handleLocationMethodSelected}
                        onServiceTypeSelected={handleServiceTypeSelected}
                        onServiceSelected={handleServiceSelected}
                        isLastAssistantMessage={isLastAssistantMessage}
                        onChipSelect={handleStartConversation}
                        onOpenDiscovery={handleOpenDiscovery}
                        onRequestAudienciasWithFilters={handleRequestAudienciasWithFilters}
                        onApplyNearbyFilters={handleApplyNearbyFilters}
                        onSendMessage={handleSendMessage}
                        patchMessageContent={patchMessageContent}
                        disableRegistrarUntilPhotosAttached={disableRegistrarUntilPhotosAttached}
                        suppressLegacyStarRating={suppressLegacyStarRating}
                      />
                    </motion.div>
                  );
                })}
                
                {/* ReportSuccessCard removed - success summary now shown in agent message */}
                
                {isLoading && !createdReport && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    aria-live="polite"
                    aria-busy="true"
                  >
                    <span className="sr-only">Assistente está digitando uma resposta.</span>
                    <TypingIndicator />
                  </motion.div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        className="border-t border-border bg-card p-3 sm:p-4 shrink-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <div className="max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-auto space-y-2">
          {(collectionType === "urban_report" || collectionType === "transport_report") && (
            <div
              className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2"
              role="region"
              aria-label="Atalho para formulário manual"
            >
              <FileEdit className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <button
                type="button"
                onClick={() =>
                  navigate(
                    resolveManualReportPath(collectionType),
                    buildManualReportNavigateOptions({
                      returnToChatConversationId: activeConversationId,
                    }),
                  )
                }
                className="text-xs text-muted-foreground underline hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded min-h-11 px-1"
              >
                {collectionType === "transport_report"
                  ? "Prefiro o formulário manual (passo a passo)"
                  : "Prefiro o formulário manual (com fotos)"}
              </button>
            </div>
          )}
          {/* Anexar fotos: relato urbano ou de transporte, após "Deseja anexar imagens?" e usuário dizer sim */}
          {showUrbanAttachmentUI && (
            <div className="space-y-1.5">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleChatPhotoCapture}
                className="hidden"
                id="chat-photo-camera"
              />
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleChatPhotoCapture}
                className="hidden"
                id="chat-photo-gallery"
              />
              {chatPhotoPreviews.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {chatPhotoPreviews.map((preview, index) => (
                    <div key={index} className="relative rounded-lg overflow-hidden border w-14 h-14 shrink-0">
                      <img src={preview} alt="" className="w-full h-full object-cover" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-0 right-0 h-5 w-5"
                        onClick={() => removeChatPhoto(index)}
                      >
                        <X className="w-2.5 h-2.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {chatPhotoPreviews.length < MAX_CHAT_PHOTOS && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("chat-photo-camera")?.click()}
                    disabled={isLoading}
                    className="text-xs"
                  >
                    <Camera className="w-3.5 h-3.5 mr-1.5" />
                    Câmera
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("chat-photo-gallery")?.click()}
                    disabled={isLoading}
                    className="text-xs"
                  >
                    <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                    Galeria ({MAX_CHAT_PHOTOS - chatPhotoPreviews.length})
                  </Button>
                </div>
              )}
            </div>
          )}
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isLoading}
            placeholder="Digite sua mensagem..."
            draftKey={activeConversationId || "new"}
            autoFocus={false}
          />
        </div>
      </motion.div>
      {/* Capabilities Discovery Overlay */}
      <CapabilitiesOverlay
        isOpen={isDiscoveryOpen}
        onClose={() => setIsDiscoveryOpen(false)}
        onSelectCapability={handleStartConversation}
      />
    </div>
  );
};

export default AgentChatArea;
