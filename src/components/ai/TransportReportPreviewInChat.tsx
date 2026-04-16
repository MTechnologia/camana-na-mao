import {
  type ParsedTransportReportPreview,
  formatTransportReportDescriptionForDisplay,
} from "@/lib/parseTransportReportPreview";
import { TRANSPORT_SUBCATEGORIES } from "@/lib/reportFieldConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bus } from "lucide-react";

const RECURRENCE_LABELS: Record<string, string> = {
  primeira_vez: "Primeira vez",
  algumas_vezes_mes: "Algumas vezes/mês",
  toda_semana: "Toda semana",
  todos_os_dias: "Todos os dias",
};

const REPORT_TYPE_LABELS: Record<string, string> = {
  atraso: "Atraso",
  lotacao: "Lotação",
  seguranca: "Segurança",
  limpeza: "Limpeza",
  acessibilidade: "Acessibilidade",
  conducao: "Condução",
  outro: "Outro",
};

function impactLabel(score: number | null): string {
  if (score == null) return "—";
  if (score >= 5) return "Alto (compromisso / não embarcou)";
  if (score >= 4) return "Atraso relevante (>30 min)";
  if (score >= 3) return "Atraso moderado (<30 min)";
  return "Desconforto";
}

function subcategoryLabel(reportType: string | null, value: string | null): string | null {
  if (!reportType || !value) return null;
  const opts = TRANSPORT_SUBCATEGORIES[reportType] ?? TRANSPORT_SUBCATEGORIES.outro;
  const found = opts.find((o) => o.value === value);
  return found?.label ?? null;
}

type Props = { preview: ParsedTransportReportPreview };

const ACCESSIBILITY_DETAIL_LABELS: Record<string, string> = {
  elevador_funcionando: "Elevador funcionando",
  piso_tatil_presente: "Piso tátil presente",
  espaco_cadeirante: "Espaço para cadeirante",
  info_sonora_visual_disponivel: "Informação sonora/visual disponível",
};

export function TransportReportPreviewInChat({ preview }: Props) {
  const row = (label: string, value: string) => (
    <div className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="text-foreground font-medium">{value || "—"}</span>
    </div>
  );

  return (
    <Card className="mt-3 border-primary/20 bg-primary/5">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Bus className="h-4 w-4 text-primary shrink-0" />
          Resumo do relato de transporte
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 pb-4 px-4">
        {row(
          "Problema",
          (formatTransportReportDescriptionForDisplay(preview.description) || "—").slice(0, 280),
        )}
        {row(
          "Tipo",
          (() => {
            const base =
              preview.report_type && (REPORT_TYPE_LABELS[preview.report_type] || preview.report_type);
            const sub = subcategoryLabel(preview.report_type, preview.sub_category);
            if (base && sub) return `${base} — ${sub}`;
            return base || sub || "—";
          })(),
        )}
        {row("Linha", preview.line_code || "—")}
        {row(
          "Quando",
          [preview.occurrence_date, preview.occurrence_time ? `às ${preview.occurrence_time}` : ""]
            .filter(Boolean)
            .join(" ") || "—",
        )}
        {row("Sentido", preview.direction || "—")}
        {row(
          "Frequência",
          preview.recurrence_frequency
            ? RECURRENCE_LABELS[preview.recurrence_frequency] || preview.recurrence_frequency
            : "—",
        )}
        {row("Impacto na rotina", impactLabel(preview.personal_impact))}
        {preview.location ? row("Local", preview.location) : null}
        {preview.stop_name ? row("Parada / estação", preview.stop_name) : null}
        {preview.stop_location ? row("Ponto / referência", preview.stop_location) : null}
        {preview.accessibility_details && Object.keys(preview.accessibility_details).length > 0
          ? (() => {
              const parts = Object.entries(preview.accessibility_details).map(([key, value]) => {
                const label = ACCESSIBILITY_DETAIL_LABELS[key] || key;
                if (typeof value === "boolean") return `${label}: ${value ? "Sim" : "Não"}`;
                return `${label}: ${String(value)}`;
              });
              const text = parts.join(" | ");
              return row("Acessibilidade (detalhes)", text.length > 240 ? `${text.slice(0, 240)}…` : text);
            })()
          : null}
      </CardContent>
    </Card>
  );
}
