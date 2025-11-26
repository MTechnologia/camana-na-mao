import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Archive, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AIConversation } from "@/hooks/useAIConversations";
import { AI_JOURNEYS } from "@/config/aiJourneys";
import { motion } from "framer-motion";

interface ActiveConversationsListProps {
  conversations: Record<string, AIConversation[]>;
  onResume: (conversationId: string, journeyId: string) => void;
  onArchive: (conversationId: string) => void;
}

const ActiveConversationsList = ({
  conversations,
  onResume,
  onArchive,
}: ActiveConversationsListProps) => {
  const journeyEntries = Object.entries(conversations);

  if (journeyEntries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6 px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Conversas Ativas</h2>
      </div>

      {journeyEntries.map(([journeyId, journeyConversations]) => {
        const journey = AI_JOURNEYS[journeyId];
        if (!journey) return null;

        return (
          <div key={journeyId} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`h-1 w-8 rounded-full bg-gradient-to-r ${journey.color}`} />
              <h3 className="text-sm font-medium text-muted-foreground">
                {journey.label}
              </h3>
              <Badge variant="secondary" className="ml-auto">
                {journeyConversations.length}
              </Badge>
            </div>

            <div className="space-y-2">
              {journeyConversations.map((conv, index) => (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className="p-4 cursor-pointer hover:shadow-md transition-all border-l-4"
                    style={{
                      borderLeftColor: `hsl(var(--primary))`,
                    }}
                    onClick={() => onResume(conv.id, conv.journeyId)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-sm line-clamp-1">
                          {conv.title || 'Conversa sem título'}
                        </h4>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onArchive(conv.id);
                          }}
                        >
                          <Archive className="w-4 h-4" />
                        </Button>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {conv.lastMessage}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>
                          {formatDistanceToNow(conv.lastMessageAt, {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                        <span className="ml-auto">
                          {conv.messageCount} mensagens
                        </span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ActiveConversationsList;
