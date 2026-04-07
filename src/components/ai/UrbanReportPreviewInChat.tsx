import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  MapPin,
  Tag,
  ImageIcon,
  ClipboardList,
  Sparkles,
  Gauge,
  Users,
  Hash,
  ListTree,
} from "lucide-react";
import type { ParsedUrbanReportPreview } from "@/lib/parseUrbanReportPreview";
import { CitizenSeverityBadge } from "@/components/citizen/CitizenSeverityBadge";

function severityBadgeFromGravityLabel(label: string): string | null {
  const t = label.trim();
  if (t === "Crítico") return "critical";
  if (t === "Moderado") return "medium";
  if (t === "Baixo") return "low";
  return null;
}

/** Códigos internos de risk_types → português (fallback se o markdown vier em inglês) */
const RISK_TYPE_LABELS_PT: Record<string, string> = {
  electrical: "Elétrico",
  traffic: "Trânsito",
  flooding: "Alagamento",
  structural: "Estrutural",
  health: "Saúde",
  fire: "Incêndio",
  pedestrian: "Pedestre",
  vehicle: "Veicular",
  environmental: "Ambiental",
};

function localizeRiskTypesLine(line: string): string {
  return line
    .split(",")
    .map((s) => {
      const k = s.trim().toLowerCase();
      return RISK_TYPE_LABELS_PT[k] ?? s.trim();
    })
    .join(", ");
}

type Props = {
  preview: ParsedUrbanReportPreview;
};

/**
 * Revisão visual do relato urbano antes de Confirmar/Corrigir (chat com IA).
 */
export function UrbanReportPreviewInChat({ preview }: Props) {
  const gravityBadgeSeverity =
    preview.gravity != null && preview.gravity !== ""
      ? severityBadgeFromGravityLabel(preview.gravity)
      : null;

  return (
    <Card className="border-2 border-primary/20 bg-card shadow-sm overflow-hidden w-full max-w-md">
      <CardHeader className="pb-2 pt-4 px-4 space-y-0">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
          <ClipboardList className="h-5 w-5 text-primary shrink-0" aria-hidden />
          Resumo do relato
        </CardTitle>
        <p className="text-xs text-muted-foreground font-normal pt-1">
          Confira os dados abaixo antes de enviar à Prefeitura.
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-3">
        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
          {preview.nature ? (
            <>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  Natureza do relato
                </div>
                <p className="text-sm font-medium text-foreground pl-5">{preview.nature}</p>
              </div>
              <div className="h-px bg-border" aria-hidden />
            </>
          ) : null}

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Tag className="h-3.5 w-3.5" aria-hidden />
              Categoria
            </div>
            <p className="text-sm font-medium text-foreground pl-5">{preview.category}</p>
          </div>

          {preview.tipoDetalhe ? (
            <>
              <div className="h-px bg-border" aria-hidden />
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <ListTree className="h-3.5 w-3.5" aria-hidden />
                  Tipo / detalhe
                </div>
                <p className="text-sm text-foreground pl-5">{preview.tipoDetalhe}</p>
              </div>
            </>
          ) : null}

          <div className="h-px bg-border" aria-hidden />

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <FileText className="h-3.5 w-3.5" aria-hidden />
              Descrição
            </div>
            <p className="text-sm text-foreground leading-snug pl-5 whitespace-pre-wrap break-words">
              {preview.description}
            </p>
          </div>

          {preview.gravity || preview.riskTypesLine || preview.affectedScope || preview.cep ? (
            <>
              <div className="h-px bg-border" aria-hidden />
              {preview.gravity ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <Gauge className="h-3.5 w-3.5" aria-hidden />
                    Gravidade / criticidade
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pl-5">
                    <p className="text-sm font-medium text-foreground">{preview.gravity}</p>
                    {gravityBadgeSeverity ? (
                      <CitizenSeverityBadge severity={gravityBadgeSeverity} size="sm" />
                    ) : null}
                  </div>
                </div>
              ) : null}
              {preview.riskTypesLine ? (
                <div className="space-y-1 pt-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <ListTree className="h-3.5 w-3.5" aria-hidden />
                    Tipos de risco
                  </div>
                  <p className="text-sm text-foreground pl-5">
                    {localizeRiskTypesLine(preview.riskTypesLine)}
                  </p>
                </div>
              ) : null}
              {preview.affectedScope ? (
                <div className="space-y-1 pt-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <Users className="h-3.5 w-3.5" aria-hidden />
                    Afetação
                  </div>
                  <p className="text-sm text-foreground pl-5">{preview.affectedScope}</p>
                </div>
              ) : null}
              {preview.cep ? (
                <div className="space-y-1 pt-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <Hash className="h-3.5 w-3.5" aria-hidden />
                    CEP
                  </div>
                  <p className="text-sm text-foreground pl-5">{preview.cep}</p>
                </div>
              ) : null}
            </>
          ) : null}

          <div className="h-px bg-border" aria-hidden />

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              Endereço
            </div>
            <p className="text-sm text-foreground pl-5">{preview.address}</p>
          </div>

          {preview.photosLine ? (
            <>
              <div className="h-px bg-border" aria-hidden />
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <ImageIcon className="h-3.5 w-3.5" aria-hidden />
                  Fotos
                </div>
                <p className="text-sm text-foreground pl-5">{preview.photosLine}</p>
              </div>
            </>
          ) : null}
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-3 py-0.5">
          {preview.footerHint}
        </p>
      </CardContent>
    </Card>
  );
}
