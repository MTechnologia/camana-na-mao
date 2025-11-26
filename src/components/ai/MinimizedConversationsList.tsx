import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, X, ChevronDown, ChevronUp } from "lucide-react";
import { JourneyType } from "@/contexts/AIJourneyContext";
import { useState } from "react";

interface MinimizedConversation {
  conversationId: string;
  journeyId: string;
}

interface ConversationData {
  id: string;
  title: string;
  lastMessagePreview: string;
}

interface MinimizedConversationsListProps {
  conversations: ConversationData[];
  minimizedConversations: MinimizedConversation[];
  onContinue: (conversationId: string, journeyId: string) => void;
  onDismiss: (conversationId: string) => void;
  getJourneyById: (id: string) => JourneyType | null;
}

const MinimizedConversationsList = ({
  conversations,
  minimizedConversations,
  onContinue,
  onDismiss,
  getJourneyById,
}: MinimizedConversationsListProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (minimizedConversations.length === 0) return null;

  return (
    <Card className="mb-4 border-l-4 border-l-primary bg-primary/5 dark:bg-primary/10 overflow-hidden">
      {/* Header - sempre visível */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-primary/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">
              Conversas em andamento
            </p>
            <Badge variant="secondary" className="text-xs">
              {minimizedConversations.length}
            </Badge>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {/* Lista de conversas - expansível */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {minimizedConversations.map((minConv) => {
            const conv = conversations.find((c) => c.id === minConv.conversationId);
            const journey = getJourneyById(minConv.journeyId);
            
            if (!conv || !journey) return null;

            return (
              <div
                key={minConv.conversationId}
                className="flex items-center justify-between p-3 rounded-lg bg-background border border-border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${journey.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      {journey.label}
                    </p>
                    <p className="text-sm text-foreground truncate">
                      {conv.title || conv.lastMessagePreview}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <Button
                    onClick={() => onContinue(minConv.conversationId, minConv.journeyId)}
                    variant="default"
                    size="sm"
                  >
                    Continuar
                  </Button>
                  <Button
                    onClick={() => onDismiss(minConv.conversationId)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default MinimizedConversationsList;
