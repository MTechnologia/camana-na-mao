import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { AIConversation } from "@/hooks/useAIConversations";
import ConversationPreviewCard from "./ConversationPreviewCard";
import ConversationFilters from "./ConversationFilters";
import { AI_JOURNEYS } from "@/config/aiJourneys";
import { isToday, isThisWeek, isThisMonth } from "date-fns";

interface ConversationHubProps {
  conversations: AIConversation[];
  filterJourney?: string;
  showAllJourneys?: boolean;
  onSelectConversation: (id: string, journeyId: string) => void;
  onNewConversation: (journeyId: string) => void;
  onArchive?: (id: string) => void;
  onRestore?: (id: string) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
  activeConversationId?: string;
}

export default function ConversationHub({
  conversations,
  filterJourney,
  showAllJourneys = false,
  onSelectConversation,
  onNewConversation,
  onArchive,
  onRestore,
  onDelete,
  isLoading = false,
  activeConversationId,
}: ConversationHubProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [journeyFilter, setJourneyFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      // Filter by status
      if (activeTab === "active" && conv.status !== "active") return false;
      if (activeTab === "archived" && conv.status !== "archived") return false;

      // Filter by specific journey if prop is set
      if (filterJourney && conv.journeyId !== filterJourney) return false;

      // Filter by search query
      if (searchQuery && !conv.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !conv.lastMessagePreview?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Filter by journey (if showAllJourneys)
      if (showAllJourneys && journeyFilter !== "all" && conv.journeyId !== journeyFilter) {
        return false;
      }

      // Filter by period
      if (periodFilter !== "all") {
        const lastMessageDate = new Date(conv.lastMessageAt);
        if (periodFilter === "today" && !isToday(lastMessageDate)) return false;
        if (periodFilter === "week" && !isThisWeek(lastMessageDate)) return false;
        if (periodFilter === "month" && !isThisMonth(lastMessageDate)) return false;
      }

      return true;
    });
  }, [conversations, searchQuery, periodFilter, journeyFilter, activeTab, filterJourney, showAllJourneys]);

  // Group by journey if showing all
  const groupedConversations = useMemo(() => {
    if (!showAllJourneys) return { [filterJourney || "general"]: filteredConversations };

    const groups: Record<string, AIConversation[]> = {};
    filteredConversations.forEach((conv) => {
      if (!groups[conv.journeyId]) {
        groups[conv.journeyId] = [];
      }
      groups[conv.journeyId].push(conv);
    });
    return groups;
  }, [filteredConversations, showAllJourneys, filterJourney]);

  const activeCount = conversations.filter(c => c.status === "active").length;
  const archivedCount = conversations.filter(c => c.status === "archived").length;

  // Available journeys for filter
  const availableJourneys = useMemo(() => {
    const journeys = Array.from(new Set(conversations.map(c => c.journeyId)));
    return journeys.map(id => ({
      id,
      label: AI_JOURNEYS[id]?.label || id,
    }));
  }, [conversations]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setActiveTab("active");
    setPeriodFilter("all");
    setJourneyFilter("all");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          {filterJourney ? "Minhas Conversas" : "Todas as Conversas"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {filterJourney
            ? `Conversas sobre ${AI_JOURNEYS[filterJourney]?.label || "este tema"}`
            : "Gerencie todas as suas conversas com IA"}
        </p>
      </div>

      {/* Filters */}
      <ConversationFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={activeTab}
        onStatusChange={setActiveTab}
        activeCount={activeCount}
        archivedCount={archivedCount}
        periodFilter={periodFilter}
        onPeriodChange={setPeriodFilter}
        journeyFilter={journeyFilter}
        onJourneyChange={setJourneyFilter}
        availableJourneys={availableJourneys}
        onClearFilters={handleClearFilters}
      />

      {/* Conversations List */}
      <div className="mt-4 space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando conversas...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">{activeTab === "archived" ? "📦" : "💬"}</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchQuery || periodFilter !== "all" || journeyFilter !== "all"
                ? "Nenhuma conversa encontrada"
                : activeTab === "archived"
                ? "Nenhuma conversa arquivada"
                : filterJourney
                ? "Você ainda não tem conversas sobre este tema"
                : "Comece uma conversa escolhendo um tema"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || periodFilter !== "all" || journeyFilter !== "all"
                ? "Tente ajustar os filtros"
                : activeTab === "archived"
                ? "Conversas arquivadas aparecem aqui"
                : "Clique em 'Nova Conversa' para começar"}
            </p>
            {(searchQuery || periodFilter !== "all" || journeyFilter !== "all") && (
              <Button variant="outline" onClick={handleClearFilters}>
                Limpar Filtros
              </Button>
            )}
          </div>
        ) : showAllJourneys ? (
          // Grouped by journey
          Object.entries(groupedConversations).map(([journeyId, convs]) => (
            <div key={journeyId} className="space-y-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full bg-gradient-to-r ${AI_JOURNEYS[journeyId]?.color || "from-primary to-primary/80"}`}
                />
                <h3 className="text-sm font-semibold text-foreground">
                  {AI_JOURNEYS[journeyId]?.label || journeyId}
                </h3>
              </div>
              {convs.map((conv) => (
                <ConversationPreviewCard
                  key={conv.id}
                  conversation={conv}
                  showJourneyBadge={false}
                  isActive={conv.id === activeConversationId}
                  onSelect={() => onSelectConversation(conv.id, conv.journeyId)}
                  onArchive={activeTab === "active" && onArchive ? () => onArchive(conv.id) : undefined}
                  onRestore={activeTab === "archived" && onRestore ? () => onRestore(conv.id) : undefined}
                  onDelete={onDelete ? () => onDelete(conv.id) : undefined}
                />
              ))}
            </div>
          ))
        ) : (
          // Simple list for filtered journey
          filteredConversations.map((conv) => (
            <ConversationPreviewCard
              key={conv.id}
              conversation={conv}
              showJourneyBadge={showAllJourneys}
              isActive={conv.id === activeConversationId}
              onSelect={() => onSelectConversation(conv.id, conv.journeyId)}
              onArchive={activeTab === "active" && onArchive ? () => onArchive(conv.id) : undefined}
              onRestore={activeTab === "archived" && onRestore ? () => onRestore(conv.id) : undefined}
              onDelete={onDelete ? () => onDelete(conv.id) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}
