import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, MessageSquare, Archive, ArchiveRestore, Trash2, Clock } from "lucide-react";
import { AIConversation } from "@/hooks/useAIConversations";
import { AI_JOURNEYS } from "@/config/aiJourneys";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ConversationPreviewCardProps {
  conversation: AIConversation;
  showJourneyBadge?: boolean;
  isActive?: boolean;
  onSelect: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onDelete?: () => void;
}

export default function ConversationPreviewCard({
  conversation,
  showJourneyBadge = true,
  isActive = false,
  onSelect,
  onArchive,
  onRestore,
  onDelete,
}: ConversationPreviewCardProps) {
  const journey = AI_JOURNEYS[conversation.journeyId];
  const isArchived = conversation.status === "archived";

  return (
    <Card
      className={`p-4 cursor-pointer hover:shadow-md transition-all border-l-4 ${
        isArchived ? "opacity-60" : ""
      } ${isActive ? "bg-accent/30 shadow-lg ring-2 ring-primary/50" : ""}`}
      style={{
        borderLeftColor: journey?.color
          ? `hsl(var(--${journey.color.split("-")[1]}-500))`
          : "hsl(var(--primary))",
      }}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            {showJourneyBadge && journey && (
              <Badge
                variant="secondary"
                className={`text-xs bg-gradient-to-r ${journey.color} text-white`}
              >
                {journey.label}
              </Badge>
            )}
            {isActive && (
              <Badge variant="default" className="text-xs bg-primary text-primary-foreground">
                Em andamento
              </Badge>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                addSuffix: true,
                locale: ptBR,
              })}
            </div>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
            {conversation.title}
          </h3>

          {/* Preview */}
          {conversation.lastMessagePreview && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {conversation.lastMessagePreview}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {conversation.messageCount} {conversation.messageCount === 1 ? "mensagem" : "mensagens"}
            </div>
            {isArchived && (
              <Badge variant="outline" className="text-xs">
                Arquivada
              </Badge>
            )}
          </div>
        </div>

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-background border z-[100]">
            {!isArchived && onArchive && (
              <>
                <DropdownMenuItem 
                  onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    onArchive(); 
                  }}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Arquivar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {isArchived && onRestore && (
              <>
                <DropdownMenuItem 
                  onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    onRestore(); 
                  }}
                >
                  <ArchiveRestore className="w-4 h-4 mr-2" />
                  Restaurar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={(e) => { 
                  e.preventDefault(); 
                  e.stopPropagation(); 
                  onDelete(); 
                }}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Deletar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
