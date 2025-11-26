import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare, X } from "lucide-react";
import { JourneyType } from "@/contexts/AIJourneyContext";

interface MinimizedConversationBannerProps {
  conversation: {
    id: string;
    title: string;
    lastMessagePreview: string;
  };
  journey: JourneyType;
  onContinue: () => void;
  onDismiss: () => void;
}

const MinimizedConversationBanner = ({
  conversation,
  journey,
  onContinue,
  onDismiss,
}: MinimizedConversationBannerProps) => {
  return (
    <Card className={`border-l-4 bg-gradient-to-r ${journey.color} bg-opacity-10 mb-4 sticky top-0 z-20 shadow-md`}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <MessageSquare className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              Conversa em andamento
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {conversation.title || conversation.lastMessagePreview}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            onClick={onContinue}
            variant="default"
            size="sm"
            className="ml-2"
          >
            Continuar
          </Button>
          <Button
            onClick={onDismiss}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default MinimizedConversationBanner;
