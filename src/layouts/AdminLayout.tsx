import { ReactNode, useState } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { useIsMobile } from '@/hooks/use-mobile';

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/20">
      <AdminSidebar 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen}
        isMobile={isMobile}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader 
          onMenuClick={() => setMobileOpen(true)}
          isMobile={isMobile}
        />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
