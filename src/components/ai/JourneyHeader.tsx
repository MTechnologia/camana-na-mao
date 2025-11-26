import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, MessageSquare, Bus, Star, Calendar, MapPin, Sparkles } from "lucide-react";
import { JourneyType } from "@/contexts/AIJourneyContext";
import ConversationSwitcher from "./ConversationSwitcher";
import { AIConversation } from "@/hooks/useAIConversations";

interface JourneyHeaderProps {
  journey: JourneyType;
  onClear: () => void;
  conversations?: AIConversation[];
  currentConversationId?: string | null;
  onSelectConversation?: (id: string) => void;
  onViewAll?: () => void;
}

const iconMap = {
  MessageSquare,
  Bus,
  Star,
  Calendar,
  MapPin,
  Sparkles,
};

const JourneyHeader = ({
  journey,
  onClear,
  conversations = [],
  currentConversationId,
  onSelectConversation,
  onViewAll,
}: JourneyHeaderProps) => {
  const Icon = iconMap[journey.icon as keyof typeof iconMap] || MessageSquare;

  // Filter conversations by current journey
  const journeyConversations = conversations.filter(
    (c) => c.journeyId === journey.id && c.status === "active"
  );

  return (
    <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b sticky top-0 z-10">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-full bg-gradient-to-br ${journey.color}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <Badge variant="secondary" className="mb-1">
              Modo IA Ativo
            </Badge>
            <h2 className="text-sm font-semibold">{journey.label}</h2>
          </div>
          {/* Conversation Switcher */}
          {journeyConversations.length > 1 && onSelectConversation && onViewAll && (
            <ConversationSwitcher
              conversations={journeyConversations}
              currentConversationId={currentConversationId || null}
              onSelectConversation={onSelectConversation}
              onViewAll={onViewAll}
            />
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClear}
          className="h-8 w-8 flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default JourneyHeader;
