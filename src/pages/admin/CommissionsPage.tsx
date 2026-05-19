import { Navigate, useSearchParams } from 'react-router-dom';

/** Redireciona para Análise de Encaminhamentos → aba Comissões. */
export function CommissionsPage() {
  const [params] = useSearchParams();
  const q = params.toString();
  return <Navigate to={q ? `/admin/referrals?tab=comissoes&${q}` : '/admin/referrals?tab=comissoes'} replace />;
}
