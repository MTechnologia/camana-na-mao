import type { ReactNode } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";

type AdminPageShellProps = {
  embedded?: boolean;
  children: ReactNode;
};

/** Em rotas com `AdminAppLayout`, use `embedded` para não duplicar o shell. */
export function AdminPageShell({ embedded, children }: AdminPageShellProps) {
  if (embedded) return <>{children}</>;
  return <AdminLayout>{children}</AdminLayout>;
}
