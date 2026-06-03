import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/ui/page-header";
import InterestsForm from "@/components/profile/InterestsForm";
import ProfilePageHeader from "@/components/profile/ProfilePageHeader";
import { useAuth } from "@/contexts/AuthContext";

const InterestsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pt-[60px]">
      <PageHeader title="Interesses" backTo="/perfil" />

      <div className="p-4 space-y-4">
        <ProfilePageHeader subtitle="Áreas de interesse e preferências" />
        <InterestsForm userId={user.id} onSuccess={() => navigate("/perfil")} />
      </div>
    </div>
  );
};

export default InterestsPage;
