import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  facetToParams,
  paramsToFacet,
  type FacetKey,
} from "@/lib/analyticsFilters";

/**
 * HU-14.6 — Hook que sincroniza um facet com a URL via prefixo `f.{key}.`.
 *
 * Cada aba (Criticidade, Eficiência, Audiências) chama com sua chave:
 *
 *   const [facet, setFacet] = useFacetUrlState<CriticidadeFacet>("crit", initial);
 *
 * Vantagens:
 *   - URL serializa SOMENTE o facet daquela aba (não polui com outras)
 *   - Trocar de aba preserva o facet da aba anterior na URL
 *   - Compartilhar URL preserva o estado completo
 *   - Voltar/avançar do browser funciona naturalmente
 */
export function useFacetUrlState<T extends Record<string, unknown>>(
  key: FacetKey,
  defaultValue: T,
): [T, (next: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = useMemo(() => {
    const parsed = paramsToFacet(key, searchParams);
    // Mescla defaults para garantir as keys do tipo T
    return { ...defaultValue, ...parsed } as T;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, key]);

  const setValue = useCallback(
    (next: T) => {
      const newParams = new URLSearchParams(searchParams);
      // Remove todas as keys do facet atual
      for (const name of Array.from(newParams.keys())) {
        if (name.startsWith(`f.${key}.`)) newParams.delete(name);
      }
      // Adiciona as novas
      const facetParams = facetToParams(key, next);
      for (const [name, val] of facetParams.entries()) {
        newParams.set(name, val);
      }
      setSearchParams(newParams, { replace: true });
    },
    [searchParams, setSearchParams, key],
  );

  return [value, setValue];
}
