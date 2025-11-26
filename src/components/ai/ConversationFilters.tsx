import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { useState } from "react";

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
  const [open, setOpen] = useState(false);
  const [tempPeriod, setTempPeriod] = useState(periodFilter);
  const [tempJourney, setTempJourney] = useState(journeyFilter);

  const handleApplyFilters = () => {
    onPeriodChange(tempPeriod);
    onJourneyChange(tempJourney);
    setOpen(false);
  };

  const handleClearAll = () => {
    setTempPeriod("all");
    setTempJourney("all");
    onClearFilters();
    setOpen(false);
  };

  // Count filters excluding search (period and journey only)
  const filterBadgeCount = [
    periodFilter !== "all",
    journeyFilter !== "all",
  ].filter(Boolean).length;

  return (
    <div className="space-y-3 mb-4">
      {/* Search and Filter Button */}
      <div className="flex gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
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

        {/* Filters Button */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2 relative">
              <SlidersHorizontal className="w-4 h-4" />
              Filtros
              {filterBadgeCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filterBadgeCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[400px]">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
              <SheetDescription>
                Refine suas conversas por período e tema
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 py-6">
              {/* Period Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Período</Label>
                <RadioGroup value={tempPeriod} onValueChange={setTempPeriod}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="period-all" />
                    <Label htmlFor="period-all" className="font-normal cursor-pointer">
                      Todos
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="today" id="period-today" />
                    <Label htmlFor="period-today" className="font-normal cursor-pointer">
                      Hoje
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="week" id="period-week" />
                    <Label htmlFor="period-week" className="font-normal cursor-pointer">
                      Esta semana
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="month" id="period-month" />
                    <Label htmlFor="period-month" className="font-normal cursor-pointer">
                      Este mês
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Journey/Theme Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Tema</Label>
                <Select value={tempJourney} onValueChange={setTempJourney}>
                  <SelectTrigger>
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
              </div>
            </div>

            <SheetFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleClearAll}
                className="flex-1"
              >
                Limpar Filtros
              </Button>
              <Button onClick={handleApplyFilters} className="flex-1">
                Aplicar
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default ConversationFilters;
