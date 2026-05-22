import { Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminUserListItem } from '@/components/admin/users/AdminUserListItem';
import type { AdminUser } from '@/hooks/useAdminUsers';

type AdminUsersListProps = {
  users: AdminUser[];
  loading?: boolean;
  onEdit: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
  onSuspend: (user: AdminUser) => void;
  onReactivate: (user: AdminUser) => void;
  onLinkGabinete: (user: AdminUser) => void;
};

export function AdminUsersList({
  users,
  loading,
  onEdit,
  onDelete,
  onSuspend,
  onReactivate,
  onLinkGabinete,
}: AdminUsersListProps) {
  if (loading) {
    return (
      <div className="space-y-2 p-4 md:p-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] w-full rounded-lg sm:h-14 sm:rounded-none" />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Users className="h-6 w-6 text-muted-foreground" aria-hidden />
        </div>
        <p className="text-sm font-medium text-foreground">Nenhum usuário encontrado</p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          Ajuste a busca ou o filtro de perfil para ver outros resultados.
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className="hidden border-b border-border/80 bg-muted/20 px-5 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(140px,220px)_72px_140px] sm:items-center sm:gap-4 md:grid-cols-[minmax(0,1fr)_minmax(160px,260px)_88px_140px]"
        aria-hidden
      >
        <span>Usuário</span>
        <span className="text-right sm:text-left">Perfil</span>
        <span className="hidden lg:block">Cadastro</span>
        <span className="text-right">Ações</span>
      </div>

      <ul className="divide-y divide-border/80 max-sm:space-y-2 max-sm:divide-y-0 max-sm:p-3">
        {users.map((user) => (
          <AdminUserListItem
            key={user.id}
            user={user}
            onEdit={onEdit}
            onDelete={onDelete}
            onSuspend={onSuspend}
            onReactivate={onReactivate}
            onLinkGabinete={onLinkGabinete}
          />
        ))}
      </ul>
    </>
  );
}
