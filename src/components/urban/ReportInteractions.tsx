import { Heart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUrbanReportInteractions } from "@/hooks/useUrbanReportInteractions";
import { cn } from "@/lib/utils";

interface ReportInteractionsProps {
  reportId: string;
  onCommentClick?: () => void;
}

export const ReportInteractions = ({ reportId, onCommentClick }: ReportInteractionsProps) => {
  const { likesCount, commentsCount, isLiked, toggleLike } = useUrbanReportInteractions(reportId);

  return (
    <div className="flex items-center gap-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleLike}
        data-testid="like-button"
        className={cn("flex items-center gap-1.5 h-8", isLiked && "text-red-500")}
      >
        <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
        <span className="text-xs font-medium" data-testid="like-count">
          {likesCount}
        </span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onCommentClick}
        data-testid="comment-button"
        className="flex items-center gap-1.5 h-8"
      >
        <MessageCircle className="w-4 h-4" />
        <span className="text-xs font-medium">{commentsCount}</span>
      </Button>
    </div>
  );
};
