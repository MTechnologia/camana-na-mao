import UserManagement from '@/pages/admin/UserManagement';
import { GovernancePageShell } from '@/components/admin/governance/GovernancePageShell';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { useState } from 'react';
import { InviteUserDialog } from '@/components/admin/InviteUserDialog';

export function UserManagementPage() {
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <GovernancePageShell
      title="Usuários e perfis"
      actions={
        <PermissionGate permission="users.invite">
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" aria-hidden />
            Convidar usuário
          </Button>
        </PermissionGate>
      }
    >
      <UserManagement embedded inviteOpen={inviteOpen} onInviteOpenChange={setInviteOpen} />
    </GovernancePageShell>
  );
}
