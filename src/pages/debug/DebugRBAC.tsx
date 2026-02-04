import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole, type UserRole } from '@/hooks/useUserRole';

type DebugRoleRead = {
  via: 'table' | 'rpc';
  roles: UserRole[];
  error?: string;
};

function safeHost(url: string | undefined): string {
  if (!url) return '(missing CAMARA_URL)';
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export default function DebugRBAC() {
  const { user } = useAuth();
  const roleState = useUserRole();
  const [loading, setLoading] = useState(true);
  const [reads, setReads] = useState<DebugRoleRead[]>([]);

  const supabaseHost = useMemo(() => {
    const url = import.meta.env.CAMARA_URL ?? import.meta.env.VITE_SUPABASE_URL;
    return safeHost(url);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        if (!user) {
          if (!cancelled) {
            setReads([]);
            setLoading(false);
          }
          return;
        }

        const next: DebugRoleRead[] = [];

        // 1) Table read
        const tableRes = await supabase.from('user_roles').select('role').eq('user_id', user.id);
        if (tableRes.error) {
          next.push({ via: 'table', roles: [], error: tableRes.error.message });
        } else {
          const roles = (tableRes.data || []).map((r) => r.role as UserRole);
          next.push({ via: 'table', roles });
        }

        // 2) RPC read
        const rpcRes = await supabase.rpc('get_user_roles', { _user_id: user.id });
        if (rpcRes.error) {
          next.push({ via: 'rpc', roles: [], error: rpcRes.error.message });
        } else {
          const roles = (rpcRes.data || []).map((r) => r as UserRole);
          next.push({ via: 'rpc', roles });
        }

        if (!cancelled) setReads(next);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50 pt-[60px] max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-2">Debug RBAC</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Página de diagnóstico (não altera nada). Use para confirmar ambiente Supabase, usuário logado e roles lidas.
      </p>

      <div className="rounded-lg border bg-white p-4 space-y-2">
        <div className="text-sm">
          <span className="font-semibold">Supabase host:</span> <span className="font-mono">{supabaseHost}</span>
        </div>
        <div className="text-sm">
          <span className="font-semibold">User email:</span>{' '}
          <span className="font-mono">{user?.email || '(not logged in)'}</span>
        </div>
        <div className="text-sm">
          <span className="font-semibold">User id:</span>{' '}
          <span className="font-mono">{user?.id || '(not logged in)'}</span>
        </div>
      </div>

      <div className="mt-6 rounded-lg border bg-white p-4">
        <h2 className="text-lg font-semibold mb-3">useUserRole() (app)</h2>
        <div className="text-sm space-y-1">
          <div>
            <span className="font-semibold">loading:</span> {String(roleState.loading)}
          </div>
          <div>
            <span className="font-semibold">roles:</span>{' '}
            <span className="font-mono">{roleState.roles.join(', ') || '(empty)'}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-2">
            <div>
              <span className="font-semibold">isCidadaoEngajado:</span> {String(roleState.isCidadaoEngajado)}
            </div>
            <div>
              <span className="font-semibold">canViewDashboards:</span> {String(roleState.canViewDashboards)}
            </div>
            <div>
              <span className="font-semibold">canCreateDashboards:</span> {String(roleState.canCreateDashboards)}
            </div>
            <div>
              <span className="font-semibold">canReferToCouncilMember:</span> {String(roleState.canReferToCouncilMember)}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border bg-white p-4">
        <h2 className="text-lg font-semibold mb-3">Leitura direta (diagnóstico)</h2>
        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : reads.length === 0 ? (
          <div className="text-sm text-muted-foreground">Faça login para ver as roles.</div>
        ) : (
          <div className="space-y-3">
            {reads.map((r) => (
              <div key={r.via} className="rounded border p-3">
                <div className="text-sm">
                  <span className="font-semibold">via:</span> <span className="font-mono">{r.via}</span>
                </div>
                <div className="text-sm">
                  <span className="font-semibold">roles:</span>{' '}
                  <span className="font-mono">{r.roles.join(', ') || '(empty)'}</span>
                </div>
                {r.error ? (
                  <div className="text-sm mt-1">
                    <span className="font-semibold">error:</span>{' '}
                    <span className="font-mono text-red-600">{r.error}</span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 text-sm text-muted-foreground">
        Dica: se aqui aparecer “roles: (empty)”, mas você “tem certeza” que é engajado, então o usuário/role foi criado em
        outro projeto Supabase (mesmo email, UUID diferente).
      </div>
    </div>
  );
}

