import { AdminLayout } from '@/layouts/AdminLayout';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Filter } from 'lucide-react';
import { useState } from 'react';
import { UserRoleModal } from '@/components/admin/UserRoleModal';
import { AdminUser } from '@/hooks/useAdminUsers';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Gestão de Usuários
          </h1>
          <p className="text-muted-foreground">
            Gerencie roles e permissões dos usuários do sistema.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="gestor">Gestor</SelectItem>
              <SelectItem value="vereador">Vereador</SelectItem>
              <SelectItem value="assessor">Assessor</SelectItem>
              <SelectItem value="cidadao">Cidadão</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando usuários...</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>{user.full_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {user.roles.length > 0 ? (
                          user.roles.map((role) => (
                            <Badge
                              key={role}
                              variant="outline"
                              className={roleColors[role] || ''}
                            >
                              {roleLabels[role] || role}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Sem role</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedUser(user)}
                      >
                        Editar Roles
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
