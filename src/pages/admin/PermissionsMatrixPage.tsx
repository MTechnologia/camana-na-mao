import { useMemo, useState } from "react";
import { Check, Lock, Search, Shield, X } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ALL_ROLES,
  DOMAIN_LABELS,
  PERMISSIONS,
  ROLE_LABELS,
  groupPermissionsByDomain,
  type PermissionDomain,
} from "@/lib/permissions";
import type { UserRole } from "@/hooks/useUserRole";

/**
 * HU-11.2 — Página /admin/permissions.
 *
 * Matriz read-only: linhas = permissões agrupadas por domínio, colunas = roles.
 * Cada célula mostra check verde quando o role tem a permissão.
 *
 * A fonte da verdade é src/lib/permissions.ts. Para alterar, mude o catálogo
 * e crie nova migration que faça seed da tabela role_permissions.
 */

const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  admin: "bg-red-500/10 text-red-700 border-red-500/30",
  gestor: "bg-purple-500/10 text-purple-700 border-purple-500/30",
  vereador: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  assessor: "bg-green-500/10 text-green-700 border-green-500/30",
  cidadao_engajado: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  cidadao: "bg-gray-500/10 text-gray-700 border-gray-500/30",
};

export default function PermissionsMatrixPage() {
  const [search, setSearch] = useState("");

  const grouped = useMemo(() => groupPermissionsByDomain(), []);
  const totalPermissions = PERMISSIONS.length;

  const filteredDomains = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return grouped;

    const result: Record<PermissionDomain, typeof PERMISSIONS> = {
      users: [],
      reports: [],
      triage: [],
      exports: [],
      analytics: [],
      audiences: [],
      gabinete: [],
      system: [],
    };
    for (const [domain, list] of Object.entries(grouped) as [
      PermissionDomain,
      typeof PERMISSIONS,
    ][]) {
      result[domain] = list.filter((p) => {
        const hay = `${p.key} ${p.label} ${p.description}`.toLowerCase();
        return hay.includes(q);
      });
    }
    return result;
  }, [grouped, search]);

  const filteredCount = useMemo(
    () => Object.values(filteredDomains).reduce((acc, arr) => acc + arr.length, 0),
    [filteredDomains],
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Matriz de permissões
            </h1>
            <p className="text-muted-foreground">
              Visualização completa de quais papéis podem realizar cada ação.
              Para alterar, edite{" "}
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                src/lib/permissions.ts
              </code>{" "}
              e gere uma nova migration.
            </p>
          </div>
          <Badge variant="outline" className="text-xs h-7 px-3">
            <Lock className="h-3 w-3 mr-1" />
            {totalPermissions} permissões
          </Badge>
        </div>

        <Card className="p-3">
          <div className="relative max-w-md">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por chave, rótulo ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          {search && (
            <p className="text-xs text-muted-foreground mt-2">
              {filteredCount} de {totalPermissions} permissões correspondem.
            </p>
          )}
        </Card>

        {Object.entries(filteredDomains)
          .filter(([, list]) => list.length > 0)
          .map(([domain, list]) => (
            <Card key={domain} className="overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h2 className="text-sm font-semibold">
                  {DOMAIN_LABELS[domain as PermissionDomain]}
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  {list.length} permiss{list.length === 1 ? "ão" : "ões"}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/20">
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2 font-medium min-w-[280px]">
                        Permissão
                      </th>
                      {ALL_ROLES.map((role) => (
                        <th
                          key={role}
                          className="px-2 py-2 font-medium text-center w-[100px]"
                        >
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] h-5", ROLE_BADGE_CLASS[role])}
                          >
                            {ROLE_LABELS[role]}
                          </Badge>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((p) => (
                      <tr key={p.key} className="border-t border-border/60">
                        <td className="px-4 py-2.5">
                          <div>
                            <p className="text-sm font-medium">{p.label}</p>
                            <p className="text-[11px] text-muted-foreground line-clamp-1">
                              {p.description}
                            </p>
                            <code className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded">
                              {p.key}
                            </code>
                          </div>
                        </td>
                        {ALL_ROLES.map((role) => {
                          const allowed = p.roles.includes(role);
                          return (
                            <td
                              key={role}
                              className={cn(
                                "px-2 py-2.5 text-center",
                                allowed && "bg-green-50 dark:bg-green-950/20",
                              )}
                              title={
                                allowed
                                  ? `${ROLE_LABELS[role]} tem ${p.key}`
                                  : `${ROLE_LABELS[role]} não tem ${p.key}`
                              }
                            >
                              {allowed ? (
                                <Check className="h-4 w-4 text-green-600 mx-auto" />
                              ) : (
                                <X className="h-3 w-3 text-muted-foreground/40 mx-auto" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}

        {filteredCount === 0 && search && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma permissão corresponde à busca &quot;{search}&quot;.
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
