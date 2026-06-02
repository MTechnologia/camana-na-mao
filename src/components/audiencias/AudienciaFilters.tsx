import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ClipboardList, MapPin, BarChart3, Calendar, CalendarDays } from "lucide-react";

interface AudienciaFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: {
    themes: string[];
    regions: string[];
    status: string;
    dateFrom: string;
    dateTo: string;
    year: string;
  };
  onFiltersChange: (filters: Record<string, unknown>) => void;
  availableRegions: string[];
}

const temas = [
  { id: "Legislativo", label: "Legislativo" },
  { id: "Mobilidade", label: "Mobilidade" },
  { id: "Educação", label: "Educação" },
  { id: "Saúde", label: "Saúde" },
  { id: "Meio Ambiente", label: "Meio Ambiente" },
  { id: "Cultura", label: "Cultura" },
  { id: "Urbanismo", label: "Urbanismo" },
  { id: "Economia", label: "Economia" },
  { id: "Segurança", label: "Segurança" },
];

const AudienciaFilters = ({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  availableRegions = [],
}: AudienciaFiltersProps) => {
  const toggleTheme = (themeId: string) => {
    const newThemes = filters.themes.includes(themeId)
      ? filters.themes.filter((t) => t !== themeId)
      : [...filters.themes, themeId];
    onFiltersChange({ ...filters, themes: newThemes });
  };

  const toggleRegion = (region: string) => {
    const newRegions = filters.regions.includes(region)
      ? filters.regions.filter((r) => r !== region)
      : [...filters.regions, region];
    onFiltersChange({ ...filters, regions: newRegions });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      themes: [],
      regions: [],
      status: "all",
      dateFrom: "",
      dateTo: "",
      year: "all",
    });
  };

  const activeFiltersCount =
    filters.themes.length +
    filters.regions.length +
    (filters.status !== "all" ? 1 : 0) +
    (filters.dateFrom || filters.dateTo ? 1 : 0) +
    (filters.year !== "all" ? 1 : 0);

  const anos = Array.from({ length: 2026 - 2008 + 1 }, (_, i) => String(2026 - i));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh]">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Filtros</SheetTitle>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-primary"
              >
                Limpar
              </Button>
            )}
          </div>
          <SheetDescription>Refine sua busca por audiências públicas</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6 overflow-y-auto max-h-[calc(85vh-180px)]">
          {/* Tema */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">📋 Tema</Label>
            <div className="space-y-2">
              {temas.map((tema) => (
                <div
                  key={tema.id}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => toggleTheme(tema.id)}
                >
                  <Checkbox
                    id={`filter-${tema.id}`}
                    checked={filters.themes.includes(tema.id)}
                    onCheckedChange={() => toggleTheme(tema.id)}
                  />
                  <label
                    htmlFor={`filter-${tema.id}`}
                    className="flex-1 text-sm font-medium leading-none cursor-pointer"
                  >
                    {tema.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Região */}
          {availableRegions.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                Região
              </Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableRegions.map((region) => (
                  <div
                    key={region}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => toggleRegion(region)}
                  >
                    <Checkbox
                      id={`filter-region-${region}`}
                      checked={filters.regions.includes(region)}
                      onCheckedChange={() => toggleRegion(region)}
                    />
                    <label
                      htmlFor={`filter-region-${region}`}
                      className="flex-1 text-sm font-medium leading-none cursor-pointer"
                    >
                      {region}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          <div className="space-y-3">
            <Label className="text-base font-semibold inline-flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 shrink-0" aria-hidden />
              Status
            </Label>
            <RadioGroup
              value={filters.status}
              onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
            >
              <div className="flex items-center space-x-2 p-2">
                <RadioGroupItem value="all" id="status-all" />
                <Label htmlFor="status-all" className="cursor-pointer">
                  Todas
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-2">
                <RadioGroupItem value="upcoming" id="status-upcoming" />
                <Label htmlFor="status-upcoming" className="cursor-pointer">
                  Próximas
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-2">
                <RadioGroupItem value="ongoing" id="status-ongoing" />
                <Label htmlFor="status-ongoing" className="cursor-pointer">
                  Em andamento
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-2">
                <RadioGroupItem value="finished" id="status-finished" />
                <Label htmlFor="status-finished" className="cursor-pointer">
                  Finalizadas
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Período: data inicial e data final */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">📅 Período</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filter-date-from" className="text-sm text-muted-foreground">
                  Data inicial
                </Label>
                <input
                  id="filter-date-from"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-date-to" className="text-sm text-muted-foreground">
                  Data final
                </Label>
                <input
                  id="filter-date-to"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Ano */}
          <div className="space-y-3">
            <Label className="text-base font-semibold inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
              Ano
            </Label>
            <Select
              value={filters.year}
              onValueChange={(value) => onFiltersChange({ ...filters, year: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os anos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {anos.map((ano) => (
                  <SelectItem key={ano} value={ano}>
                    {ano}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-background border-t">
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Aplicar filtros
            {activeFiltersCount > 0 && ` (${activeFiltersCount})`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AudienciaFilters;
