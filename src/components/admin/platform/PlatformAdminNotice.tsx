export function PlatformAdminNotice() {
  return (
    <p className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
      Somente perfil <strong>admin</strong> pode editar e publicar. Alterações são por ambiente
      (produção / homologação) e registradas em auditoria no backend.
    </p>
  );
}
