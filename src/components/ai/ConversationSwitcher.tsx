import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, MessageSquare } from "lucide-react";
import { AIConversation } from "@/hooks/useAIConversations";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ConversationSwitcherProps {
  conversations: AIConversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onViewAll: () => void;
}

export default function ConversationSwitcher({
  conversations,
  currentConversationId,
  onSelectConversation,
  onViewAll,
}: ConversationSwitcherProps) {
  const currentConversation = conversations.find((c) => c.id === currentConversationId);

  if (conversations.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <MessageSquare className="w-4 h-4" />
          <span className="max-w-[150px] truncate">
            {currentConversation?.title || "Selecione uma conversa"}
          </span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px]">
        <DropdownMenuLabel>Conversas Recentes</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {conversations.slice(0, 5).map((conv) => (
          <DropdownMenuItem
            key={conv.id}
            onClick={() => onSelectConversation(conv.id)}
            className={currentConversationId === conv.id ? "bg-accent" : ""}
          >
            <div className="flex flex-col gap-1 w-full">
              <div className="font-medium truncate">{conv.title}</div>
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(conv.lastMessageAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </div>
            </div>
          </DropdownMenuItem>
        ))}
        {conversations.length > 5 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onViewAll} className="text-primary">
              Ver todas as conversas ({conversations.length})
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
