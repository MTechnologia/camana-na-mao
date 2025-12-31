import PageHeader from "@/components/ui/page-header";
import PreferencesForm from "@/components/profile/PreferencesForm";
import { useAuth } from "@/contexts/AuthContext";

const PreferencesPage = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pt-[60px]">
      <PageHeader title="Configurações" backTo="/perfil" />

      <div className="p-6">
        <PreferencesForm userId={user.id} />
      </div>
    </div>
  );
};

export default PreferencesPage;
