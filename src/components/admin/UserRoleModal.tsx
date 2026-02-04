import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AdminUser } from '@/hooks/useAdminUsers';
import { Badge } from '@/components/ui/badge';
import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['app_role'];

interface UserRoleModalProps {
  user: AdminUser;
  open: boolean;
  onClose: () => void;
  onUpdateRoles: (userId: string, roles: UserRole[]) => Promise<void>;
}

const availableRoles: Array<{ value: UserRole; label: string; description: string; color: string }> = [
  { value: 'admin', label: 'Admin', description: 'Controle total do sistema', color: 'bg-red-500' },
  { value: 'gestor', label: 'Gestor', description: 'Análises avançadas e gestão', color: 'bg-purple-500' },
  { value: 'vereador', label: 'Vereador', description: 'Acesso aos dados do gabinete', color: 'bg-blue-500' },
  { value: 'assessor', label: 'Assessor', description: 'Suporte ao gabinete', color: 'bg-green-500' },
  { value: 'cidadao_engajado', label: 'Cidadão Engajado', description: 'Pode criar dashboards e encaminhar para vereadores', color: 'bg-yellow-500' },
  { value: 'cidadao', label: 'Cidadão', description: 'Acesso público padrão', color: 'bg-gray-500' },
];

export const UserRoleModal = ({ user, open, onClose, onUpdateRoles }: UserRoleModalProps) => {
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(user.roles);
  const [loading, setLoading] = useState(false);

  const handleToggleRole = (role: UserRole) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onUpdateRoles(user.id, selectedRoles);
      onClose();
    } catch (error) {
      console.error('Error updating roles:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Roles de {user.full_name}</DialogTitle>
          <DialogDescription>
            Selecione os roles que este usuário deve ter. Um usuário pode ter múltiplos roles.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {availableRoles.map((role) => (
            <div
              key={role.value}
              className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
            >
              <Checkbox
                id={role.value}
                checked={selectedRoles.includes(role.value)}
                onCheckedChange={() => handleToggleRole(role.value)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Label
                    htmlFor={role.value}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {role.label}
                  </Label>
                  <div className={`w-2 h-2 rounded-full ${role.color}`}></div>
                </div>
                <p className="text-xs text-muted-foreground">{role.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-sm font-medium mb-2">Roles atuais:</p>
          <div className="flex flex-wrap gap-2">
            {selectedRoles.length > 0 ? (
              selectedRoles.map((role) => {
                const roleInfo = availableRoles.find((r) => r.value === role);
                return (
                  <Badge key={role} variant="outline">
                    {roleInfo?.label || role}
                  </Badge>
                );
              })
            ) : (
              <span className="text-sm text-muted-foreground">Nenhum role selecionado</span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
