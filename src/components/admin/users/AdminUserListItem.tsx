import {
  Building,
  MoreHorizontal,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PermissionGate } from '@/components/auth/PermissionGate';
import type { AdminUser } from '@/hooks/useAdminUsers';
import { adminUserRoleColors, adminUserRoleLabels } from '@/components/admin/users/adminUserLabels';
import { cn } from '@/lib/utils';

type AdminUserListItemProps = {
  user: AdminUser;
  onEdit: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
  onSuspend: (user: AdminUser) => void;
  onReactivate: (user: AdminUser) => void;
  onLinkGabinete: (user: AdminUser) => void;
};

export function AdminUserListItem({
  user,
  onEdit,
  onDelete,
  onSuspend,
  onReactivate,
  onLinkGabinete,
}: AdminUserListItemProps) {
  const joined = new Date(user.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const showGabinete =
    user.roles.includes('vereador') || user.roles.includes('assessor');

  return (
    <li
      className={cn(
        'group transition-colors',
        'max-sm:rounded-xl max-sm:border max-sm:border-border/80 max-sm:bg-background max-sm:shadow-sm',
        'sm:border-0 sm:shadow-none',
        'hover:bg-muted/30 sm:hover:bg-muted/40',
      )}
    >
      <div className="flex flex-col gap-3 p-4 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(140px,220px)_72px_140px] sm:items-center sm:gap-4 sm:px-4 sm:py-3 md:grid-cols-[minmax(0,1fr)_minmax(160px,260px)_88px_140px] md:px-5">
        <div className="flex min-w-0 items-center gap-3 sm:col-span-1">
          <Avatar className="h-10 w-10 shrink-0 border border-border/60 sm:h-9 sm:w-9">
            <AvatarImage src={user.avatar_url || undefined} alt="" />
            <AvatarFallback className="bg-muted text-sm font-medium">
              {user.full_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{user.full_name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email || 'Sem e-mail'}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground/80 sm:hidden">
              Cadastro · {joined}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:justify-start">
          {user.roles.length > 0 ? (
            user.roles.map((role) => (
              <Badge
                key={role}
                variant="outline"
                className={cn('h-6 px-2 text-[11px] font-medium', adminUserRoleColors[role])}
              >
                {adminUserRoleLabels[role] ?? role}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">Sem perfil</span>
          )}
          {user.suspended_at ? (
            <Badge
              variant="outline"
              className="h-6 gap-1 border-destructive/30 bg-destructive/10 px-2 text-[11px] text-destructive"
            >
              <ShieldOff className="h-3 w-3" aria-hidden />
              Suspenso
            </Badge>
          ) : null}
        </div>

        <p className="hidden text-xs tabular-nums text-muted-foreground sm:block">
          {joined}
        </p>

        <div className="flex items-center gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 flex-1 sm:flex-none"
            onClick={() => onEdit(user)}
          >
            Editar
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                aria-label={`Mais ações para ${user.full_name}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {showGabinete ? (
                <PermissionGate permission="users.link_gabinete">
                  <DropdownMenuItem onClick={() => onLinkGabinete(user)}>
                    <Building className="mr-2 h-4 w-4" />
                    {user.council_member_id ? 'Editar gabinete' : 'Vincular gabinete'}
                  </DropdownMenuItem>
                </PermissionGate>
              ) : null}
              <PermissionGate permission="users.suspend">
                {user.suspended_at ? (
                  <DropdownMenuItem onClick={() => onReactivate(user)}>
                    <ShieldCheck className="mr-2 h-4 w-4 text-green-600" />
                    Reativar conta
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onSuspend(user)}>
                    <ShieldOff className="mr-2 h-4 w-4 text-destructive" />
                    Suspender conta
                  </DropdownMenuItem>
                )}
              </PermissionGate>
              <PermissionGate permission="users.delete">
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(user)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </PermissionGate>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </li>
  );
}
