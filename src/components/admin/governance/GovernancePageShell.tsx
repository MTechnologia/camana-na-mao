import type { ReactNode } from 'react';
import { GovernancePageHeader } from '@/components/admin/governance/GovernancePageHeader';
import { GovernanceSubNav } from '@/components/admin/governance/GovernanceSubNav';

type GovernancePageShellProps = {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function GovernancePageShell({ title, actions, children }: GovernancePageShellProps) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-6 lg:gap-8">
      <GovernancePageHeader title={title} actions={actions} />
      <GovernanceSubNav />
      {children}
    </div>
  );
}
