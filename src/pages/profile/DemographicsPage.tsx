import { useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "@/components/ui/page-header";
import DemographicsForm from "@/components/profile/DemographicsForm";
import { useAuth } from "@/contexts/AuthContext";
import {
  isInInviteSetupFlow,
  nextInviteStep,
} from "@/lib/inviteSetupFlow";

const DemographicsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  if (!user) return null;

  const inInviteFlow = isInInviteSetupFlow(searchParams);
  const handleSaved = inInviteFlow
    ? () => {
        const next = nextInviteStep("/perfil/dados-demograficos");
        navigate(next ?? "/", { replace: true });
      }
    : undefined;

  return (
    <div className="min-h-screen bg-background pt-[60px]">
      <PageHeader
        title="Dados Demográficos"
        backTo={inInviteFlow ? undefined : "/perfil"}
      />

      <div className="p-6">
        {inInviteFlow && (
          <p className="text-xs text-muted-foreground mb-4">
            Etapa 4 de 4 — Última! Estes dados ajudam a análise agregada do
            sistema. Você pode pular pular campos opcionais e completar depois.
          </p>
        )}
        <DemographicsForm userId={user.id} onSaved={handleSaved} />
      </div>
    </div>
  );
};

export default DemographicsPage;
