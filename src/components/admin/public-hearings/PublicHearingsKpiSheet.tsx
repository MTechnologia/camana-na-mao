import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AudienciaRanking } from "@/hooks/useAudienciasAnalytics";
import { formatAudienciaTitulo } from "@/lib/audienciaDisplay";

export type PublicHearingsKpiMode = "open" | "registrations" | "manifestations" | null;

const TITLES: Record<Exclude<PublicHearingsKpiMode, null>, string> = {
  open: "Audiências abertas",
  registrations: "Inscrições confirmadas",
  manifestations: "Manifestações recebidas",
};

const DESCRIPTIONS: Record<Exclude<PublicHearingsKpiMode, null>, string> = {
  open: "Audiências com inscrições abertas e data futura, com resumo de engajamento.",
  registrations:
    "Audiências com lembretes e/ou inscrição em videoconferência no recorte selecionado.",
  manifestations: "Audiências com manifestações escritas registradas.",
};

function filterByMode(items: AudienciaRanking[], mode: Exclude<PublicHearingsKpiMode, null>) {
  switch (mode) {
    case "open":
      return items.filter((a) => a.aberta);
    case "registrations":
      return items.filter((a) => a.lembretes > 0 || a.videoconferencias > 0);
    case "manifestations":
      return items.filter((a) => a.escritas > 0);
    default:
      return items;
  }
}

type Props = {
  mode: PublicHearingsKpiMode;
  items: AudienciaRanking[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PublicHearingsKpiSheet({ mode, items, open, onOpenChange }: Props) {
  if (!mode) return null;

  const filtered = filterByMode(items, mode).sort((a, b) => b.data.localeCompare(a.data));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{TITLES[mode]}</SheetTitle>
          <SheetDescription>{DESCRIPTIONS[mode]}</SheetDescription>
        </SheetHeader>

        <p className="mt-4 text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "audiência" : "audiências"} no recorte
        </p>

        {filtered.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">Nenhum registro para este indicador.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
            {filtered.map((a) => (
              <li key={a.id} className="px-4 py-3 space-y-2">
                <p className="font-medium text-foreground">
                  {formatAudienciaTitulo({
                    titulo: a.titulo,
                    ap_code: a.ap_code,
                    tema: a.tema,
                    comissao: a.comissao,
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {a.comissao ?? "Sem comissão"} ·{" "}
                  {format(new Date(a.data), "dd/MM/yyyy", { locale: ptBR })} · {a.zona}
                </p>
                <div className="flex flex-wrap gap-2">
                  {mode === "open" && (
                    <>
                      <Badge variant="default">Aberta</Badge>
                      <Badge variant="secondary">
                        {a.inscricoes} {a.inscricoes === 1 ? "engajamento" : "engajamentos"}
                      </Badge>
                      <Badge variant="outline">{a.lembretes} lembretes</Badge>
                      <Badge variant="outline">{a.videoconferencias} videoconf.</Badge>
                      <Badge variant="outline">{a.escritas} escritas</Badge>
                    </>
                  )}
                  {mode === "registrations" && (
                    <>
                      <Badge variant="secondary">{a.lembretes} lembretes</Badge>
                      <Badge variant="outline">{a.videoconferencias} videoconferência</Badge>
                    </>
                  )}
                  {mode === "manifestations" && (
                    <Badge variant="secondary">
                      {a.escritas} {a.escritas === 1 ? "manifestação" : "manifestações"}
                    </Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}
