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
      // Get old roles for audit log
      const oldRoles = users.find(u => u.id === userId)?.roles || [];
      
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

      // Register audit log
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'update',
          entity_type: 'user_role',
          entity_id: userId,
          old_values: { roles: oldRoles },
          new_values: { roles: newRoles },
          user_agent: navigator.userAgent
        });
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

      // Delete user roles
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (rolesError) {
        console.warn('Error deleting user roles (user may already be cascade deleted):', rolesError);
      }

      // Delete user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) {
        console.warn('Error deleting profile (user may already be cascade deleted):', profileError);
      }

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
