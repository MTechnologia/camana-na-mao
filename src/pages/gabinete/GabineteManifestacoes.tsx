import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { KPICard } from "@/components/analytics/KPICard";
import { ClipboardList, MapPin, RefreshCw, Star, TramFront } from "lucide-react";
import { VereadorLayout } from "@/layouts/VereadorLayout";
import { useManifestsVereador } from "@/hooks/useManifestsVereador";

const typeMeta = {
  urban: { label: "Urbano", icon: MapPin },
  transport: { label: "Transporte", icon: TramFront },
  service: { label: "Serviço", icon: Star },
} as const;

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  sent: "Enviado",
  acknowledged: "Recebido",
  resolved: "Resolvido",
};

export default function GabineteManifestacoes() {
  const { items, counts, loading, refetch } = useManifestsVereador();

  return (
    <VereadorLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Manifestações em aberto</h2>
            <p className="text-sm text-muted-foreground">
              Consulta em modo leitura dos itens que chegaram ao gabinete e ainda não foram
              concluídos.
            </p>
          </div>
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, index) => (
              <Skeleton key={index} className="h-28" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard title="Total" value={counts.total} icon={ClipboardList} />
            <KPICard title="Urbano" value={counts.urban} icon={MapPin} />
            <KPICard title="Transporte" value={counts.transport} icon={TramFront} />
            <KPICard title="Serviços" value={counts.service} icon={Star} />
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Fila atual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              [...Array(5)].map((_, index) => <Skeleton key={index} className="h-24" />)
            ) : items.length === 0 ? (
              <div className="text-center py-10">
                <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium">Nenhuma manifestação em aberto</p>
                <p className="text-sm text-muted-foreground">
                  Quando novos encaminhamentos chegarem ao gabinete, eles aparecerão aqui.
                </p>
              </div>
            ) : (
              items.map((item) => {
                const meta = typeMeta[item.manifestType];
                const Icon = meta.icon;

                return (
                  <div key={item.referralId} className="rounded-xl border border-border p-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Icon className="h-3 w-3" />
                            {meta.label}
                          </Badge>
                          {item.protocolCode ? (
                            <Badge variant="outline">Protocolo {item.protocolCode}</Badge>
                          ) : null}
                          {item.manifestStatus ? (
                            <Badge variant="outline">
                              Manifestação:{" "}
                              {statusLabels[item.manifestStatus] || item.manifestStatus}
                            </Badge>
                          ) : null}
                          <Badge>
                            Encaminhamento:{" "}
                            {statusLabels[item.referralStatus] || item.referralStatus}
                          </Badge>
                        </div>
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.description || "Sem descrição detalhada."}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleString("pt-BR")
                          : "Sem data"}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </VereadorLayout>
  );
}
