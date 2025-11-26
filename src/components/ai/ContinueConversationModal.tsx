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
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ContinueConversationModalProps {
  isOpen: boolean;
  conversation: AIConversation | null;
  journeyLabel: string;
  onContinue: () => void;
  onStartNew: () => void;
  onClose: () => void;
}

const ContinueConversationModal = ({
  isOpen,
  conversation,
  journeyLabel,
  onContinue,
  onStartNew,
  onClose,
}: ContinueConversationModalProps) => {
  if (!conversation) return null;

  const timeAgo = formatDistanceToNow(conversation.lastMessageAt, {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Conversa em Andamento</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Você tem uma conversa sobre <strong>{journeyLabel}</strong> de{" "}
              <strong>{timeAgo}</strong>.
            </p>
            <p className="text-xs text-muted-foreground italic">
              "{conversation.lastMessage.slice(0, 100)}
              {conversation.lastMessage.length > 100 ? "..." : ""}"
            </p>
            <p className="pt-2">Deseja continuar essa conversa ou iniciar uma nova?</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onStartNew}>
            Iniciar Nova
          </AlertDialogCancel>
          <AlertDialogAction onClick={onContinue}>
            Continuar Conversa
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ContinueConversationModal;
