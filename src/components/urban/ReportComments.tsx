import { useState } from "react";
import { useUrbanReportComments } from "@/hooks/useUrbanReportComments";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

interface ReportCommentsProps {
  reportId: string;
}

export const ReportComments = ({ reportId }: ReportCommentsProps) => {
  const { user } = useAuth();
  const { comments, loading, submitting, addComment, deleteComment } = useUrbanReportComments(reportId);
  const [commentText, setCommentText] = useState("");

  const handleSubmit = async () => {
    const success = await addComment(commentText);
    if (success) {
      setCommentText("");
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Adicionar comentário */}
      <div className="space-y-2">
        <Textarea
          placeholder="Escreva um comentário..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="min-h-[80px] resize-none"
        />
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!commentText.trim() || submitting}
            size="sm"
          >
            <Send className="w-4 h-4 mr-2" />
            Comentar
          </Button>
        </div>
      </div>

      {/* Lista de comentários */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum comentário ainda. Seja o primeiro!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                <AvatarFallback>
                  {comment.profiles?.full_name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {comment.profiles?.full_name || "Usuário"}
                    </span>
                    {user?.id === comment.user_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteComment(comment.id)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-foreground">{comment.comment_text}</p>
                </div>
                <span className="text-xs text-muted-foreground ml-3 mt-1 inline-block">
                  {format(new Date(comment.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
