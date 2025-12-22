import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/ui/page-header";

import { Card } from "@/components/ui/card";
import { MessageSquare, FileText, History } from "lucide-react";

export default function UrbanReportPage() {
  const navigate = useNavigate();

  const options = [
    {
      id: 1,
      title: "Conversar com IA",
      description: "Relate problemas urbanos com ajuda inteligente da IA",
      icon: MessageSquare,
      color: "text-purple-500",
      bgColor: "bg-purple-50",
      path: "/?journey=urban_report"
    },
    {
      id: 2,
      title: "Relato Manual",
      description: "Preencha um formulário tradicional para reportar problemas",
      icon: FileText,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
      path: "/relato-urbano/manual"
    },
    {
      id: 3,
      title: "Meus Relatos",
      description: "Visualize e acompanhe seus relatos anteriores",
      icon: History,
      color: "text-orange-500",
      bgColor: "bg-orange-50",
      path: "/relato-urbano/historico"
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-24 pt-[60px]">
      <PageHeader title="Relatos Urbanos" />
      
      <div className="p-4">
        {/* Hero Section */}
        <Card className="p-6 mb-6 bg-gradient-to-br from-pink-50 to-purple-50 border-pink-100">
          <div className="text-center">
            <div className="text-4xl mb-3">🏙️</div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Melhore sua cidade
            </h2>
            <p className="text-sm text-muted-foreground">
              Relate problemas urbanos e ajude a construir uma cidade melhor para todos
            </p>
          </div>
        </Card>

        {/* Options */}
        <div className="space-y-3">
          {options.map((option) => {
            const IconComponent = option.icon;
            return (
              <Card
                key={option.id}
                className="p-4 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                onClick={() => navigate(option.path)}
              >
                <div className="flex items-start gap-4">
                  <div className={`${option.bgColor} p-3 rounded-xl flex-shrink-0`}>
                    <IconComponent className={`w-6 h-6 ${option.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground mb-1">
                      {option.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

    </div>
  );
}
