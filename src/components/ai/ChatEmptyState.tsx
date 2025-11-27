import { FileText, Users, Calendar, Building2 } from "lucide-react";
import AIAvatar from "./AIAvatar";
import { Card } from "@/components/ui/card";

interface ChatEmptyStateProps {
  onSuggestionClick: (message: string) => void;
}

const suggestions = [
  {
    icon: FileText,
    title: "Projetos de lei em votação",
    message: "Quais são os principais projetos de lei em votação na Câmara Municipal de São Paulo?",
    color: "text-blue-500",
  },
  {
    icon: Calendar,
    title: "Próximas audiências públicas",
    message: "Quais são as próximas audiências públicas e como posso participar?",
    color: "text-green-500",
  },
  {
    icon: Users,
    title: "Conhecer meu vereador",
    message: "Quem é o vereador da minha região e como posso entrar em contato?",
    color: "text-purple-500",
  },
  {
    icon: Building2,
    title: "Avaliar serviço público",
    message: "Como posso avaliar um serviço público que utilizei recentemente?",
    color: "text-orange-500",
  },
];

const ChatEmptyState = ({ onSuggestionClick }: ChatEmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <AIAvatar />
      
      <h2 className="mt-6 text-2xl font-semibold text-center">
        Como posso ajudar você hoje?
      </h2>
      
      <p className="mt-2 text-muted-foreground text-center max-w-md">
        Pergunte sobre projetos de lei, vereadores, audiências públicas, serviços públicos e muito mais.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 w-full max-w-3xl">
        {suggestions.map((suggestion) => {
          const Icon = suggestion.icon;
          return (
            <Card
              key={suggestion.title}
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors group"
              onClick={() => onSuggestionClick(suggestion.message)}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-muted group-hover:scale-110 transition-transform ${suggestion.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm mb-1">{suggestion.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {suggestion.message}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ChatEmptyState;
