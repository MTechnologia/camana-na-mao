import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AudienciaRanking } from "@/hooks/useAudienciasAnalytics";
import { useAudienciaEngagementDetail } from "@/hooks/useAudienciaEngagementDetail";
import { formatAudienciaTitulo } from "@/lib/audienciaDisplay";
import { useEffect } from "react";

type Props = {
  audiencia: AudienciaRanking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canViewEngagement: boolean;
};

export function AudienciaEngagementDetailSheet({
  audiencia,
  open,
  onOpenChange,
  canViewEngagement,
}: Props) {
  const { detail, loading, error, load, clear } = useAudienciaEngagementDetail();

  useEffect(() => {
    if (open && audiencia && canViewEngagement) {
      void load(audiencia.id);
    }
    if (!open) clear();
  }, [open, audiencia?.id, canViewEngagement, load, clear]);

  const titulo = audiencia
    ? formatAudienciaTitulo({
        titulo: audiencia.titulo,
        ap_code: audiencia.ap_code,
        tema: audiencia.tema,
        comissao: audiencia.comissao,
      })
    : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="pr-6">{titulo}</SheetTitle>
          {audiencia && (
            <SheetDescription>
              {audiencia.comissao ?? "Sem comissão"} ·{" "}
              {format(new Date(audiencia.data), "dd/MM/yyyy", { locale: ptBR })} · {audiencia.zona}
            </SheetDescription>
          )}
        </SheetHeader>

        {!canViewEngagement ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Você não tem permissão para consultar inscritos e manifestações nesta audiência.
          </p>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Carregando…
          </div>
        ) : error ? (
          <p className="mt-6 text-sm text-destructive">{error}</p>
        ) : detail ? (
          <Tabs defaultValue="inscritos" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="inscritos">Lembretes ({detail.lembretes.length})</TabsTrigger>
              <TabsTrigger value="manifestacoes">
                Participações ({detail.participacoes.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="inscritos" className="mt-4 space-y-2">
              {detail.lembretes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum lembrete confirmado.</p>
              ) : (
                detail.lembretes.map((row) => (
                  <div key={row.id} className="rounded-lg border border-border p-3 text-sm">
                    <p className="font-medium">{row.nome ?? "Usuário"}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.email ?? row.telefone ?? row.user_id}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="secondary">{row.status}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(row.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
            <TabsContent value="manifestacoes" className="mt-4 space-y-2">
              {detail.participacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma participação registrada.</p>
              ) : (
                detail.participacoes.map((row) => (
                  <div key={row.id} className="rounded-lg border border-border p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{row.nome}</p>
                      <Badge variant="outline">
                        {row.tipo === "escrito" ? "Manifestação escrita" : "Videoconferência"}
                      </Badge>
                      {row.protocolo != null && (
                        <Badge variant="secondary">Protocolo {row.protocolo}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {row.email} · {row.telefone}
                    </p>
                    {row.entidade && (
                      <p className="text-xs text-muted-foreground">{row.entidade}</p>
                    )}
                    {row.sugestao && <p className="mt-2 text-xs leading-relaxed">{row.sugestao}</p>}
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(row.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
