import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ConversationFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  periodFilter: string;
  onPeriodChange: (period: string) => void;
  journeyFilter: string;
  onJourneyChange: (journey: string) => void;
  availableJourneys: { id: string; label: string }[];
  activeFiltersCount: number;
  onClearFilters: () => void;
}

const ConversationFilters = ({
  searchQuery,
  onSearchChange,
  periodFilter,
  onPeriodChange,
  journeyFilter,
  onJourneyChange,
  availableJourneys,
  activeFiltersCount,
  onClearFilters,
}: ConversationFiltersProps) => {
  return (
    <div className="space-y-3 mb-4">
      {/* Busca por texto */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar em conversas..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => onSearchChange("")}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Filtros de período e jornada */}
      <div className="flex gap-2">
        <Select value={periodFilter} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-[140px]">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Esta semana</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
          </SelectContent>
        </Select>

        <Select value={journeyFilter} onValueChange={onJourneyChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Todos os temas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os temas</SelectItem>
            {availableJourneys.map((journey) => (
              <SelectItem key={journey.id} value={journey.id}>
                {journey.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeFiltersCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="gap-2"
          >
            <X className="w-3 h-3" />
            Limpar
            <Badge variant="secondary" className="ml-1">
              {activeFiltersCount}
            </Badge>
          </Button>
        )}
      </div>
    </div>
  );
};

export default ConversationFilters;
