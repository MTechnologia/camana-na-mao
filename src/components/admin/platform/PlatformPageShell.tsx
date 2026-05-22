import type { ReactNode } from 'react';
import { PlatformPageHeader } from '@/components/admin/platform/PlatformPageHeader';
import { PlatformSubNav } from '@/components/admin/platform/PlatformSubNav';

type PlatformPageShellProps = {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function PlatformPageShell({ title, actions, children }: PlatformPageShellProps) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-6 lg:gap-8">
      <PlatformPageHeader title={title} actions={actions} />
      <PlatformSubNav />
      {children}
    </div>
  );
}
