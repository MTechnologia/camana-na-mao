import { ArrowRight, UserCheck } from "lucide-react";
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
    { key: 'basic', label: 'Informações Pessoais', completed: status.basic, path: '/perfil/dados-pessoais' },
    { key: 'interests', label: 'Interesses', completed: status.interests, path: '/perfil/interesses' },
    { key: 'demographics', label: 'Dados Demográficos', completed: status.demographics, path: '/perfil/dados-demograficos' },
    { key: 'address', label: 'Endereço', completed: status.address, path: '/perfil/endereco' },
  ];

  const nextStep = steps.find(step => !step.completed);

  return (
    <button
      onClick={() => nextStep && navigate(nextStep.path)}
      className="w-full flex items-center gap-2.5 p-3 rounded-lg bg-secondary/10 border border-secondary/20 hover:bg-secondary/15 transition-colors text-left"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
        <UserCheck className="h-4 w-4 text-secondary" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs font-medium text-foreground">Complete seu perfil</span>
          <span className="text-xs font-bold text-secondary">{status.percentage}%</span>
        </div>
        <Progress value={status.percentage} className="h-1" />
      </div>
      
      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </button>
  );
};

export default ProfileCompletionCard;
