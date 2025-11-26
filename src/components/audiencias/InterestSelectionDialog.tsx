import { useState } from "react";
import { Heart, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface InterestSelectionDialogProps {
  open: boolean;
  onClose: () => void;
}

interface Interest {
  id: string;
  label: string;
  description: string;
  icon: string;
}

const interests: Interest[] = [
  {
    id: "mobilidade",
    label: "Mobilidade Urbana",
    description: "Transporte público, ciclovias e trânsito",
    icon: "🚌",
  },
  {
    id: "educacao",
    label: "Educação",
    description: "Escolas, creches e programas educacionais",
    icon: "📚",
  },
  {
    id: "saude",
    label: "Saúde",
    description: "UBS, hospitais e saúde preventiva",
    icon: "🏥",
  },
  {
    id: "meio-ambiente",
    label: "Meio Ambiente",
    description: "Sustentabilidade, áreas verdes e resíduos",
    icon: "🌱",
  },
  {
    id: "cultura",
    label: "Cultura",
    description: "Arte, eventos culturais e patrimônio",
    icon: "🎭",
  },
  {
    id: "seguranca",
    label: "Segurança Pública",
    description: "Policiamento, iluminação e vigilância",
    icon: "🛡️",
  },
  {
    id: "assistencia-social",
    label: "Assistência Social",
    description: "Programas sociais e direitos humanos",
    icon: "🤝",
  },
  {
    id: "habitacao",
    label: "Habitação",
    description: "Moradia popular e regularização fundiária",
    icon: "🏘️",
  },
];

const InterestSelectionDialog = ({ open, onClose }: InterestSelectionDialogProps) => {
  const { toast } = useToast();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleInterest = (interestId: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interestId)
        ? prev.filter((id) => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleSubmit = async () => {
    if (selectedInterests.length === 0) {
      toast({
        title: "Selecione pelo menos um tema",
        description: "Escolha os temas de seu interesse para continuar.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    // Simulação de salvamento
    setTimeout(() => {
      toast({
        title: "Temas registrados com sucesso!",
        description: `Você receberá notificações sobre ${selectedInterests.length} tema(s) de interesse.`,
      });
      setIsLoading(false);
      setSelectedInterests([]);
      onClose();
    }, 1000);
  };

  const handleSkip = () => {
    setSelectedInterests([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Seus temas de interesse
          </DialogTitle>
          <DialogDescription>
            Selecione os temas que mais interessam a você. Receberá notificações sobre novas
            audiências públicas relacionadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {interests.map((interest) => (
            <div
              key={interest.id}
              className={`flex items-start gap-4 p-4 rounded-lg border transition-all cursor-pointer ${
                selectedInterests.includes(interest.id)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
              onClick={() => handleToggleInterest(interest.id)}
            >
              <Checkbox
                id={interest.id}
                checked={selectedInterests.includes(interest.id)}
                onCheckedChange={() => handleToggleInterest(interest.id)}
                className="mt-1"
              />
              <div className="flex-1">
                <Label
                  htmlFor={interest.id}
                  className="flex items-center gap-2 font-medium cursor-pointer"
                >
                  <span className="text-xl">{interest.icon}</span>
                  {interest.label}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">{interest.description}</p>
              </div>
              {selectedInterests.includes(interest.id) && (
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
              )}
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
          <p>
            <strong>🔔 Notificações:</strong> Você receberá avisos sobre novas audiências apenas
            dos temas selecionados, respeitando o horário entre 8h e 20h.
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={handleSkip} className="flex-1" disabled={isLoading}>
            Pular esta etapa
          </Button>
          <Button onClick={handleSubmit} className="flex-1" disabled={isLoading}>
            {isLoading ? "Salvando..." : `Registrar (${selectedInterests.length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InterestSelectionDialog;
