import { Copy, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AIMessageProps {
  content: string;
  source: string;
  timestamp: string;
}

const AIMessage = ({ content, source, timestamp }: AIMessageProps) => {
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copiado!",
      description: "Mensagem copiada para a área de transferência",
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "CMSP Connect",
        text: content,
      });
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 mb-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm text-foreground leading-relaxed">{content}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="px-2 py-1 bg-primary/10 text-primary rounded-full">
            📍 {source}
          </span>
          <span>{timestamp}</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Copiar mensagem"
          >
            <Copy className="w-4 h-4 text-muted-foreground" />
          </button>
          {navigator.share && (
            <button
              onClick={handleShare}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Compartilhar mensagem"
            >
              <Share2 className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIMessage;
