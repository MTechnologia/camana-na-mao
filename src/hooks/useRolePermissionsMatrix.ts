import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  assignmentsFromMatrix,
  matrixFromRolePermissionRows,
  type RolePermissionMatrix,
  type RolePermissionRow,
} from '@/lib/rolePermissionsMatrix';

export function useRolePermissionsMatrix() {
  const [saved, setSaved] = useState<RolePermissionMatrix | null>(null);
  const [draft, setDraft] = useState<RolePermissionMatrix | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: qErr } = await supabase
        .from('role_permissions')
        .select('role, permission_key');
      if (qErr) throw qErr;

      const rows = (data ?? []) as RolePermissionRow[];
      const matrix = matrixFromRolePermissionRows(rows);
      setSaved(matrix);
      setDraft(matrix);
    } catch (err) {
      console.error('[useRolePermissionsMatrix] load', err);
      setError('Não foi possível carregar a matriz de permissões.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async () => {
    if (!draft) return false;
    setIsSaving(true);
    setError(null);
    try {
      const assignments = assignmentsFromMatrix(draft);
      const { error: rpcErr } = await supabase.rpc('sync_role_permissions_matrix', {
        p_assignments: assignments,
      });
      if (rpcErr) throw rpcErr;

      const { data: refreshed, error: reloadErr } = await supabase
        .from('role_permissions')
        .select('role, permission_key');
      if (reloadErr) throw reloadErr;

      const matrix = matrixFromRolePermissionRows((refreshed ?? []) as RolePermissionRow[]);
      setSaved(matrix);
      setDraft(matrix);
      return true;
    } catch (err) {
      console.error('[useRolePermissionsMatrix] save', err);
      const msg = err instanceof Error ? err.message : 'Erro ao salvar.';
      setError(msg.includes('permission denied') ? 'Sem permissão para editar a matriz.' : msg);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [draft]);

  const resetDraft = useCallback(() => {
    if (saved) setDraft(saved);
  }, [saved]);

  return {
    saved,
    draft,
    setDraft,
    isLoading,
    isSaving,
    error,
    load,
    save,
    resetDraft,
  };
}
