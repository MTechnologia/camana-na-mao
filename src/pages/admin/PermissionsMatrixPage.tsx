import { useMemo, useState } from 'react';
import { Check, Loader2, RotateCcw, Save, Search, Shield, X } from 'lucide-react';
import { toast } from 'sonner';
import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  ALL_ROLES,
  DOMAIN_LABELS,
  PERMISSIONS,
  ROLE_LABELS,
  type PermissionDomain,
} from '@/lib/permissions';
import {
  ADMIN_REQUIRED_PERMISSION_KEYS,
  isPermissionGranted,
  matrixEquals,
  togglePermission,
} from '@/lib/rolePermissionsMatrix';
import { useRolePermissionsMatrix } from '@/hooks/useRolePermissionsMatrix';
import type { UserRole } from '@/hooks/useUserRole';

const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  admin: 'bg-red-500/10 text-red-700 border-red-500/30',
  gestor: 'bg-purple-500/10 text-purple-700 border-purple-500/30',
  vereador: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  assessor: 'bg-green-500/10 text-green-700 border-green-500/30',
  cidadao_engajado: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  cidadao: 'bg-gray-500/10 text-gray-700 border-gray-500/30',
};

/**
 * HU-11.2 — Matriz de permissões (edição + persistência em role_permissions).
 */
export function PermissionsMatrixPage() {
  const {
    saved,
    draft,
    setDraft,
    isLoading,
    isSaving,
    error,
    load,
    save,
    resetDraft,
  } = useRolePermissionsMatrix();
  const [search, setSearch] = useState('');

  const dirty = useMemo(() => {
    if (!saved || !draft) return false;
    return !matrixEquals(saved, draft);
  }, [saved, draft]);

  const grouped = useMemo(() => {
    const acc: Record<PermissionDomain, typeof PERMISSIONS> = {
      users: [],
      reports: [],
      triage: [],
      exports: [],
      analytics: [],
      audiences: [],
      gabinete: [],
      system: [],
    };
    for (const p of PERMISSIONS) acc[p.domain].push(p);
    return acc;
  }, []);

  const filteredDomains = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return grouped;
    const result = { ...grouped };
    for (const domain of Object.keys(result) as PermissionDomain[]) {
      result[domain] = result[domain].filter((p) => {
        const hay = `${p.key} ${p.label} ${p.description}`.toLowerCase();
        return hay.includes(q);
      });
    }
    return result;
  }, [grouped, search]);

  const handleToggle = (role: UserRole, permissionKey: string) => {
    if (!draft) return;
    const granted = isPermissionGranted(draft, role, permissionKey);
    if (
      !granted
      && role === 'admin'
      && (ADMIN_REQUIRED_PERMISSION_KEYS as readonly string[]).includes(permissionKey)
    ) {
      toast.message('Esta permissão é obrigatória para o papel Admin.');
      return;
    }
    setDraft(togglePermission(draft, role, permissionKey, !granted));
  };

  const handleSave = async () => {
    const ok = await save();
    if (ok) {
      toast.success('Matriz de permissões salva.');
      void load();
    } else {
      toast.error('Não foi possível salvar a matriz.');
    }
  };

  return (
    <PageShell
      title="Matriz de permissões"
      description="Defina quais papéis podem executar cada ação. As alterações valem para o painel e para as regras do banco (RLS/RPC)."
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Badge variant="outline" className="text-xs h-7 px-3">
          <Shield className="h-3 w-3 mr-1" />
          {PERMISSIONS.length} permissões · {ALL_ROLES.length} papéis
        </Badge>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!dirty || isSaving || isLoading}
            onClick={() => {
              resetDraft();
              toast.message('Alterações descartadas.');
            }}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Descartar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!dirty || isSaving || isLoading || !draft}
            onClick={() => void handleSave()}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Salvar matriz
          </Button>
        </div>
      </div>

      {dirty ? (
        <p className="mb-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-100">
          Há alterações não salvas. Usuários já logados podem precisar atualizar a página para ver o
          efeito no painel.
        </p>
      ) : null}

      {error ? (
        <p className="mb-3 text-sm text-destructive">{error}</p>
      ) : null}

      <Card className="p-3 mb-4">
        <div className="relative max-w-md">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por chave, rótulo ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </Card>

      {isLoading || !draft ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        Object.entries(filteredDomains)
          .filter(([, list]) => list.length > 0)
          .map(([domain, list]) => (
            <Card key={domain} className="overflow-hidden mb-4">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h2 className="text-sm font-semibold">
                  {DOMAIN_LABELS[domain as PermissionDomain]}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/20">
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2 font-medium min-w-[280px]">Permissão</th>
                      {ALL_ROLES.map((role) => (
                        <th
                          key={role}
                          className="px-2 py-2 font-medium text-center w-[100px]"
                        >
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] h-5', ROLE_BADGE_CLASS[role])}
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
                          <p className="text-sm font-medium">{p.label}</p>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {p.description}
                          </p>
                          <code className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded">
                            {p.key}
                          </code>
                        </td>
                        {ALL_ROLES.map((role) => {
                          const allowed = isPermissionGranted(draft, role, p.key);
                          const locked =
                            role === 'admin'
                            && (ADMIN_REQUIRED_PERMISSION_KEYS as readonly string[]).includes(
                              p.key,
                            );
                          return (
                            <td key={role} className="px-2 py-2 text-center">
                              <button
                                type="button"
                                className={cn(
                                  'mx-auto flex h-8 w-8 items-center justify-center rounded-md border transition-colors',
                                  allowed
                                    ? 'border-green-500/40 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950/30'
                                    : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted',
                                  locked && 'cursor-not-allowed opacity-80',
                                )}
                                title={
                                  locked
                                    ? 'Obrigatória para Admin'
                                    : allowed
                                      ? `Remover de ${ROLE_LABELS[role]}`
                                      : `Conceder a ${ROLE_LABELS[role]}`
                                }
                                disabled={locked}
                                onClick={() => handleToggle(role, p.key)}
                                aria-pressed={allowed}
                              >
                                {allowed ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <X className="h-3 w-3 opacity-40" />
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))
      )}
    </PageShell>
  );
}

export default PermissionsMatrixPage;
