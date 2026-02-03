import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PublicProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  is_own_profile: boolean;
  profile_visibility: 'public' | 'private' | 'friends';
}

interface UsePublicProfileResult {
  profile: PublicProfile | null;
  loading: boolean;
  error: string | null;
}

export const usePublicProfile = (userId: string | null): UsePublicProfileResult => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadPublicProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        // Chamar função RPC
        const { data, error: rpcError } = await supabase.rpc('get_public_profile', {
          target_user_id: userId
        });

        if (rpcError) {
          throw rpcError;
        }

        // Verificar se retornou erro
        if (data && typeof data === 'object' && 'error' in data) {
          setError((data as any).message || 'Erro ao carregar perfil');
          setProfile(null);
          return;
        }

        // Converter para tipo PublicProfile
        const profileData = data as any;
        setProfile({
          id: profileData.id,
          full_name: profileData.full_name || 'Usuário',
          avatar_url: profileData.avatar_url,
          email: profileData.email,
          phone: profileData.phone,
          created_at: profileData.created_at,
          is_own_profile: profileData.is_own_profile || false,
          profile_visibility: profileData.profile_visibility || 'public',
        });
      } catch (err: any) {
        console.error("Error loading public profile:", err);
        setError(err.message || "Erro ao carregar perfil");
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadPublicProfile();
  }, [userId, user]);

  return { profile, loading, error };
};
