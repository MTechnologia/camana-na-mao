import PageHeader from "@/components/ui/page-header";
import DemographicsForm from "@/components/profile/DemographicsForm";
import { useAuth } from "@/contexts/AuthContext";

const DemographicsPage = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pt-[60px]">
      <PageHeader title="Dados Demográficos" backTo="/profile" />

      <div className="p-6">
        <DemographicsForm userId={user.id} />
      </div>
    </div>
  );
};

export default DemographicsPage;
