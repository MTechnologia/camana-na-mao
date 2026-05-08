import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * HU-3.3 — Engine genérica de sincronização entre estado local e URL search params.
 *
 * Resolve dois problemas simultâneos:
 *   1) Permite que filtros de drill-down (zona/bairro, dimensão+níveis, período,
 *      filtros demográficos, etc.) virem deep-links compartilháveis e sobrevivam
 *      a F5 / hard reload / navegação browser.
 *   2) Habilita drill-up natural pelo botão Voltar do navegador (history API),
 *      já que cada `setState` que mude a URL gera uma entrada no histórico.
 *
 * O hook recebe:
 *   - `prefix`: namespace dos parâmetros na URL (ex: "ter" → "ter.zona", "ter.bairro")
 *   - `defaults`: valores iniciais quando o param não está presente
 *   - `serializers`: como cada campo vira string e volta (essencial pra arrays e dates)
 *
 * E devolve `[state, setState]` no mesmo formato de useState — exceto que cada
 * mudança em `state` é refletida na URL e vice-versa.
 */

// ---------------------------------------------------------------------------
// Serializadores prontos
// ---------------------------------------------------------------------------

export interface FieldSerializer<T> {
  /** Converte o valor em string ou null (para omitir o param da URL). */
  toParam: (value: T) => string | null;
  /** Converte a string da URL em valor. */
  fromParam: (raw: string | null) => T;
}

export const stringSerializer = (defaultValue: string = ""): FieldSerializer<string> => ({
  toParam: (v) => (v && v !== defaultValue ? v : null),
  fromParam: (raw) => raw ?? defaultValue,
});

export const optionalStringSerializer = (): FieldSerializer<string | null> => ({
  toParam: (v) => (v && v.length > 0 ? v : null),
  fromParam: (raw) => (raw && raw.length > 0 ? raw : null),
});

export const stringArraySerializer = (): FieldSerializer<string[]> => ({
  toParam: (v) => (v && v.length > 0 ? v.map(encodeListItem).join(",") : null),
  fromParam: (raw) => (raw ? raw.split(",").map(decodeListItem).filter(Boolean) : []),
});

export const isoDateSerializer = (): FieldSerializer<string | null> => ({
  toParam: (v) => (v ? v.slice(0, 10) : null), // ISO YYYY-MM-DD
  fromParam: (raw) => (raw ? raw : null),
});

export const dateRangeSerializer = (): FieldSerializer<{
  startDate?: string;
  endDate?: string;
} | null> => ({
  toParam: (v) => {
    if (!v || (!v.startDate && !v.endDate)) return null;
    const s = v.startDate ? v.startDate.slice(0, 10) : "";
    const e = v.endDate ? v.endDate.slice(0, 10) : "";
    return `${s}~${e}`;
  },
  fromParam: (raw) => {
    if (!raw) return null;
    const [s, e] = raw.split("~");
    if (!s && !e) return null;
    return { startDate: s || undefined, endDate: e || undefined };
  },
});

// Arrays usam vírgula como separador. Itens com vírgula recebem encode mínimo.
function encodeListItem(s: string): string {
  return s.replace(/%/g, "%25").replace(/,/g, "%2C");
}
function decodeListItem(s: string): string {
  return s.replace(/%2C/gi, ",").replace(/%25/g, "%");
}

// ---------------------------------------------------------------------------
// Hook principal
// ---------------------------------------------------------------------------

export type SerializerMap<T> = {
  [K in keyof T]: FieldSerializer<T[K]>;
};

export interface UseUrlSyncedStateOptions<T extends Record<string, unknown>> {
  /** Prefixo dos params na URL (ex: "ter" gera "ter.zona", "ter.bairro"). */
  prefix?: string;
  /** Valores iniciais quando os params não estão na URL. */
  defaults: T;
  /** Como cada campo é serializado. */
  serializers: SerializerMap<T>;
  /**
   * Estratégia de atualização da URL:
   *   "replace" (default) — substitui a entrada atual (não polui histórico).
   *   "push" — cria nova entrada (cada mudança vira ponto de Voltar do browser).
   */
  strategy?: "replace" | "push";
}

function paramKey(prefix: string | undefined, key: string): string {
  return prefix ? `${prefix}.${key}` : key;
}

export function useUrlSyncedState<T extends Record<string, unknown>>(
  options: UseUrlSyncedStateOptions<T>,
): [T, (next: T | ((prev: T) => T)) => void] {
  const { prefix, defaults, serializers, strategy = "push" } = options;
  const [searchParams, setSearchParams] = useSearchParams();

  // Carrega o estado inicial da URL (uma vez na montagem)
  const initial = useMemo(() => {
    const out = { ...defaults };
    (Object.keys(serializers) as Array<keyof T>).forEach((key) => {
      const raw = searchParams.get(paramKey(prefix, String(key)));
      const value = serializers[key].fromParam(raw);
      // Só sobrescreve quando há valor válido — senão mantém o default
      if (raw !== null) {
        out[key] = value as T[typeof key];
      }
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [state, setState] = useState<T>(initial);

  // Mantém referência atual do searchParams para evitar stale closure
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  // Sempre que `state` mudar, atualiza a URL (sem disparar loop).
  // HU-3.5 fix: inicializamos lastSerializedRef com a URL atual para evitar
  // setSearchParams espúrio no mount inicial (causa de race entre
  // múltiplas instâncias do hook na mesma página, fazendo Tabs
  // controlado reverter para valor anterior).
  const lastSerializedRef = useRef<string>(searchParams.toString());
  const isFirstWriteRef = useRef<boolean>(true);
  useEffect(() => {
    const next = new URLSearchParams(searchParamsRef.current);
    (Object.keys(serializers) as Array<keyof T>).forEach((key) => {
      const k = paramKey(prefix, String(key));
      const value = state[key];
      const param = serializers[key].toParam(value);
      if (param === null || param === undefined) {
        next.delete(k);
      } else {
        next.set(k, param);
      }
    });

    const serialized = next.toString();
    if (serialized === lastSerializedRef.current) {
      isFirstWriteRef.current = false;
      return;
    }
    lastSerializedRef.current = serialized;
    // No primeiro write, foraça replace para não poluir histórico
    const useReplace = strategy === "replace" || isFirstWriteRef.current;
    isFirstWriteRef.current = false;
    setSearchParams(next, { replace: useReplace });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Quando o usuário usa Voltar/Avançar do browser (URL muda externamente),
  // hidrata o state a partir da URL.
  useEffect(() => {
    const out = { ...state };
    let changed = false;
    (Object.keys(serializers) as Array<keyof T>).forEach((key) => {
      const raw = searchParams.get(paramKey(prefix, String(key)));
      const value = raw !== null ? serializers[key].fromParam(raw) : defaults[key];
      // shallow-compare para evitar setState desnecessário
      if (!shallowEqual(out[key], value)) {
        out[key] = value as T[typeof key];
        changed = true;
      }
    });
    if (changed) {
      // Atualiza lastSerializedRef pra evitar que o próximo effect dispare setSearchParams
      lastSerializedRef.current = searchParams.toString();
      setState(out);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setStateWrapped = useCallback(
    (next: T | ((prev: T) => T)) => {
      setState((prev) => (typeof next === "function" ? (next as (p: T) => T)(prev) : next));
    },
    [],
  );

  return [state, setStateWrapped];
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a as Record<string, unknown>);
    const kb = Object.keys(b as Record<string, unknown>);
    if (ka.length !== kb.length) return false;
    return ka.every(
      (k) => (a as Record<string, unknown>)[k] === (b as Record<string, unknown>)[k],
    );
  }
  return false;
}
