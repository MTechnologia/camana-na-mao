import { FileText, Vote, Calendar, Bus, Palette, Heart, BookOpen, Leaf } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type NewsCategory = 'legislativo' | 'mobilidade' | 'cultura' | 'saude' | 'educacao' | 'ambiente';

interface NewsItem {
  id: number;
  icon: typeof FileText;
  title: string;
  description: string;
  time: string;
  isNew: boolean;
  source: string;
  category: NewsCategory;
}

const categoryConfig: Record<NewsCategory, { label: string; color: string }> = {
  legislativo: { label: "Legislativo", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  mobilidade: { label: "Mobilidade", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  cultura: { label: "Cultura", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  saude: { label: "Saúde", color: "bg-red-500/10 text-red-600 border-red-500/20" },
  educacao: { label: "Educação", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  ambiente: { label: "Meio Ambiente", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
};

const NewsCarousel = () => {
  const news: NewsItem[] = [
    {
      id: 1,
      icon: Vote,
      title: "Votação Importante",
      description: "Projeto de mobilidade urbana aprovado",
      time: "Há 2 horas",
      isNew: true,
      source: "Portal da Câmara",
      category: "legislativo",
    },
    {
      id: 2,
      icon: Bus,
      title: "Nova Linha de Ônibus",
      description: "Corredor expresso conecta zona sul ao centro",
      time: "Há 4 horas",
      isNew: true,
      source: "SPTrans",
      category: "mobilidade",
    },
    {
      id: 3,
      icon: Palette,
      title: "Lei de Incentivo à Cultura",
      description: "Sancionada nova lei de fomento às artes",
      time: "Há 5 horas",
      isNew: true,
      source: "Secretaria de Cultura",
      category: "cultura",
    },
    {
      id: 4,
      icon: Heart,
      title: "Ampliação de UBS",
      description: "Novas unidades de saúde na zona leste",
      time: "Há 1 dia",
      isNew: false,
      source: "Secretaria de Saúde",
      category: "saude",
    },
    {
      id: 5,
      icon: BookOpen,
      title: "Programa Escola Digital",
      description: "Tablets serão distribuídos para estudantes",
      time: "Há 1 dia",
      isNew: false,
      source: "Secretaria de Educação",
      category: "educacao",
    },
    {
      id: 6,
      icon: Leaf,
      title: "Parque Urbano Inaugurado",
      description: "Novo espaço verde aberto à comunidade",
      time: "Há 2 dias",
      isNew: false,
      source: "Secretaria do Verde",
      category: "ambiente",
    },
  ];

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        📰 Novidades
      </h3>
      
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6">
        {news.map((item, index) => {
          const IconComponent = item.icon;
          const categoryStyle = categoryConfig[item.category];
          
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
                <div className="flex flex-col gap-1">
                  {item.isNew && (
                    <Badge variant="secondary" className="text-xs w-fit">
                      NOVO
                    </Badge>
                  )}
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] w-fit border ${categoryStyle.color}`}
                  >
                    {categoryStyle.label}
                  </Badge>
                </div>
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

export default NewsCarousel;
