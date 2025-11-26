import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, Bus, Star, Calendar, MapPin, Sparkles, MoreVertical, Archive, XCircle } from "lucide-react";
import { JourneyType } from "@/contexts/AIJourneyContext";
import ConversationSwitcher from "./ConversationSwitcher";
import { AIConversation } from "@/hooks/useAIConversations";
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
import { useState } from "react";

interface JourneyHeaderProps {
  journey: JourneyType;
  onClear: () => void;
  onMinimize?: () => void;
  onArchive?: () => void;
  conversations?: AIConversation[];
  currentConversationId?: string | null;
  onSelectConversation?: (id: string) => void;
  onViewAll?: () => void;
}

const iconMap = {
  MessageSquare,
  Bus,
  Star,
  Calendar,
  MapPin,
  Sparkles,
};

const JourneyHeader = ({
  journey,
  onClear,
  onMinimize,
  onArchive,
  conversations = [],
  currentConversationId,
  onSelectConversation,
  onViewAll,
}: JourneyHeaderProps) => {
  const Icon = iconMap[journey.icon as keyof typeof iconMap] || MessageSquare;
  const [showEndDialog, setShowEndDialog] = useState(false);

  // Filter conversations by current journey
  const journeyConversations = conversations.filter(
    (c) => c.journeyId === journey.id && c.status === "active"
  );

  const handleEndConversation = () => {
    if (onArchive) {
      onArchive();
    }
    onClear();
    setShowEndDialog(false);
  };

  return (
    <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b sticky top-0 z-10">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-full bg-gradient-to-br ${journey.color}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <Badge variant="secondary" className="mb-1">
              Modo IA Ativo
            </Badge>
            <h2 className="text-sm font-semibold">{journey.label}</h2>
          </div>
          {/* Conversation Switcher */}
          {journeyConversations.length > 1 && onSelectConversation && onViewAll && (
            <ConversationSwitcher
              conversations={journeyConversations}
              currentConversationId={currentConversationId || null}
              onSelectConversation={onSelectConversation}
              onViewAll={onViewAll}
            />
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onMinimize && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMinimize}
              className="h-8 w-8"
              title="Voltar ao Hub"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-background border z-50">
              {onMinimize && (
                <>
                  <DropdownMenuItem onClick={onMinimize}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar ao Hub
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {onArchive && (
                <DropdownMenuItem onClick={onArchive}>
                  <Archive className="w-4 h-4 mr-2" />
                  Arquivar Conversa
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => setShowEndDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Encerrar Conversa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta conversa será arquivada e você voltará ao hub. Você poderá acessá-la depois na seção de arquivadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndConversation}>
              Encerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default JourneyHeader;
