import PageHeader from "@/components/ui/page-header";
import PreferencesForm from "@/components/profile/PreferencesForm";
import ProfilePageHeader from "@/components/profile/ProfilePageHeader";
import { useAuth } from "@/contexts/AuthContext";

const PreferencesPage = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pt-[60px]">
      <PageHeader title="Preferências" backTo="/perfil" />

      <div className="p-4 space-y-4">
        <ProfilePageHeader subtitle="Notificações e privacidade" />
        <PreferencesForm userId={user.id} />
      </div>
    </div>
  );
};

export default PreferencesPage;
