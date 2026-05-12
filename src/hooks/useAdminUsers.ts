import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['app_role'];

const ROLE_PRIORITY: UserRole[] = [
  'admin',
  'gestor',
  'vereador',
  'assessor',
  'cidadao_engajado',
  'cidadao',
];

const normalizeSingleRole = (roles: UserRole[]): UserRole[] => {
  const uniqueRoles = Array.from(new Set(roles));
  const normalized = ROLE_PRIORITY.find((role) => uniqueRoles.includes(role));
  return normalized ? [normalized] : [];
};

export interface AdminUser {
  id: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  roles: UserRole[];
  email?: string;
  council_member_id?: string | null;
  council_member_role?: Extract<UserRole, 'vereador' | 'assessor'> | null;
  // HU-11.1 — Suspensão de conta
  suspended_at?: string | null;
  suspended_reason?: string | null;
}

export const useAdminUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const { data: emailRows, error: emailsError } = await supabase.rpc('admin_user_emails');
      if (emailsError) {
        console.error('admin_user_emails', emailsError);
      }
      const emailByUserId = new Map(
        (emailRows ?? []).map((row) => [row.user_id, row.email?.trim() || undefined])
      );

      const { data: gabineteLinks, error: gabineteLinksError } = await supabase
        .from('vereador_user_links')
        .select('user_id, council_member_id, role');

      if (gabineteLinksError) throw gabineteLinksError;

      const gabineteLinkByUserId = new Map(
        (gabineteLinks ?? []).map((link) => [link.user_id, link])
      );

      // Combine data
      const usersWithRoles: AdminUser[] = profiles.map((profile) => {
        const roles = normalizeSingleRole((userRoles
          ?.filter((ur) => ur.user_id === profile.id)
          .map((ur) => ur.role) || []) as UserRole[]);
        const gabineteLink = gabineteLinkByUserId.get(profile.id);

        return {
          ...profile,
          roles,
          email: emailByUserId.get(profile.id),
          council_member_id: gabineteLink?.council_member_id ?? null,
          council_member_role: (gabineteLink?.role as Extract<UserRole, 'vereador' | 'assessor'> | undefined) ?? null,
          // HU-11.1 — profiles agora tem suspended_at / suspended_reason
          suspended_at: (profile as { suspended_at?: string | null }).suspended_at ?? null,
          suspended_reason: (profile as { suspended_reason?: string | null }).suspended_reason ?? null,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateUserRoles = async (
    userId: string,
    newRole: UserRole | null,
    councilMemberId?: string | null,
  ) => {
    try {
      // Get old roles for audit log
      const currentUser = users.find(u => u.id === userId);
      const oldRoles = currentUser?.roles || [];
      const oldCouncilMemberId = currentUser?.council_member_id ?? null;
      const gabineteRole = newRole === 'vereador' || newRole === 'assessor'
        ? newRole
        : null;

      if (gabineteRole && !councilMemberId) {
        throw new Error('Selecione o vereador vinculado para este usuário.');
      }
      
      // Delete existing roles
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Insert new roles
      if (newRole) {
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: newRole,
          });

        if (insertError) throw insertError;
      }

      if (gabineteRole && councilMemberId) {
        const { error: upsertLinkError } = await supabase
          .from('vereador_user_links')
          .upsert(
            {
              user_id: userId,
              council_member_id: councilMemberId,
              role: gabineteRole,
            },
            { onConflict: 'user_id' },
          );

        if (upsertLinkError) throw upsertLinkError;
      } else {
        const { error: deleteLinkError } = await supabase
          .from('vereador_user_links')
          .delete()
          .eq('user_id', userId);

        if (deleteLinkError) throw deleteLinkError;
      }

      // Register audit log
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'update',
          entity_type: 'user_role',
          entity_id: userId,
          old_values: { roles: oldRoles, council_member_id: oldCouncilMemberId },
          new_values: { roles: newRole ? [newRole] : [], council_member_id: councilMemberId ?? null },
          user_agent: navigator.userAgent
        });
      }

      toast.success('Perfil atualizado com sucesso');
      await fetchUsers();
    } catch (error: unknown) {
      console.error('Error updating roles:', error);
      const err = error as { code?: string; message?: string };
      if (err?.code === '23503') {
        toast.error('Usuário não encontrado (pode ter sido excluído). Atualize a lista.');
        await fetchUsers();
        return;
      }
      toast.error('Erro ao atualizar perfil');
      throw error;
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      // Get user data for audit log
      const userToDelete = users.find(u => u.id === userId);
      
      // Call Edge Function to delete from auth.users (requires service_role)
      const { data, error: functionError } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (functionError) {
        console.error('Error calling delete-user function:', functionError);
        throw new Error(functionError.message || 'Erro ao excluir usuário');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // user_roles e profiles já são apagados pela Edge Function delete-user

      // Register audit log
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'delete',
          entity_type: 'user',
          entity_id: userId,
          old_values: userToDelete ? { full_name: userToDelete.full_name, roles: userToDelete.roles } : null,
          user_agent: navigator.userAgent
        });
      }

      toast.success('Usuário excluído com sucesso');
      await fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir usuário');
      throw error;
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.roles.includes(roleFilter as UserRole);
    return matchesSearch && matchesRole;
  });

  return {
    users: filteredUsers,
    loading,
    searchTerm,
    setSearchTerm,
    roleFilter,
    setRoleFilter,
    updateUserRoles,
    deleteUser,
    refetch: fetchUsers,
  };
};
