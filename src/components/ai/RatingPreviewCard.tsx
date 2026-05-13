import type { ParsedServiceRatingSubmitPreview } from "@/lib/parseServiceRatingSubmitPreview";
import {
  SERVICE_RATING_DIMENSION_KEYS,
  SERVICE_RATING_DIMENSION_LABELS,
  isCompleteServiceRatingDimensions,
} from "@/lib/serviceRatingDimensions";
import { shouldOfferRatingReferral } from "@/lib/shouldOfferRatingReferral";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";

type Props = { preview: ParsedServiceRatingSubmitPreview };

export function RatingPreviewCard({ preview }: Props) {
  const row = (label: string, value: string) => (
    <div className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="text-foreground font-medium">{value || "—"}</span>
    </div>
  );

  const rd = preview.rating_dimensions;
  const dimRows =
    rd && isCompleteServiceRatingDimensions(rd)
      ? SERVICE_RATING_DIMENSION_KEYS.map((k) => (
          <div key={k}>{row(SERVICE_RATING_DIMENSION_LABELS[k], `${rd[k]}/5`)}</div>
        ))
      : null;

  /** HU-8.1 / HU-1.3: encaminhamento (não revisão de comentário) — CTA [OFFER_REFERRAL] só após Publicar. */
  const showReferralAfterPublishHint = shouldOfferRatingReferral(preview.rating_stars, rd);

  return (
    <Card className="mt-3 border-primary/20 bg-primary/5">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Star className="h-4 w-4 text-primary shrink-0" />
          Resumo da avaliação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 pb-4 px-4">
        {row("Serviço", preview.service_name)}
        {row("Nota geral (média)", preview.rating_stars > 0 ? `${preview.rating_stars}/5` : "—")}
        {dimRows}
        {row(
          "Comentário",
          preview.comment_preview.length > 360
            ? `${preview.comment_preview.slice(0, 360)}…`
            : preview.comment_preview || "—",
        )}
        {showReferralAfterPublishHint ? (
          <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-border/50 mt-2">
            <span className="font-medium text-foreground">Nota baixa:</span> após tocar em{" "}
            <span className="font-medium text-foreground">Publicar</span>, a mensagem de confirmação incluirá a opção
            de <span className="font-medium text-foreground">encaminhar ao vereador</span>, se desejar.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
