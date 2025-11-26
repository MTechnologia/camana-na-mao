import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTransportLines } from '@/hooks/useTransportLines';
import { cn } from '@/lib/utils';

interface LineSearchInputProps {
  onSelectLine: (line: { id: string; line_code: string; line_name: string }) => void;
  allowCustom?: boolean;
}

export const LineSearchInput = ({ onSelectLine, allowCustom = true }: LineSearchInputProps) => {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const { lines, searchLines } = useTransportLines();
  const [filteredLines, setFilteredLines] = useState(lines);

  useEffect(() => {
    const results = searchLines(query);
    setFilteredLines(results);
  }, [query]);

  const handleSelect = (line: { id: string; line_code: string; line_name: string }) => {
    onSelectLine(line);
    setQuery(`${line.line_code} - ${line.line_name}`);
    setShowResults(false);
  };

  const handleCustomLine = () => {
    if (query.trim()) {
      onSelectLine({
        id: '',
        line_code: query.trim(),
        line_name: 'Linha informada manualmente',
      });
      setShowResults(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          placeholder="Digite o código ou nome da linha..."
          className="pl-10"
        />
      </div>

      {showResults && query && (
        <div className="absolute z-50 w-full mt-2 bg-background border rounded-lg shadow-lg">
          <ScrollArea className="max-h-60">
            {filteredLines.length > 0 ? (
              <div className="p-2">
                {filteredLines.map((line) => (
                  <button
                    key={line.id}
                    onClick={() => handleSelect(line)}
                    className="w-full text-left p-3 hover:bg-accent rounded-lg transition-colors"
                  >
                    <div className="font-semibold text-sm">{line.line_code}</div>
                    <div className="text-xs text-muted-foreground">{line.line_name}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                <p className="text-sm mb-2">Linha não encontrada</p>
                {allowCustom && (
                  <button
                    onClick={handleCustomLine}
                    className="text-sm text-primary hover:underline"
                  >
                    Usar "{query}"
                  </button>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
