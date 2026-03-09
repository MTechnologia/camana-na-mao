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

        console.log('[usePublicProfile] RPC Response:', { data, rpcError });

        if (rpcError) {
          console.error('[usePublicProfile] RPC Error:', rpcError);
          throw rpcError;
        }

        // Verificar se retornou erro (função retorna JSONB com 'error' e 'message')
        if (data && typeof data === 'object') {
          // Verificar se é um objeto de erro
          if ('error' in data && 'message' in data) {
            const errorData = data as { error: string; message: string };
            console.log('[usePublicProfile] Profile is private:', errorData);
            setError(errorData.message || 'Este perfil não está disponível publicamente');
            setProfile(null);
            return;
          }

          // Verificar se tem os campos esperados de um perfil válido
          if (!('id' in data) || !('full_name' in data)) {
            console.error('[usePublicProfile] Invalid profile data:', data);
            setError('Dados do perfil inválidos');
            setProfile(null);
            return;
          }
        }

        // Converter para tipo PublicProfile
        const profileData = data as { id: string; full_name?: string; avatar_url?: string; email?: string; phone?: string; created_at?: string; is_own_profile?: boolean; profile_visibility?: string };
        console.log('[usePublicProfile] Profile loaded:', {
          id: profileData.id,
          is_own_profile: profileData.is_own_profile,
          profile_visibility: profileData.profile_visibility,
          has_email: !!profileData.email,
          has_phone: !!profileData.phone,
        });

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
      } catch (err: unknown) {
        console.error("[usePublicProfile] Error loading public profile:", err);
        setError(err instanceof Error ? err.message : "Erro ao carregar perfil");
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadPublicProfile();
  }, [userId, user]);

  return { profile, loading, error };
};
