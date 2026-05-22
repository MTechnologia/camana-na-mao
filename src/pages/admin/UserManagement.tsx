import { useState } from 'react';
import { AdminPageShell } from '@/components/admin/AdminPageShell';
import { AdminUsersList } from '@/components/admin/users/AdminUsersList';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { UserRoleModal } from '@/components/admin/UserRoleModal';
import { DeleteUserDialog } from '@/components/admin/DeleteUserDialog';
import { InviteUserDialog } from '@/components/admin/InviteUserDialog';
import { SuspendUserDialog } from '@/components/admin/SuspendUserDialog';
import { GabineteLinkDialog } from '@/components/admin/GabineteLinkDialog';
import { adminUserRoleLabels } from '@/components/admin/users/adminUserLabels';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { AdminUser } from '@/hooks/useAdminUsers';

type UserManagementProps = {
  embedded?: boolean;
  inviteOpen?: boolean;
  onInviteOpenChange?: (open: boolean) => void;
};

export default function UserManagement({
  embedded,
  inviteOpen: inviteOpenProp,
  onInviteOpenChange,
}: UserManagementProps = {}) {
  const {
    users,
    loading,
    searchTerm,
    setSearchTerm,
    roleFilter,
    setRoleFilter,
    updateUserRoles,
    deleteUser,
    refetch,
  } = useAdminUsers();
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [userToSuspend, setUserToSuspend] = useState<AdminUser | null>(null);
  const [userForGabinete, setUserForGabinete] = useState<AdminUser | null>(null);
  const [inviteOpenInternal, setInviteOpenInternal] = useState(false);
  const inviteOpen = inviteOpenProp ?? inviteOpenInternal;
  const setInviteOpen = onInviteOpenChange ?? setInviteOpenInternal;
  const [deleting, setDeleting] = useState(false);

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      await deleteUser(userToDelete.id);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleReactivate = async (user: AdminUser) => {
    try {
      const { error } = await supabase.rpc('reactivate_user', { _target_id: user.id });
      if (error) throw error;
      toast.success(`${user.full_name} reativado.`);
      refetch?.();
    } catch (err) {
      console.error('[reactivate]', err);
      const msg = err instanceof Error ? err.message : 'Erro desconhecido.';
      toast.error(`Não foi possível reativar: ${msg}`);
    }
  };

  return (
    <AdminPageShell embedded={embedded}>
      <section
        aria-label="Lista de usuários"
        className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm"
      >
        <div className="space-y-3 border-b border-border/80 px-4 py-4 md:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 border-border/80 bg-background pl-9"
                aria-label="Buscar usuários"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-9 w-full border-border/80 sm:w-48">
                <SelectValue placeholder="Filtrar por perfil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os perfis</SelectItem>
                {Object.entries(adminUserRoleLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            {loading ? 'Carregando…' : `${users.length} usuário${users.length === 1 ? '' : 's'}`}
          </p>
        </div>

        <AdminUsersList
          users={users}
          loading={loading}
          onEdit={setSelectedUser}
          onDelete={setUserToDelete}
          onSuspend={setUserToSuspend}
          onReactivate={(user) => void handleReactivate(user)}
          onLinkGabinete={setUserForGabinete}
        />
      </section>

      {selectedUser ? (
        <UserRoleModal
          user={selectedUser}
          open={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdateRoles={updateUserRoles}
        />
      ) : null}

      <DeleteUserDialog
        open={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleDeleteUser}
        userName={userToDelete?.full_name || ''}
        loading={deleting}
      />

      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvited={() => refetch?.()}
      />

      <SuspendUserDialog
        open={!!userToSuspend}
        onOpenChange={(o) => !o && setUserToSuspend(null)}
        targetUserId={userToSuspend?.id ?? null}
        targetUserName={userToSuspend?.full_name ?? null}
        onSuspended={() => refetch?.()}
      />

      <GabineteLinkDialog
        open={!!userForGabinete}
        onOpenChange={(o) => !o && setUserForGabinete(null)}
        targetUserId={userForGabinete?.id ?? null}
        targetUserName={userForGabinete?.full_name ?? null}
        targetUserRole={
          userForGabinete?.roles.find((r) => r === 'vereador' || r === 'assessor') ?? null
        }
        currentCouncilMemberId={userForGabinete?.council_member_id ?? null}
        onSaved={() => refetch?.()}
      />
    </AdminPageShell>
  );
}
