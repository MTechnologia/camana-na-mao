import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Archive, Clock } from "lucide-react";
import { formatDistanceToNow, isToday, isThisWeek, isThisMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AIConversation } from "@/hooks/useAIConversations";
import { AI_JOURNEYS } from "@/config/aiJourneys";
import { motion } from "framer-motion";
import ConversationFilters from "./ConversationFilters";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all");

  // Flatten all conversations for filtering
  const allConversations = useMemo(() => {
    return Object.entries(conversations).flatMap(([journeyId, convs]) =>
      convs.map((conv) => ({ ...conv, journeyId }))
    );
  }, [conversations]);

  // Apply filters
  const filteredConversations = useMemo(() => {
    let filtered = allConversations;

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (conv) =>
          conv.title?.toLowerCase().includes(query) ||
          conv.lastMessage.toLowerCase().includes(query)
      );
    }

    // Period filter
    if (periodFilter !== "all") {
      filtered = filtered.filter((conv) => {
        const date = conv.lastMessageAt;
        if (periodFilter === "today") return isToday(date);
        if (periodFilter === "week") return isThisWeek(date, { weekStartsOn: 0 });
        if (periodFilter === "month") return isThisMonth(date);
        return true;
      });
    }

    return filtered;
  }, [allConversations, searchQuery, periodFilter]);

  // Group filtered conversations by journey
  const groupedConversations = useMemo(() => {
    return filteredConversations.reduce((acc, conv) => {
      if (!acc[conv.journeyId]) {
        acc[conv.journeyId] = [];
      }
      acc[conv.journeyId].push(conv);
      return acc;
    }, {} as Record<string, AIConversation[]>);
  }, [filteredConversations]);

  const journeyEntries = Object.entries(groupedConversations);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (periodFilter !== "all") count++;
    return count;
  }, [searchQuery, periodFilter]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setPeriodFilter("all");
  };

  if (allConversations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6 px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Conversas Ativas</h2>
        <Badge variant="secondary" className="ml-auto">
          {filteredConversations.length}
        </Badge>
      </div>

      <ConversationFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter="active"
        onStatusChange={() => {}}
        activeCount={filteredConversations.length}
        archivedCount={0}
        periodFilter={periodFilter}
        onPeriodChange={setPeriodFilter}
        onClearFilters={handleClearFilters}
      />

      {journeyEntries.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Nenhuma conversa encontrada</p>
          {activeFiltersCount > 0 && (
            <Button
              variant="link"
              size="sm"
              onClick={handleClearFilters}
              className="mt-2"
            >
              Limpar filtros
            </Button>
          )}
        </div>
      )}

      {journeyEntries.map(([journeyId, journeyConversations]) => {
        const journey = AI_JOURNEYS[journeyId];
        if (!journey) return null;

        return (
          <div key={journeyId} className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
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
