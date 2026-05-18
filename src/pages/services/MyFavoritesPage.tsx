import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Heart, MapPin, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ServiceTypeIcon } from "@/components/icons";
import { RatingStars } from "@/components/evaluation/RatingStars";
import { useMyFavoritesList } from "@/hooks/useServiceFavorites";
import { getAddressDisplay } from "@/lib/mapUtils";
import { cn } from "@/lib/utils";

const serviceLabels: Record<string, string> = {
  ubs: "UBS",
  school: "Escola",
  ceu: "CEU",
  hospital: "Hospital",
  library: "Biblioteca",
  sports_center: "Centro Esportivo",
  street_market: "Feira",
  community_center: "Centro Comunitário",
  daycare: "Creche",
  park: "Parque",
  social_assistance: "Assistência Social",
  police_station: "Delegacia",
  transit_station: "Transporte",
  market: "Mercado",
  city_market: "Mercado Municipal",
  theater: "Teatro/Cinema",
  museum: "Museu",
  cemetery: "Cemitério",
  accessibility: "Acessibilidade",
  recycling_point: "Reciclagem/Limpeza",
  fire_station: "Bombeiros",
  other: "Outro",
};

export default function MyFavoritesPage() {
  const { items, loading, removeFavorite } = useMyFavoritesList();
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleRemove(serviceId: string) {
    setRemovingId(serviceId);
    try {
      await removeFavorite(serviceId);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 pb-24">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Heart className="h-7 w-7 text-primary shrink-0 fill-primary/20" aria-hidden />
          Meus Favoritos
        </h1>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          Equipamentos que você marcou com o <strong>coração</strong> para voltar rápido. Esta lista é só um
          atalho — não envia notificação.
        </p>
      </div>

      <Card
        className="mb-6 border-muted bg-muted/30"
        role="region"
        aria-label="Diferença entre favoritar e acompanhar avaliações"
      >
        <CardContent className="p-4 space-y-3">
          <p className="text-xs font-medium text-foreground">Na ficha do equipamento há duas ações diferentes:</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-background p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Heart className="h-4 w-4 text-primary shrink-0 fill-primary/20" aria-hidden />
                Favoritar
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>Salva o equipamento <strong className="font-medium text-foreground">nesta lista</strong></li>
                <li>Atalho no mapa ou na ficha — sem aviso no celular</li>
              </ul>
            </div>
            <div className="rounded-lg border bg-background p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Bell className="h-4 w-4 text-primary shrink-0" aria-hidden />
                Acompanhar atualizações
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>Avisa quando surgem <strong className="font-medium text-foreground">novas avaliações</strong></li>
                <li>
                  Gerencie em{" "}
                  <Link to="/perfil/inscricoes" className="text-primary font-medium hover:underline">
                    Minhas Inscrições
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center space-y-4">
            <Heart className="h-14 w-14 mx-auto text-muted-foreground/40" aria-hidden />
            <div>
              <p className="font-medium text-foreground">Nenhum favorito ainda</p>
              <p className="text-sm text-muted-foreground mt-1">
                Em <strong>Perto de você</strong> ou na ficha do equipamento, toque no <strong>coração</strong> para
                salvar aqui. Para receber aviso de novas avaliações, use <strong>Acompanhar atualizações</strong> (sino)
                na ficha — não é a mesma coisa.
              </p>
            </div>
            <Button asChild>
              <Link to="/servicos-proximos">Ver serviços próximos</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((row) => {
            const ps = row.public_services;
            const busy = removingId === row.service_id;
            if (!ps) {
              return (
                <li key={row.id}>
                  <Card className="border-amber-500/30 bg-amber-500/5">
                    <CardContent className="p-4 flex items-center justify-between gap-2">
                      <p className="text-sm text-muted-foreground">
                        Este equipamento não está mais no cadastro. Você pode remover o favorito.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => void handleRemove(row.service_id)}
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              );
            }
            return (
              <li key={row.id}>
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex gap-3 p-4">
                      <div className="shrink-0" aria-hidden>
                        <ServiceTypeIcon serviceType={ps.service_type} size={44} />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <Link
                          to={`/servico/${ps.id}`}
                          className="font-semibold text-foreground line-clamp-2 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                        >
                          {ps.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {serviceLabels[ps.service_type] ?? "Serviço público"}
                        </p>
                        <div className="flex items-start gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />
                          <span className="line-clamp-2">{getAddressDisplay(ps.address, ps.district)}</span>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <RatingStars rating={ps.average_rating ?? 0} readonly size="sm" />
                          <span className="text-xs text-muted-foreground">({ps.total_ratings ?? 0})</span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn("shrink-0 text-muted-foreground hover:text-destructive")}
                        disabled={busy}
                        aria-label="Remover dos favoritos"
                        onClick={() => void handleRemove(ps.id)}
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
