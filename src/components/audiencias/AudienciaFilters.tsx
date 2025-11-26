import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface AudienciaFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: {
    themes: string[];
    status: string;
    period: string;
  };
  onFiltersChange: (filters: any) => void;
}

const temas = [
  { id: "Mobilidade", label: "Mobilidade" },
  { id: "Educação", label: "Educação" },
  { id: "Saúde", label: "Saúde" },
  { id: "Meio Ambiente", label: "Meio Ambiente" },
  { id: "Cultura", label: "Cultura" },
  { id: "Segurança", label: "Segurança" },
];

const AudienciaFilters = ({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
}: AudienciaFiltersProps) => {
  const toggleTheme = (themeId: string) => {
    const newThemes = filters.themes.includes(themeId)
      ? filters.themes.filter(t => t !== themeId)
      : [...filters.themes, themeId];
    onFiltersChange({ ...filters, themes: newThemes });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      themes: [],
      status: "all",
      period: "all",
    });
  };

  const activeFiltersCount = 
    filters.themes.length + 
    (filters.status !== "all" ? 1 : 0) + 
    (filters.period !== "all" ? 1 : 0);

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
          <SheetDescription>
            Refine sua busca por audiências públicas
          </SheetDescription>
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

          {/* Status */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">📊 Status</Label>
            <RadioGroup
              value={filters.status}
              onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
            >
              <div className="flex items-center space-x-2 p-2">
                <RadioGroupItem value="all" id="status-all" />
                <Label htmlFor="status-all" className="cursor-pointer">Todas</Label>
              </div>
              <div className="flex items-center space-x-2 p-2">
                <RadioGroupItem value="upcoming" id="status-upcoming" />
                <Label htmlFor="status-upcoming" className="cursor-pointer">Próximas</Label>
              </div>
              <div className="flex items-center space-x-2 p-2">
                <RadioGroupItem value="ongoing" id="status-ongoing" />
                <Label htmlFor="status-ongoing" className="cursor-pointer">Em andamento</Label>
              </div>
              <div className="flex items-center space-x-2 p-2">
                <RadioGroupItem value="finished" id="status-finished" />
                <Label htmlFor="status-finished" className="cursor-pointer">Finalizadas</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Período */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">📅 Período</Label>
            <RadioGroup
              value={filters.period}
              onValueChange={(value) => onFiltersChange({ ...filters, period: value })}
            >
              <div className="flex items-center space-x-2 p-2">
                <RadioGroupItem value="all" id="period-all" />
                <Label htmlFor="period-all" className="cursor-pointer">Qualquer data</Label>
              </div>
              <div className="flex items-center space-x-2 p-2">
                <RadioGroupItem value="week" id="period-week" />
                <Label htmlFor="period-week" className="cursor-pointer">Esta semana</Label>
              </div>
              <div className="flex items-center space-x-2 p-2">
                <RadioGroupItem value="month" id="period-month" />
                <Label htmlFor="period-month" className="cursor-pointer">Este mês</Label>
              </div>
              <div className="flex items-center space-x-2 p-2">
                <RadioGroupItem value="next-month" id="period-next-month" />
                <Label htmlFor="period-next-month" className="cursor-pointer">Próximo mês</Label>
              </div>
            </RadioGroup>
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
