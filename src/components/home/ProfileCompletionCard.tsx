import { CheckCircle2, ArrowRight, User, MapPin, Heart, Settings } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";

interface ProfileCompletionCardProps {
  status: {
    basic: boolean;
    interests: boolean;
    demographics: boolean;
    address: boolean;
    percentage: number;
  };
}

const ProfileCompletionCard = ({ status }: ProfileCompletionCardProps) => {
  const navigate = useNavigate();

  // Só mostra se o perfil não está 100% completo
  if (status.percentage === 100) return null;

  const steps = [
    { key: 'basic', label: 'Informações básicas', icon: User, completed: status.basic, path: '/profile/personal' },
    { key: 'interests', label: 'Interesses', icon: Heart, completed: status.interests, path: '/profile/preferences' },
    { key: 'demographics', label: 'Dados demográficos', icon: Settings, completed: status.demographics, path: '/profile/demographics' },
    { key: 'address', label: 'Endereço', icon: MapPin, completed: status.address, path: '/profile/address' },
  ];

  const nextStep = steps.find(step => !step.completed);

  return (
    <Card className="p-5 bg-gradient-to-br from-secondary/10 via-secondary/5 to-background border-secondary/20 animate-fade-in">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h3 className="font-semibold text-foreground text-sm mb-1">Complete seu Perfil</h3>
          <p className="text-xs text-muted-foreground">
            {status.percentage}% concluído
          </p>
        </div>
        <div className="text-2xl font-bold text-secondary">
          {status.percentage}%
        </div>
      </div>

      <Progress value={status.percentage} className="h-2 mb-4" />

      <div className="space-y-2 mb-4">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex items-center gap-2 text-xs">
              {step.completed ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-muted" />
              )}
              <span className={step.completed ? "text-muted-foreground line-through" : "text-foreground"}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {nextStep && (
        <Button 
          onClick={() => navigate(nextStep.path)}
          variant="secondary"
          className="w-full"
          size="sm"
        >
          Continuar
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      )}
    </Card>
  );
};

export default ProfileCompletionCard;
