import { FileText, Vote, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface NewsItem {
  id: number;
  icon: typeof FileText;
  title: string;
  description: string;
  time: string;
  isNew: boolean;
  source: string;
}

const LegislativeNews = () => {
  const news: NewsItem[] = [
    {
      id: 1,
      icon: Vote,
      title: "Votação Importante",
      description: "Projeto de mobilidade urbana aprovado",
      time: "Há 2 horas",
      isNew: true,
      source: "Portal da Câmara",
    },
    {
      id: 2,
      icon: FileText,
      title: "Nova Lei Publicada",
      description: "Lei de incentivo à cultura sancionada",
      time: "Há 5 horas",
      isNew: true,
      source: "Diário Oficial",
    },
    {
      id: 3,
      icon: Calendar,
      title: "Sessão Extraordinária",
      description: "Agenda definida para próxima semana",
      time: "Há 1 dia",
      isNew: false,
      source: "Portal da Câmara",
    },
  ];

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        📰 Novidades Legislativas
      </h3>
      
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6">
        {news.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <div
              key={item.id}
              className="flex-shrink-0 w-64 bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <IconComponent className="w-5 h-5 text-primary" />
                </div>
                {item.isNew && (
                  <Badge variant="secondary" className="text-xs">
                    NOVO
                  </Badge>
                )}
              </div>
              
              <h4 className="font-semibold text-foreground mb-1 text-sm">
                {item.title}
              </h4>
              <p className="text-xs text-muted-foreground mb-2">
                {item.description}
              </p>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{item.time}</span>
                <span className="text-primary text-[10px]">
                  📍 {item.source}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LegislativeNews;
