import { useState } from "react";
import InstitutionalLayout from "@/components/institucional/InstitutionalLayout";
import { Search, MapPin, Phone, Mail, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { vereadores } from "@/data/vereadores";
import { useFavorites } from "@/contexts/FavoritesContext";

const Vereadores = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { toggleFavorite, isFavorited } = useFavorites();

  const filteredVereadores = vereadores.filter(
    (v) =>
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.party.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.region && v.region.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
                className="p-4 hover:shadow-md transition-shadow cursor-pointer relative"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite({
                      id: `vereador-${vereador.id}`,
                      type: 'vereador',
                      title: vereador.name,
                      subtitle: vereador.party,
                      path: `/institucional/vereadores`,
                      image: vereador.photo,
                    });
                  }}
                  className="absolute top-3 right-3 p-2 hover:bg-muted/50 rounded-full transition-colors z-10"
                  aria-label="Favoritar vereador"
                >
                  <Heart
                    className={`h-5 w-5 ${
                      isFavorited(`vereador-${vereador.id}`)
                        ? "fill-pink-500 text-pink-500"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>

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
  );
};

export default Vereadores;
