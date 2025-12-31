import PageHeader from "@/components/ui/page-header";
import AddressForm from "@/components/profile/AddressForm";
import { useAuth } from "@/contexts/AuthContext";

const AddressPage = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pt-[60px]">
      <PageHeader title="Endereço" backTo="/perfil" />

      <div className="p-6">
        <AddressForm userId={user.id} />
      </div>
    </div>
  );
};

export default AddressPage;
