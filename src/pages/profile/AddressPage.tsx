import { useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "@/components/ui/page-header";
import AddressForm from "@/components/profile/AddressForm";
import ProfilePageHeader from "@/components/profile/ProfilePageHeader";
import { useAuth } from "@/contexts/AuthContext";
import {
  isInInviteSetupFlow,
  nextInviteStep,
} from "@/lib/inviteSetupFlow";

const AddressPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  if (!user) return null;

  const inInviteFlow = isInInviteSetupFlow(searchParams);
  const handleSaved = inInviteFlow
    ? () => {
        const next = nextInviteStep("/perfil/endereco");
        navigate(next ?? "/", { replace: true });
      }
    : undefined;

  return (
    <div className="min-h-screen bg-background pt-[60px]">
      <PageHeader title="Endereço" backTo={inInviteFlow ? undefined : "/perfil"} />

      <div className="p-4 space-y-4">
        <ProfilePageHeader subtitle="Seu endereço" />
        {inInviteFlow && (
          <p className="text-xs text-muted-foreground">
            Etapa 3 de 4 — Após salvar, completaremos seus dados demográficos.
          </p>
        )}
        <AddressForm userId={user.id} onSaved={handleSaved} />
      </div>
    </div>
  );
};

export default AddressPage;
