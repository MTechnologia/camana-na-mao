import { useState } from "react";
import InstitutionalLayout from "@/components/institucional/InstitutionalLayout";
import GlobalSearch from "@/components/institucional/GlobalSearch";
import { Search, MapPin, Phone, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Vereador {
  id: string;
  name: string;
  party: string;
  region: string;
  phone: string;
  email: string;
  initials: string;
}

const mockVereadores: Vereador[] = [
  {
    id: "1",
    name: "Ricardo Silva",
    party: "PT",
    region: "Zona Leste",
    phone: "(11) 3396-4000",
    email: "ricardo.silva@camara.sp.gov.br",
    initials: "RS",
  },
  {
    id: "2",
    name: "Ana Paula Santos",
    party: "PSOL",
    region: "Zona Sul",
    phone: "(11) 3396-4001",
    email: "ana.santos@camara.sp.gov.br",
    initials: "AS",
  },
  {
    id: "3",
    name: "João Costa",
    party: "PSDB",
    region: "Centro",
    phone: "(11) 3396-4002",
    email: "joao.costa@camara.sp.gov.br",
    initials: "JC",
  },
  {
    id: "4",
    name: "Maria Oliveira",
    party: "PDT",
    region: "Zona Norte",
    phone: "(11) 3396-4003",
    email: "maria.oliveira@camara.sp.gov.br",
    initials: "MO",
  },
];

const Vereadores = () => {
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredVereadores = mockVereadores.filter(
    (v) =>
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.party.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <InstitutionalLayout
        title="Vereadores"
        category="Institucional"
        onSearch={() => setShowGlobalSearch(true)}
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

          {/* Vereadores List */}
          <div className="space-y-3">
            {filteredVereadores.map((vereador) => (
              <Card
                key={vereador.id}
                className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {vereador.initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-foreground">
                        {vereador.name}
                      </h3>
                      <Badge variant="outline" className="shrink-0">
                        {vereador.party}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{vereador.region}</span>
                      </div>
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
            ))}

            {filteredVereadores.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Nenhum vereador encontrado
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <p><strong>Total:</strong> 55 vereadores eleitos</p>
            <p><strong>Mandato:</strong> 2021-2024</p>
            <p><strong>Fonte:</strong> Portal da Câmara Municipal de São Paulo</p>
          </div>
        </div>
      </InstitutionalLayout>

      <GlobalSearch open={showGlobalSearch} onOpenChange={setShowGlobalSearch} />
    </>
  );
};

export default Vereadores;
