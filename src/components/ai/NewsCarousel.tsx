import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { noticias, categoryConfig } from "@/data/noticias";

const NewsCarousel = () => {
  const navigate = useNavigate();

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        Novidades
      </h3>
      
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6">
        {noticias.map((item, index) => {
          const IconComponent = item.icon;
          const categoryStyle = categoryConfig[item.category];
          
          return (
            <div
              key={item.id}
              onClick={() => navigate(`/institucional/noticias/${item.id}`)}
              className="flex-shrink-0 w-64 bg-card rounded-xl border border-border p-4 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer relative"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {item.isNew && (
                <Badge variant="secondary" className="absolute top-3 right-3 text-xs">
                  NOVO
                </Badge>
              )}
              
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <IconComponent className="w-5 h-5 text-primary" />
                </div>
                <Badge 
                  variant="outline" 
                  className={`text-[10px] border ${categoryStyle.color}`}
                >
                  {categoryStyle.label}
                </Badge>
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
