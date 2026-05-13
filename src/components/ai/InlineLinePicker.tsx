import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bus, Search, Train, Loader2 } from "lucide-react";
import { useTransportLines, type TransportLineSearchRow } from "@/hooks/useTransportLines";

interface InlineLinePickerProps {
  /** lineId definido quando a linha veio da tabela transport_lines (HU-5.2). */
  onSelect: (lineCode: string, lineName: string, lineId?: string) => void;
}

export const InlineLinePicker = ({ onSelect }: InlineLinePickerProps) => {
  const { searchLinesRemote } = useTransportLines({ loadCatalog: false });
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<TransportLineSearchRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState(false);

  const runRemoteSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery || searchQuery.length < 2) {
        setLines([]);
        return;
      }

      setIsLoading(true);
      try {
        const data = await searchLinesRemote(searchQuery, 8);
        setLines(data);
      } catch (error) {
        console.error("Error searching lines:", error);
        setLines([]);
      } finally {
        setIsLoading(false);
      }
    },
    [searchLinesRemote],
  );

  useEffect(() => {
    const debounce = setTimeout(() => {
      void runRemoteSearch(query);
    }, 300);
    return () => clearTimeout(debounce);
  }, [query, runRemoteSearch]);

  const handleSelect = (line: TransportLineSearchRow) => {
    setSelected(true);
    onSelect(line.line_code, line.line_name, line.id);
  };

  const handleCustomLine = () => {
    if (query.trim()) {
      setSelected(true);
      const code = query.trim().toUpperCase();
      onSelect(code, code);
    }
  };

  if (selected) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
        <Bus className="h-3 w-3" />
        <span>Linha selecionada ✓</span>
      </div>
    );
  }

  return (
    <div className="mt-2 w-full max-w-xs">
      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
        <Bus className="h-3 w-3 flex-shrink-0" />
        <span>Qual linha ou estação?</span>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Digite número ou nome..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-8"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {query.length >= 2 && (
        <div className="mt-2 rounded-md border bg-popover">
          {lines.length > 0 ? (
            <ScrollArea className="max-h-[200px]">
              <div className="p-1">
                {lines.map((line) => (
                  <button
                    key={line.id}
                    onClick={() => handleSelect(line)}
                    className="w-full text-left px-3 py-2 rounded-sm hover:bg-accent flex items-center gap-2 text-sm"
                  >
                    {line.line_type === 'metro' ? (
                      <Train className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Bus className="h-4 w-4 text-orange-500" />
                    )}
                    <span className="font-medium">{line.line_code}</span>
                    <span className="text-muted-foreground truncate">{line.line_name}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          ) : !isLoading ? (
            <div className="p-3 space-y-2">
              <p className="text-sm font-medium text-foreground">Minha linha não está na lista</p>
              <p className="text-xs text-muted-foreground">
                Registramos o código que você digitou; a linha pode não constar no cadastro atual.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCustomLine}
                className="w-full"
              >
                Usar código digitado: {query.toUpperCase()}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default InlineLinePicker;
