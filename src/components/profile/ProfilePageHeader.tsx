import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";

interface ProfilePageHeaderProps {
  subtitle?: string;
}

const ProfilePageHeader = ({ subtitle = "Editando perfil" }: ProfilePageHeaderProps) => {
  const { user } = useAuth();
  const { profile, getInitials } = useProfile();

  return (
    <div className="flex items-center gap-3 mb-4 px-1">
      <Avatar className="h-9 w-9 border-2 border-primary/20">
        <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name} />
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
          {profile?.full_name ? getInitials(profile.full_name) : user?.email?.[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">
          {profile?.full_name || user?.email}
        </p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
};

export default ProfilePageHeader;
