import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['app_role'];

export interface AdminUser {
  id: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  roles: UserRole[];
  email?: string;
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

      // Combine data
      const usersWithRoles: AdminUser[] = profiles.map((profile) => {
        const roles = (userRoles
          ?.filter((ur) => ur.user_id === profile.id)
          .map((ur) => ur.role) || []) as UserRole[];

        return {
          ...profile,
          roles,
          email: undefined, // Email info requires admin API
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

  const updateUserRoles = async (userId: string, newRoles: UserRole[]) => {
    try {
      // Delete existing roles
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Insert new roles
      if (newRoles.length > 0) {
        const rolesToInsert = newRoles.map((role) => ({
          user_id: userId,
          role,
        }));

        const { error: insertError } = await supabase
          .from('user_roles')
          .insert(rolesToInsert);

        if (insertError) throw insertError;
      }

      toast.success('Roles atualizados com sucesso');
      await fetchUsers();
    } catch (error) {
      console.error('Error updating roles:', error);
      toast.error('Erro ao atualizar roles');
      throw error;
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      // Delete user roles first
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (rolesError) throw rolesError;

      // Delete user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;

      toast.success('Usuário excluído com sucesso');
      await fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Erro ao excluir usuário');
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
