import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, MessageSquare, Plus, Trash2, Bot, Bus, MapPin, FileText, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useAIConversations, type AIConversation } from "@/hooks/useAIConversations";
import { useAIJourney } from "@/contexts/AIJourneyContext";
import { useToast } from "@/hooks/use-toast";
import DeleteConversationDialog from "@/components/ai/DeleteConversationDialog";
import { isToday, isYesterday, subDays, isAfter } from "date-fns";
import { formatRelativeTime } from "@/lib/dateUtils";

const journeyIcons: Record<string, typeof Bot> = {
  general: Bot,
  transport: Bus,
  urban: MapPin,
  services: Star,
  legislation: FileText,
};

const ConversationsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { conversations, isLoading, deleteConversation } = useAIConversations();
  const { setActiveConversationId } = useAIJourney();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<AIConversation | null>(null);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(
      (conv) =>
        conv.title.toLowerCase().includes(query) ||
        conv.lastMessagePreview.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  const groupedConversations = useMemo(() => {
    const groups: Record<string, AIConversation[]> = {
      today: [],
      yesterday: [],
      lastWeek: [],
      lastMonth: [],
      older: [],
    };

    const now = new Date();
    const weekAgo = subDays(now, 7);
    const monthAgo = subDays(now, 30);

    filteredConversations.forEach((conv) => {
      const date = conv.lastMessageAt;
      if (isToday(date)) {
        groups.today.push(conv);
      } else if (isYesterday(date)) {
        groups.yesterday.push(conv);
      } else if (isAfter(date, weekAgo)) {
        groups.lastWeek.push(conv);
      } else if (isAfter(date, monthAgo)) {
        groups.lastMonth.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  }, [filteredConversations]);

  const groupLabels: Record<string, string> = {
    today: "Hoje",
    yesterday: "Ontem",
    lastWeek: "Últimos 7 dias",
    lastMonth: "Últimos 30 dias",
    older: "Mais antigas",
  };

  const handleConversationClick = (conversation: AIConversation) => {
    setActiveConversationId(conversation.id);
    navigate("/");
  };

  const handleDeleteClick = (e: React.MouseEvent, conversation: AIConversation) => {
    e.stopPropagation();
    setConversationToDelete(conversation);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (conversationToDelete) {
      await deleteConversation(conversationToDelete.id);
      toast({
        title: "Conversa excluída",
        description: "A conversa foi removida com sucesso.",
      });
    }
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    navigate("/");
  };

  const getJourneyIcon = (journeyId: string) => {
    const Icon = journeyIcons[journeyId] || Bot;
    return <Icon className="h-5 w-5" />;
  };

  const formatDate = (date: Date) => {
    return formatRelativeTime(date);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Minhas Conversas</h1>
      </header>

      {/* Search */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {isLoading ? (
            // Loading skeleton
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchQuery ? "Nenhuma conversa encontrada" : "Sem conversas ainda"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery
                  ? "Tente buscar por outro termo"
                  : "Inicie uma nova conversa com a IA"}
              </p>
              {!searchQuery && (
                <Button onClick={handleNewConversation}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Conversa
                </Button>
              )}
            </div>
          ) : (
            // Grouped conversations
            Object.entries(groupedConversations).map(([group, convs]) => {
              if (convs.length === 0) return null;
              return (
                <div key={group} className="space-y-2">
                  <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
                    {groupLabels[group]}
                  </h2>
                  <div className="space-y-2">
                    {convs.map((conversation) => (
                      <Card
                        key={conversation.id}
                        className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => handleConversationClick(conversation)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            {getJourneyIcon(conversation.journeyId)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-medium text-foreground line-clamp-1">
                                {conversation.title}
                              </h3>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {formatDate(conversation.lastMessageAt)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {conversation.lastMessagePreview || "Sem mensagens"}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted hover:scale-110 transition-all duration-200"
                            onClick={(e) => handleDeleteClick(e, conversation)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* FAB for new conversation */}
      {!isLoading && filteredConversations.length > 0 && (
        <div className="fixed bottom-20 right-4">
          <Button
            size="lg"
            className="rounded-full shadow-lg h-14 w-14"
            onClick={handleNewConversation}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Delete Dialog */}
      {conversationToDelete && (
        <DeleteConversationDialog
          conversation={conversationToDelete}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
};

export default ConversationsPage;
