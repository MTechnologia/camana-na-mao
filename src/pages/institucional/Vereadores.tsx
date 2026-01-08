import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import InstitutionalLayout from "@/components/institucional/InstitutionalLayout";
import { Search, MapPin, Phone, Mail, X, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuickFilterPills } from "@/components/filters/QuickFilterPills";
import { vereadores } from "@/data/vereadores";

// Extract unique parties and regions from data
const uniqueParties = [...new Set(vereadores.map(v => v.party))].sort();
const uniqueRegions = [...new Set(vereadores.map(v => v.region).filter(Boolean))].sort() as string[];

const regionFilterOptions = uniqueRegions.map(r => ({ value: r, label: r }));

const Vereadores = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParty, setSelectedParty] = useState<string>("all");
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);

  const filteredVereadores = useMemo(() => {
    return vereadores.filter((v) => {
      // Search filter
      const matchesSearch = searchQuery === "" ||
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.party.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.region && v.region.toLowerCase().includes(searchQuery.toLowerCase()));

      // Party filter
      const matchesParty = selectedParty === "all" || v.party === selectedParty;

      // Region filter
      const matchesRegion = selectedRegions.length === 0 || 
        (v.region && selectedRegions.includes(v.region));

      return matchesSearch && matchesParty && matchesRegion;
    });
  }, [searchQuery, selectedParty, selectedRegions]);

  const hasActiveFilters = searchQuery !== "" || selectedParty !== "all" || selectedRegions.length > 0;

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedParty("all");
    setSelectedRegions([]);
  };

  return (
    <InstitutionalLayout
      title="Vereadores"
      category="Institucional"
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Vereadores de São Paulo
          </h1>
          <p className="text-muted-foreground">
            Conheça os 55 vereadores que representam a cidade de São Paulo
          </p>
        </div>

        {/* Filters Section */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nome, partido ou região..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Party Select */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={selectedParty} onValueChange={setSelectedParty}>
                <SelectTrigger className="w-full sm:w-48 bg-background">
                  <SelectValue placeholder="Partido" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">Todos os partidos</SelectItem>
                  {uniqueParties.map((party) => (
                    <SelectItem key={party} value={party}>
                      {party}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Region Pills */}
          <div className="flex items-start gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground pt-1.5 shrink-0">Região:</span>
            <QuickFilterPills
              options={regionFilterOptions}
              selected={selectedRegions}
              onChange={(value) => setSelectedRegions(value as string[])}
              mode="multi"
              showAllOption
              allLabel="Todas"
              size="sm"
            />
          </div>

          {/* Results count and clear */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                {filteredVereadores.length} vereador{filteredVereadores.length !== 1 ? 'es' : ''}
              </Badge>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                <X className="h-3 w-3 mr-1" />
                Limpar filtros
              </Button>
            </div>
          )}
        </div>

        {/* Vereadores List */}
        <div className="space-y-3">
          {filteredVereadores.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Nenhum vereador encontrado com os filtros selecionados
              </p>
            </div>
          ) : (
            filteredVereadores.map((vereador) => (
              <Card
                key={vereador.id}
                onClick={() => navigate(`/institucional/vereadores/${vereador.id}`)}
                className="p-4 hover:shadow-md transition-all cursor-pointer relative active:scale-[0.99]"
              >
                <div className="flex items-start gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={vereador.photo} alt={vereador.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {vereador.initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <Badge variant="outline" className="mb-2 inline-block">
                      {vereador.party}
                    </Badge>
                    <h3 className="font-semibold text-foreground mb-2">
                      {vereador.name}
                    </h3>

                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      {vereador.region && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{vereador.region}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{vereador.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate">{vereador.email}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        <div className="mt-8 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <p><strong>Total:</strong> 55 vereadores eleitos</p>
          <p><strong>Mandato:</strong> 2025-2028</p>
          <p><strong>Fonte:</strong> Portal da Câmara Municipal de São Paulo</p>
        </div>
      </div>
    </InstitutionalLayout>
  );
};

export default Vereadores;
