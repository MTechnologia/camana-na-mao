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
import { AIConversation } from "@/hooks/useAIConversations";

import { MessageSquare } from "lucide-react";

interface DeleteConversationDialogProps {
  conversation: AIConversation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function DeleteConversationDialog({
  conversation,
  open,
  onOpenChange,
  onConfirm,
}: DeleteConversationDialogProps) {
  if (!conversation) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deletar conversa permanentemente?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Esta ação não pode ser desfeita. A conversa será removida permanentemente do
                sistema.
              </p>

              {/* Conversation preview */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <h4 className="font-semibold text-foreground line-clamp-1">{conversation.title}</h4>

                {conversation.lastMessagePreview && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {conversation.lastMessagePreview}
                  </p>
                )}

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageSquare className="w-3 h-3" />
                  {conversation.messageCount}{" "}
                  {conversation.messageCount === 1 ? "mensagem" : "mensagens"}
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Deletar permanentemente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
