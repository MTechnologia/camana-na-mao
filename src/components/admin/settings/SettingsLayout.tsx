import type { ReactNode } from "react";
import { useConfigEnvironment } from "@/contexts/ConfigEnvironmentContext";
import { EnvironmentSwitcher } from "@/components/admin/settings/EnvironmentSwitcher";
import { PageShell } from "@/components/ui/PageShell";
import { Badge } from "@/components/ui/badge";

type SettingsLayoutProps = {
  title: string;
  description: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function SettingsLayout({ title, description, children, actions }: SettingsLayoutProps) {
  const { environmentLabel, environment } = useConfigEnvironment();

  return (
    <PageShell
      title={title}
      description={description}
      actions={
        <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
          <Badge variant={environment === "production" ? "default" : "secondary"}>
            {environmentLabel}
          </Badge>
          <EnvironmentSwitcher />
          {actions}
        </div>
      }
    >
      <p className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
        Somente perfil <strong>admin</strong> pode editar e publicar. Alterações são por ambiente
        (produção / homologação) e registradas em auditoria no backend.
      </p>
      {children}
    </PageShell>
  );
}
