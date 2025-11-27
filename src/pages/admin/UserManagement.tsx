import { useState } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search } from 'lucide-react';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { UserRoleModal } from '@/components/admin/UserRoleModal';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveTable } from '@/components/admin/ResponsiveTable';
import { AdminUser } from '@/hooks/useAdminUsers';

const roleColors: Record<string, string> = {
  admin: 'bg-red-500/10 text-red-500 border-red-500/20',
  gestor: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  vereador: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  assessor: 'bg-green-500/10 text-green-500 border-green-500/20',
  cidadao: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  gestor: 'Gestor',
  vereador: 'Vereador',
  assessor: 'Assessor',
  cidadao: 'Cidadão',
};

export default function UserManagement() {
  const { users, loading, searchTerm, setSearchTerm, roleFilter, setRoleFilter } = useAdminUsers();
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Gestão de Usuários</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Gerencie roles e permissões dos usuários do sistema
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar por role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Roles</SelectItem>
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
                header: 'Roles',
                accessor: (user) => (
                  <div className="flex flex-wrap gap-1">
                    {user.roles.length > 0 ? (
                      user.roles.map((role) => (
                        <Badge key={role} variant="outline" className={roleColors[role]}>
                          {roleLabels[role]}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Sem role</span>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedUser(user)}
                  >
                    Editar Roles
                  </Button>
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
                    <span className="text-sm text-muted-foreground">Sem role</span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setSelectedUser(user)}
                >
                  Editar Roles
                </Button>
              </div>
            )}
          />
        )}

        {selectedUser && (
          <UserRoleModal
            user={selectedUser}
            open={!!selectedUser}
            onClose={() => setSelectedUser(null)}
          />
        )}
      </div>
    </AdminLayout>
  );
}
