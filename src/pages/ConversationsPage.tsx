import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MessageSquare,
  Plus,
  Trash2,
  Bot,
  Bus,
  MapPin,
  FileText,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useAIConversations, type AIConversation } from "@/hooks/useAIConversations";
import { useAIJourney } from "@/contexts/AIJourneyContext";
import { useToast } from "@/hooks/use-toast";
import DeleteConversationDialog from "@/components/ai/DeleteConversationDialog";
import BulkDeleteConfirmDialog, {
  CONVERSATION_BULK_DELETE_COPY,
} from "@/components/shared/BulkDeleteConfirmDialog";
import {
  CITIZEN_LIST_PAGE_SIZE,
  ListPagination,
  paginateSlice,
  totalListPages,
} from "@/components/shared/ListPagination";
import { isToday, isYesterday, subDays, isAfter, format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const {
    conversations,
    isLoading,
    deleteConversation,
    deleteConversations,
    deleteAllConversations,
  } = useAIConversations();
  const { setActiveConversationId, activeConversationId, startNewChatSession, clearConversation } =
    useAIJourney();

  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<AIConversation | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteMode, setBulkDeleteMode] = useState<"selected" | "all">("selected");

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(
      (conv) =>
        conv.title.toLowerCase().includes(query) ||
        conv.lastMessagePreview.toLowerCase().includes(query),
    );
  }, [conversations, searchQuery]);

  const conversationTotalPages = totalListPages(
    filteredConversations.length,
    CITIZEN_LIST_PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (page > conversationTotalPages) {
      setPage(conversationTotalPages);
    }
  }, [page, conversationTotalPages]);

  const paginatedConversations = useMemo(
    () => paginateSlice(filteredConversations, page, CITIZEN_LIST_PAGE_SIZE),
    [filteredConversations, page],
  );

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

    paginatedConversations.forEach((conv) => {
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
  }, [paginatedConversations]);

  const groupLabels: Record<string, string> = {
    today: "Hoje",
    yesterday: "Ontem",
    lastWeek: "Últimos 7 dias",
    lastMonth: "Últimos 30 dias",
    older: "Mais antigas",
  };

  const allFilteredSelected =
    filteredConversations.length > 0 && filteredConversations.every((c) => selectedIds.has(c.id));

  const toggleSelection = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggleSelectAllFiltered = useCallback(() => {
    setSelectedIds((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        filteredConversations.forEach((c) => next.delete(c.id));
        return next;
      }
      const next = new Set(prev);
      filteredConversations.forEach((c) => next.add(c.id));
      return next;
    });
  }, [allFilteredSelected, filteredConversations]);

  const clearSelectionIfActiveDeleted = useCallback(
    (deletedIds: string[]) => {
      if (activeConversationId && deletedIds.includes(activeConversationId)) {
        clearConversation();
      }
      setSelectedIds((prev) => {
        const next = new Set(prev);
        deletedIds.forEach((id) => next.delete(id));
        return next;
      });
    },
    [activeConversationId, clearConversation],
  );

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
      const ok = await deleteConversation(conversationToDelete.id);
      if (ok) {
        clearSelectionIfActiveDeleted([conversationToDelete.id]);
        toast({
          title: "Conversa excluída",
          description: "A conversa foi removida com sucesso.",
        });
      }
    }
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
  };

  const handleNewConversation = () => {
    startNewChatSession();
    setSelectedIds(new Set());
    navigate("/", { replace: true });
    toast({
      title: "Nova conversa",
      description: "Escolha um tema no assistente para começar.",
    });
  };

  const openBulkDelete = (mode: "selected" | "all") => {
    setBulkDeleteMode(mode);
    setBulkDeleteOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
    if (bulkDeleteMode === "all") {
      const count = await deleteAllConversations();
      if (count > 0) {
        startNewChatSession();
        setSelectedIds(new Set());
        toast({
          title: "Conversas removidas",
          description: `${count} conversa${count === 1 ? "" : "s"} excluída${count === 1 ? "" : "s"}.`,
        });
      }
    } else {
      const ids = Array.from(selectedIds);
      const count = await deleteConversations(ids);
      if (count > 0) {
        clearSelectionIfActiveDeleted(ids);
        toast({
          title: "Conversas excluídas",
          description: `${count} conversa${count === 1 ? "" : "s"} removida${count === 1 ? "" : "s"}.`,
        });
      }
    }
    setBulkDeleteOpen(false);
  };

  const getJourneyIcon = (journeyId: string) => {
    const Icon = journeyIcons[journeyId] || Bot;
    return <Icon className="h-5 w-5" />;
  };

  const formatCreatedDate = (date: Date) => {
    return format(date, "dd/MM HH:mm", { locale: ptBR });
  };

  const selectedCount = selectedIds.size;

  return (
    <div className="flex flex-col min-h-[calc(100vh-60px)] bg-background">
      <div className="p-4 border-b border-border space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {!isLoading && filteredConversations.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <Checkbox
                checked={allFilteredSelected}
                onCheckedChange={() => toggleSelectAllFiltered()}
                aria-label="Selecionar todas as conversas visíveis"
              />
              Selecionar todas
            </label>
            {selectedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => openBulkDelete("selected")}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir ({selectedCount})
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
              onClick={() => openBulkDelete("all")}
            >
              Limpar todas
            </Button>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {isLoading ? (
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
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchQuery ? "Nenhuma conversa encontrada" : "Sem conversas ainda"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery ? "Tente buscar por outro termo" : "Inicie uma nova conversa com a IA"}
              </p>
              {!searchQuery && (
                <Button onClick={handleNewConversation}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova conversa
                </Button>
              )}
            </div>
          ) : (
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
                          <Checkbox
                            checked={selectedIds.has(conversation.id)}
                            onCheckedChange={(checked) =>
                              toggleSelection(conversation.id, checked === true)
                            }
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Selecionar conversa ${conversation.title}`}
                            className="mt-2"
                          />
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            {getJourneyIcon(conversation.journeyId)}
                          </div>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <h3 className="font-medium text-foreground line-clamp-2 break-words">
                              {conversation.title}
                            </h3>
                            {conversation.reportData && (
                              <div className="flex flex-wrap items-center gap-1 mt-1 text-xs text-muted-foreground">
                                {conversation.reportData.category && (
                                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">
                                    {conversation.reportData.category}
                                  </span>
                                )}
                                {conversation.reportData.address && (
                                  <span className="truncate">
                                    {conversation.reportData.address}
                                  </span>
                                )}
                              </div>
                            )}
                            {!conversation.reportData && conversation.lastMessagePreview && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1 break-words">
                                {conversation.lastMessagePreview}
                              </p>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-muted-foreground">
                                {formatCreatedDate(conversation.createdAt)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                data-testid="delete-conversation"
                                onClick={(e) => handleDeleteClick(e, conversation)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })
          )}

          {!isLoading && filteredConversations.length > 0 && (
            <ListPagination
              page={page}
              totalPages={conversationTotalPages}
              totalCount={filteredConversations.length}
              pageSize={CITIZEN_LIST_PAGE_SIZE}
              onPageChange={setPage}
            />
          )}
        </div>
      </ScrollArea>

      {!isLoading && filteredConversations.length > 0 && (
        <div className="fixed bottom-20 right-4">
          <Button
            size="lg"
            className="rounded-full shadow-lg h-14 w-14"
            onClick={handleNewConversation}
            aria-label="Nova conversa"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      )}

      {conversationToDelete && (
        <DeleteConversationDialog
          conversation={conversationToDelete}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
        />
      )}

      <BulkDeleteConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        count={bulkDeleteMode === "all" ? conversations.length : selectedCount}
        mode={bulkDeleteMode}
        copy={CONVERSATION_BULK_DELETE_COPY}
        onConfirm={handleConfirmBulkDelete}
      />
    </div>
  );
};

export default ConversationsPage;
