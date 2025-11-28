import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAIJourney } from "@/contexts/AIJourneyContext";
import { useUnifiedAIChat } from "@/hooks/useUnifiedAIChat";
import { useAIConversations } from "@/hooks/useAIConversations";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import ChatMessageBubble from "./ChatMessageBubble";
import ChatInput from "./ChatInput";
import ReportSuccessCard from "./ReportSuccessCard";
import ContextualGreeting from "./ContextualGreeting";
import QuickActionsCarousel from "./QuickActionsCarousel";
import { Loader2, MoreVertical, Plus, X } from "lucide-react";
import { AI_JOURNEYS } from "@/config/aiJourneys";

const AgentChatArea = () => {
  const { currentJourney, activeConversationId, setJourney, setActiveConversationId, clearJourney } = useAIJourney();
  const [localConversationId, setLocalConversationId] = useState<string | null>(activeConversationId);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const { profile, getInitials } = useProfile();
  const { toast } = useToast();
  
  // Sync local ID with context
  useEffect(() => {
    setLocalConversationId(activeConversationId);
  }, [activeConversationId]);

  const { messages, isLoading, sendMessage, createdReport, clearCreatedReport, clearMessages } = useUnifiedAIChat(
    currentJourney || AI_JOURNEYS.general,
    localConversationId
  );
  const { createConversation } = useAIConversations();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Clear messages when returning to hub (both conversationId and journey are null)
  useEffect(() => {
    if (activeConversationId === null && !currentJourney) {
      clearMessages();
      setLocalConversationId(null);
    }
  }, [activeConversationId, currentJourney, clearMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, createdReport]);

  const hasMessages = messages.length > 0;
  const showWelcome = !hasMessages && !activeConversationId && !currentJourney;

  // User avatar data
  const userAvatarUrl = profile?.avatar_url;
  const userInitials = profile?.full_name ? getInitials(profile.full_name) : "?";

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    // If no active conversation, create one first
    if (!localConversationId) {
      const journeyToUse = currentJourney || AI_JOURNEYS.general;
      const newConvId = await createConversation(journeyToUse.id, journeyToUse.initialMessage);
      
      if (newConvId) {
        setLocalConversationId(newConvId);
        setJourney(journeyToUse, newConvId);
        setActiveConversationId(newConvId);
        
        setTimeout(() => {
          sendMessage(content.trim());
        }, 50);
        return;
      }
    }

    sendMessage(content.trim());
  };

  const handleNewReport = () => {
    clearCreatedReport();
    clearMessages();
    setLocalConversationId(null);
    setActiveConversationId(null);
    clearJourney();
  };

  const handleStartJourney = async (journeyId: string) => {
    // Get the journey config
    const journey = AI_JOURNEYS[journeyId as keyof typeof AI_JOURNEYS];
    if (!journey) return;

    // Clear any existing state
    clearMessages();
    
    // Create a new conversation with the initial message
    const newConvId = await createConversation(journey.id, journey.initialMessage);
    
    if (newConvId) {
      // Set the journey and conversation in context
      setLocalConversationId(newConvId);
      setJourney(journey, newConvId);
      setActiveConversationId(newConvId);
    }
  };

  const handleNewConversation = () => {
    clearMessages();
    setLocalConversationId(null);
    setActiveConversationId(null);
    clearJourney();
    toast({
      title: "Nova conversa",
      description: "Uma nova conversa foi iniciada.",
    });
  };

  const handleEndConversation = () => {
    setShowEndDialog(true);
  };

  const confirmEndConversation = () => {
    clearMessages();
    setLocalConversationId(null);
    setActiveConversationId(null);
    clearJourney();
    setShowEndDialog(false);
    toast({
      title: "Conversa encerrada",
      description: "A conversa foi encerrada com sucesso.",
    });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {showWelcome ? (
        // Welcome state - no scroll needed, just center content
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="w-full max-w-md flex flex-col items-center">
            <ContextualGreeting />
            <QuickActionsCarousel onStartJourney={handleStartJourney} />
            <p className="text-xs text-muted-foreground text-center mt-4">
              Digite sua mensagem ou escolha uma opção acima
            </p>
          </div>
        </div>
      ) : (
        // Chat state - needs scroll
        <ScrollArea className="flex-1">
          {/* Contextual Kebab Menu - only shows when there are messages */}
          {hasMessages && (
            <div className="flex justify-end px-4 py-2 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleNewConversation}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova conversa
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleEndConversation}
                    className="text-destructive focus:text-destructive"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Encerrar conversa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-4">
            {messages.map((msg) => (
              <ChatMessageBubble 
                key={msg.id} 
                message={msg}
                userAvatarUrl={userAvatarUrl}
                userInitials={userInitials}
              />
            ))}
            
            {createdReport && createdReport.type === 'urban_report' && (
              <ReportSuccessCard 
                reportId={createdReport.id} 
                onNewReport={handleNewReport}
              />
            )}
            
            {isLoading && !createdReport && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Pensando...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      )}

      {/* Input Area */}
      {!createdReport && (
        <div className="border-t border-border bg-card p-3 sm:p-4 shrink-0">
          <div className="max-w-2xl mx-auto">
            <ChatInput 
              onSendMessage={handleSendMessage} 
              disabled={isLoading}
              placeholder={currentJourney ? `Fale sobre ${currentJourney.label.toLowerCase()}...` : "Digite sua mensagem..."}
            />
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              A conversa atual será encerrada e você voltará para a tela inicial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEndConversation}>
              Encerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AgentChatArea;
