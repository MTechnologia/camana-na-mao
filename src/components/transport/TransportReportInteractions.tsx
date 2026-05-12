import { Heart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTransportReportInteractions } from "@/hooks/useTransportReportInteractions";
import { cn } from "@/lib/utils";

interface Props {
  reportId: string;
  refreshNonce?: number;
  onCommentClick?: () => void;
}

export function TransportReportInteractions({ reportId, refreshNonce = 0, onCommentClick }: Props) {
  const { likesCount, commentsCount, isLiked, toggleLike } = useTransportReportInteractions(
    reportId,
    refreshNonce,
  );

  return (
    <div className="flex items-center gap-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void toggleLike()}
        data-testid="transport-like-button"
        className={cn("flex items-center gap-1.5 h-8", isLiked && "text-red-500")}
      >
        <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
        <span className="text-xs font-medium" data-testid="transport-like-count">
          {likesCount}
        </span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onCommentClick}
        data-testid="transport-comment-button"
        className="flex items-center gap-1.5 h-8"
      >
        <MessageCircle className="w-4 h-4" />
        <span className="text-xs font-medium">{commentsCount}</span>
      </Button>
    </div>
  );
}
