import type { ReactNode } from 'react';
import { useConfigEnvironment } from '@/contexts/ConfigEnvironmentContext';
import { EnvironmentSwitcher } from '@/components/admin/settings/EnvironmentSwitcher';
import { PlatformAdminNotice } from '@/components/admin/platform/PlatformAdminNotice';
import { PlatformPageHeader } from '@/components/admin/platform/PlatformPageHeader';
import { PlatformSubNav } from '@/components/admin/platform/PlatformSubNav';
import { Badge } from '@/components/ui/badge';

type SettingsLayoutProps = {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function SettingsLayout({ title, description, children, actions }: SettingsLayoutProps) {
  const { environmentLabel, environment } = useConfigEnvironment();

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 lg:gap-8">
      <PlatformPageHeader
        title={title}
        description={description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={environment === 'production' ? 'default' : 'secondary'}>
              {environmentLabel}
            </Badge>
            <EnvironmentSwitcher />
            {actions}
          </div>
        }
      />
      <PlatformSubNav />
      <PlatformAdminNotice />
      {children}
    </div>
  );
}
