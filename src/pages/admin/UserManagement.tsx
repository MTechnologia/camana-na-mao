import { useState } from 'react';
import { AdminPageShell } from '@/components/admin/AdminPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Building,
  MoreVertical,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useAdminUsers, AdminUser } from '@/hooks/useAdminUsers';
import { UserRoleModal } from '@/components/admin/UserRoleModal';
import { DeleteUserDialog } from '@/components/admin/DeleteUserDialog';
import { InviteUserDialog } from '@/components/admin/InviteUserDialog';
import { SuspendUserDialog } from '@/components/admin/SuspendUserDialog';
import { GabineteLinkDialog } from '@/components/admin/GabineteLinkDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveTable } from '@/components/admin/ResponsiveTable';
import { usePermissions } from '@/hooks/usePermission';

const roleColors: Record<string, string> = {
  admin: 'bg-red-500/10 text-red-500 border-red-500/20',
  gestor: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  vereador: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  assessor: 'bg-green-500/10 text-green-500 border-green-500/20',
  cidadao_engajado: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  cidadao: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  gestor: 'Gestor',
  vereador: 'Vereador',
  assessor: 'Assessor',
  cidadao_engajado: 'Cidadão Engajado',
  cidadao: 'Cidadão',
};

export default function UserManagement({ embedded }: { embedded?: boolean } = {}) {
  const {
    users,
    vereadorSlotsByCouncilId,
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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { results: permissions, loading: permissionsLoading } = usePermissions([
    'users.invite',
    'users.update_role',
    'users.link_gabinete',
    'users.suspend',
    'users.delete',
  ]);
  const canInviteUser = permissions['users.invite'];
  const canUpdateRole = permissions['users.update_role'];
  const canLinkGabinete = permissions['users.link_gabinete'];
  const canSuspendUser = permissions['users.suspend'];
  const canDeleteUser = permissions['users.delete'];

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
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Gestão de Usuários</h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">
              Gerencie o perfil e as permissões dos usuários do sistema
            </p>
          </div>
          {canInviteUser && !permissionsLoading ? (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Convidar usuário
            </Button>
          ) : null}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar por perfil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Perfis</SelectItem>
              {Object.entries(roleLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <ResponsiveTable
            data={users}
            keyExtractor={(user) => user.id}
            columns={[
              {
                header: 'Usuário',
                accessor: (user) => (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>{user.full_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{user.full_name}</span>
                  </div>
                ),
              },
              {
                header: 'Email',
                accessor: (user) => user.email || 'N/A',
                hideOnMobile: true,
              },
              {
                header: 'Perfil',
                accessor: (user) => (
                  <div className="flex flex-wrap gap-1">
                    {user.roles.length > 0 ? (
                      user.roles.map((role) => (
                        <Badge key={role} variant="outline" className={roleColors[role]}>
                          {roleLabels[role]}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Sem perfil</span>
                    )}
                    {user.suspended_at && (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                        <ShieldOff className="h-3 w-3 mr-1" />
                        Suspenso
                      </Badge>
                    )}
                  </div>
                ),
              },
              {
                header: 'Cadastro',
                accessor: (user) => new Date(user.created_at).toLocaleDateString('pt-BR'),
                hideOnMobile: true,
              },
              {
                header: 'Ações',
                accessor: (user) => (
                  <div className="flex items-center gap-2">
                    {canUpdateRole ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedUser(user)}
                      >
                        Editar Perfil
                      </Button>
                    ) : null}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canLinkGabinete &&
                          (user.roles.includes('vereador') || user.roles.includes('assessor')) && (
                            <DropdownMenuItem onClick={() => setUserForGabinete(user)}>
                              <Building className="h-4 w-4 mr-2" />
                              {user.council_member_id ? 'Editar gabinete' : 'Vincular a gabinete'}
                            </DropdownMenuItem>
                        )}
                        {canSuspendUser
                          ? (user.suspended_at ? (
                              <DropdownMenuItem onClick={() => void handleReactivate(user)}>
                                <ShieldCheck className="h-4 w-4 mr-2 text-green-600" />
                                Reativar conta
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => setUserToSuspend(user)}>
                                <ShieldOff className="h-4 w-4 mr-2 text-destructive" />
                                Suspender conta
                              </DropdownMenuItem>
                            ))
                          : null}
                        {canDeleteUser ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setUserToDelete(user)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ),
              },
            ]}
            renderMobileCard={(user) => (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>{user.full_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.full_name}</p>
                    {user.email ? (
                      <p className="text-sm text-muted-foreground truncate" title={user.email}>
                        {user.email}
                      </p>
                    ) : null}
                    <p className="text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {user.roles.length > 0 ? (
                    user.roles.map((role) => (
                      <Badge key={role} variant="outline" className={roleColors[role]}>
                        {roleLabels[role]}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Sem perfil</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {canUpdateRole ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedUser(user)}
                    >
                      Editar Perfil
                    </Button>
                  ) : null}
                  {canDeleteUser ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground hover:bg-muted hover:scale-110 transition-all duration-200"
                      onClick={() => setUserToDelete(user)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            )}
          />
        )}

        {selectedUser && (
          <UserRoleModal
            user={selectedUser}
            open={!!selectedUser}
            onClose={() => setSelectedUser(null)}
            onUpdateRoles={updateUserRoles}
            vereadorSlotsByCouncilId={vereadorSlotsByCouncilId}
          />
        )}

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
      </div>
    </AdminPageShell>
  );
}
