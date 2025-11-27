import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/ui/page-header";
import InterestsForm from "@/components/profile/InterestsForm";
import { useAuth } from "@/contexts/AuthContext";

const InterestsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pt-[60px]">
      <PageHeader title="Interesses" backTo="/profile" />

      <div className="p-6">
        <InterestsForm 
          userId={user.id} 
          onSuccess={() => navigate("/profile")}
        />
      </div>
    </div>
  );
};

export default InterestsPage;
