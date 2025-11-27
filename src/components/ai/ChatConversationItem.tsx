import { MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAIJourney } from "@/contexts/AIJourneyContext";
import type { AIConversation } from "@/hooks/useAIConversations";
import DeleteConversationDialog from "./DeleteConversationDialog";
import { useState } from "react";

interface ChatConversationItemProps {
  conversation: AIConversation;
  onClick: () => void;
  onDelete: () => void;
}

const ChatConversationItem = ({
  conversation,
  onClick,
  onDelete,
}: ChatConversationItemProps) => {
  const { activeConversationId } = useAIJourney();
  const isActive = activeConversationId === conversation.id;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDelete = () => {
    onDelete();
    setDeleteDialogOpen(false);
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors",
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "hover:bg-muted text-foreground"
      )}
      onClick={onClick}
    >
      <MessageSquare className="h-4 w-4 shrink-0 opacity-70" />
      <span className="flex-1 text-sm truncate pr-2">{conversation.title}</span>
      
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          setDeleteDialogOpen(true);
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>

      <DeleteConversationDialog
        conversation={conversation}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default ChatConversationItem;
