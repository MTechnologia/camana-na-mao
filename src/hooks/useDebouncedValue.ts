import { useEffect, useState } from "react";

/**
 * HU-5.3 — Debounce genérico de um valor reativo.
 *
 * Retorna o valor mais recente apenas após `delay` ms sem novas mudanças.
 * Útil para filtros granulares (categorias / bairros / zonas) — evita
 * disparar `fetchData` a cada checkbox marcado durante uma multisseleção.
 *
 * Uso:
 *   const debouncedFilters = useDebouncedValue(granularFilters, 300);
 *   useEffect(() => { ... }, [debouncedFilters]);
 *
 * Notas:
 *  - A referência do valor de saída é estável entre renders enquanto não
 *    completar uma janela de `delay` ms sem mudanças.
 *  - Em unmount, o timer é cancelado.
 *  - Para `delay = 0`, é equivalente a retornar o valor de entrada.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    if (delay <= 0) {
      setDebounced(value);
      return;
    }
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
