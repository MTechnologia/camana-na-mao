import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Landmark, Search, Loader2, AlertCircle } from "lucide-react";
import { useVereadores, type Vereador } from "@/hooks/useVereadores";

interface InlineVereadorPickerProps {
  /** Recebe o vereador escolhido na lista oficial (nome + partido). */
  onSelect: (name: string, party: string) => void;
}

/** Remove acentos para busca tolerante (ex.: "Sao" casa "São"). */
function foldAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normCompare(s: string): string {
  return foldAccents(s).toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Picker inline de vereador para o fluxo de feedback à Câmara.
 *
 * Diferente do picker de serviços, NÃO permite "usar texto livre": o cidadão só
 * pode escolher um vereador que exista na lista oficial (fonte: useVereadores →
 * edge function fetch-vereadores / CMSP). Se a busca não retornar ninguém,
 * mostramos uma mensagem amigável de "nenhum vereador encontrado".
 */
export const InlineVereadorPicker = ({ onSelect }: InlineVereadorPickerProps) => {
  const { data: vereadores = [], isLoading, isError } = useVereadores();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(false);

  const filtered = useMemo(() => {
    const term = normCompare(query);
    if (!term) return vereadores;
    return vereadores.filter((v) => {
      return (
        normCompare(v.name).includes(term) ||
        normCompare(v.party).includes(term) ||
        (v.region ? normCompare(v.region).includes(term) : false)
      );
    });
  }, [vereadores, query]);

  const handleSelect = (vereador: Vereador) => {
    setSelected(true);
    onSelect(vereador.name, vereador.party);
  };

  if (selected) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
        <Landmark className="h-3 w-3" />
        <span>Vereador selecionado ✓</span>
      </div>
    );
  }

  return (
    <div className="mt-2 w-full max-w-xs">
      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
        <Landmark className="h-3 w-3 flex-shrink-0" />
        <span>Qual o nome do vereador?</span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Digite o nome ou partido..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-8"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <div className="mt-2 rounded-md border bg-popover">
        {isLoading ? (
          <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Carregando vereadores…</span>
          </div>
        ) : isError ? (
          <div className="flex items-start gap-2 p-3 text-sm text-amber-700 dark:text-amber-500">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              Não consegui carregar a lista de vereadores agora. Você pode digitar o nome na
              conversa que eu tento localizar.
            </span>
          </div>
        ) : filtered.length > 0 ? (
          <ScrollArea className="max-h-[220px]">
            <div className="p-1">
              {filtered.map((vereador) => (
                <button
                  key={vereador.id}
                  type="button"
                  onClick={() => handleSelect(vereador)}
                  className="w-full text-left px-3 py-2 rounded-sm hover:bg-accent text-sm"
                >
                  <div className="font-medium">{vereador.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {vereador.party}
                    {vereador.region ? ` · ${vereador.region}` : ""}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="p-3">
            <p className="text-sm text-muted-foreground">
              Não encontrei nenhum vereador com esse nome. Confira a grafia ou busque pelo partido —
              só consigo seguir com um vereador da lista oficial.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InlineVereadorPicker;
