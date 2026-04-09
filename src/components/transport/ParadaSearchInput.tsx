import { useState, useEffect, useRef } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { invokeSptransOlhoVivo } from "@/lib/sptransOlhoVivo";
import {
  parseParadaBuscar,
  type OlhoVivoParadaOption,
} from "@/lib/parseOlhoVivoParada";
import { useDebounce } from "@/hooks/useDebounce";

interface ParadaSearchInputProps {
  onSelectParada: (parada: OlhoVivoParadaOption) => void;
  disabled?: boolean;
}

function getInvokeErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (typeof o.error === "string") return o.error;
  return null;
}

const MIN_CHARS = 2;

export function ParadaSearchInput({
  onSelectParada,
  disabled = false,
}: ParadaSearchInputProps) {
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 450);
  const [results, setResults] = useState<OlhoVivoParadaOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  /** Evita novo GET ao preencher o campo após escolher um resultado. */
  const [pauseRemoteSearch, setPauseRemoteSearch] = useState(false);
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (
      pauseRemoteSearch ||
      disabled ||
      debounced.trim().length < MIN_CHARS
    ) {
      if (!pauseRemoteSearch) {
        setResults([]);
        setSearchError(null);
      }
      setLoading(false);
      return;
    }

    const id = ++reqIdRef.current;
    setLoading(true);
    setSearchError(null);

    (async () => {
      const { data, error } = await invokeSptransOlhoVivo(supabase, {
        path: "Parada/Buscar",
        termosBusca: debounced.trim(),
      });
      if (id !== reqIdRef.current) return;

      if (error) {
        setResults([]);
        setSearchError(error.message);
        setLoading(false);
        return;
      }
      const msg = getInvokeErrorMessage(data);
      if (msg) {
        setResults([]);
        setSearchError(msg);
        setLoading(false);
        return;
      }
      setResults(parseParadaBuscar(data));
      setLoading(false);
    })().catch((e) => {
      if (id !== reqIdRef.current) return;
      setResults([]);
      setSearchError((e as Error).message);
      setLoading(false);
    });
  }, [debounced, disabled, pauseRemoteSearch]);

  const handleSelect = (p: OlhoVivoParadaOption) => {
    setPauseRemoteSearch(true);
    onSelectParada(p);
    setQuery(`${p.cp} — ${p.np}`);
    setShowResults(false);
    setResults([]);
    setSearchError(null);
  };

  return (
    <div className="relative">
      <div className="relative">
        {loading ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 animate-spin" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        )}
        <Input
          id="parada-busca"
          value={query}
          onChange={(e) => {
            setPauseRemoteSearch(false);
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          placeholder="Rua, número da parada ou bairro (min. 2 caracteres)…"
          disabled={disabled}
          className="pl-10"
          autoComplete="off"
        />
      </div>
      {searchError && (
        <p className="text-xs text-destructive mt-1">{searchError}</p>
      )}
      {showResults && debounced.trim().length >= MIN_CHARS && !loading && (
        <div className="absolute z-50 w-full mt-2 bg-background border rounded-lg shadow-lg">
          <ScrollArea className="max-h-56">
            {results.length > 0 ? (
              <div className="p-2">
                {results.map((p) => (
                  <button
                    key={`${p.cp}-${p.np}`}
                    type="button"
                    onClick={() => handleSelect(p)}
                    className="w-full text-left p-3 hover:bg-accent rounded-lg transition-colors"
                  >
                    <div className="font-semibold text-sm">{p.np}</div>
                    <div className="text-xs text-muted-foreground">
                      Código {p.cp}
                      {p.ed ? ` · ${p.ed}` : ""}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              !searchError && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhuma parada encontrada
                </div>
              )
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
