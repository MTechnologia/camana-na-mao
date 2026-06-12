import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Mapa de "pais de rota": para cada padrão de rota, qual é a tela anterior
 * lógica. Usado como fallback determinístico quando NÃO há histórico de
 * navegação dentro do app (deep link, notificação, reload), caso em que
 * `navigate(-1)` levaria para fora do app ou para a tela errada (NREF054).
 *
 * A ordem importa: a primeira regex que casar vence (padrões mais específicos
 * primeiro).
 */
const ROUTE_PARENTS: Array<[RegExp, string]> = [
  // Serviços / avaliações
  [/^\/servico\/[^/]+/, "/servicos-proximos"],
  [/^\/servicos\/favoritos/, "/perfil"],
  [/^\/avaliacoes\/historico/, "/perfil"],
  [/^\/avaliar/, "/servicos-proximos"],
  // Audiências
  [/^\/audiencias\/[^/]+\/participar/, "/audiencias"],
  [/^\/audiencias\/[^/]+/, "/audiencias"],
  // Institucional (detalhes → listagem)
  [/^\/institucional\/noticias\/[^/]+/, "/institucional/noticias"],
  [/^\/institucional\/vereadores\/[^/]+/, "/institucional/vereadores"],
  [/^\/institucional\/.+/, "/"],
  // Perfil e configurações (sub-páginas → perfil)
  [/^\/perfil\/.+/, "/perfil"],
  [/^\/configuracoes\/.+/, "/perfil"],
  // Relatos (transporte e urbano)
  [/^\/transporte\/.+/, "/relatos"],
  [/^\/relato-urbano\/.+/, "/relato-urbano"],
  // Conversas / busca / notificações (telas de topo → home)
  [/^\/conversas/, "/"],
  [/^\/busca/, "/"],
  [/^\/notificacoes/, "/"],
  // Painéis analíticos
  [/^\/paineis\/.+/, "/paineis"],
];

/** Resolve o pai lógico de uma rota; fallback final é a home. */
export function parentRoute(pathname: string): string {
  for (const [pattern, parent] of ROUTE_PARENTS) {
    if (pattern.test(pathname)) return parent;
  }
  return "/";
}

/**
 * Retorna um handler de "Voltar" determinístico:
 * - se `explicitBackTo` for informado, navega para ele;
 * - se houver histórico de navegação dentro do app, usa `navigate(-1)`
 *   (comportamento idêntico ao anterior — sem regressão);
 * - caso contrário (deep link / reload / sem histórico), navega para o pai
 *   lógico da rota atual.
 */
export function useSmartBack(explicitBackTo?: string) {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    if (explicitBackTo) {
      navigate(explicitBackTo);
      return;
    }
    // React Router (history v5) mantém um índice incremental em history.state.
    // idx > 0 significa que há uma entrada anterior criada dentro do app.
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof idx === "number" && idx > 0) {
      navigate(-1);
      return;
    }
    navigate(parentRoute(location.pathname));
  }, [navigate, location.pathname, explicitBackTo]);
}
