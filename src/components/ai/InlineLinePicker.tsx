import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bus, Search, Train, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TransportLine {
  id: string;
  line_code: string;
  line_name: string;
  line_type: string;
}

interface InlineLinePickerProps {
  onSelect: (lineCode: string, lineName: string) => void;
}

export const InlineLinePicker = ({ onSelect }: InlineLinePickerProps) => {
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<TransportLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState(false);

  const searchLines = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setLines([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('transport_lines')
        .select('id, line_code, line_name, line_type')
        .or(`line_code.ilike.%${searchQuery}%,line_name.ilike.%${searchQuery}%`)
        .limit(8);

      if (error) throw error;
      setLines(data || []);
    } catch (error) {
      console.error('Error searching lines:', error);
      setLines([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      searchLines(query);
    }, 300);
    return () => clearTimeout(debounce);
  }, [query, searchLines]);

  const handleSelect = (line: TransportLine) => {
    setSelected(true);
    onSelect(line.line_code, line.line_name);
  };

  const handleCustomLine = () => {
    if (query.trim()) {
      setSelected(true);
      onSelect(query.toUpperCase(), query.toUpperCase());
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
            <div className="p-3">
              <p className="text-sm text-muted-foreground mb-2">Linha não encontrada</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCustomLine}
                className="w-full"
              >
                Usar "{query.toUpperCase()}"
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default InlineLinePicker;
