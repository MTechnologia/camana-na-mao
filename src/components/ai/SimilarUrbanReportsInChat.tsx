import { useCallback, useMemo, useState } from "react";
import { ThumbsUp, MapPin, Hash, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export type SimilarReportPayload = {
  reports: Array<{
    id: string;
    protocol_code: string | null;
    category: string;
    subcategory: string | null;
    description: string | null;
    location_address: string | null;
    neighborhood: string | null;
    severity: string | null;
    created_at: string;
    distance_meters: number;
  }>;
  center: { lat: number; lon: number };
};

function formatDistance(m: number): string {
  if (!Number.isFinite(m) || m < 0) return "—";
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

type Props = {
  payload: SimilarReportPayload;
  className?: string;
};

/**
 * Lista de relatos urbanos próximos (ordenados por distância no backend) com ação de apoiar (curtida).
 */
export function SimilarUrbanReportsInChat({ payload, className }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [supportedIds, setSupportedIds] = useState<Set<string>>(new Set());
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const rows = useMemo(() => payload.reports ?? [], [payload.reports]);

  const apoiar = useCallback(
    async (reportId: string) => {
      if (!user) {
        toast({
          variant: "destructive",
          title: "Login necessário",
          description: "Entre na sua conta para apoiar um relato.",
        });
        return;
      }
      setLoadingId(reportId);
      try {
        const { error } = await supabase.from("urban_report_likes").insert({
          report_id: reportId,
          user_id: user.id,
        });
        if (error) {
          if (error.code === "23505" || error.message?.includes("duplicate")) {
            toast({ title: "Você já apoiou este relato." });
            setSupportedIds((s) => new Set(s).add(reportId));
          } else {
            throw error;
          }
        } else {
          toast({ title: "Apoio registrado", description: "Obrigado por reforçar este relato." });
          setSupportedIds((s) => new Set(s).add(reportId));
        }
      } catch (e) {
        console.error(e);
        toast({
          variant: "destructive",
          title: "Não foi possível apoiar",
          description: "Tente novamente em instantes.",
        });
      } finally {
        setLoadingId(null);
      }
    },
    [user, toast]
  );

  if (rows.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-2 my-2 max-w-full",
        className
      )}
    >
      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
        Relatos próximos (mesma categoria), do mais próximo ao mais distante
      </p>
      <ul className="space-y-2">
        {rows.map((r) => {
          const supported = supportedIds.has(r.id);
          return (
            <li
              key={r.id}
              className="rounded-md border bg-card/80 p-2.5 text-sm flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between gap-y-2"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  {r.protocol_code ? (
                    <span className="inline-flex items-center gap-0.5 font-mono">
                      <Hash className="h-3 w-3" aria-hidden />
                      {r.protocol_code}
                    </span>
                  ) : null}
                  <span className="text-primary font-medium">{formatDistance(r.distance_meters)}</span>
                </div>
                {r.description ? (
                  <p className="text-foreground leading-snug line-clamp-3 break-words">{r.description}</p>
                ) : null}
                {r.location_address || r.neighborhood ? (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {[r.location_address, r.neighborhood].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 w-full sm:w-auto flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => navigate(`/relato-urbano/historico?reportId=${encodeURIComponent(r.id)}`)}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" aria-hidden />
                  Ver detalhes
                </Button>
                <Button
                  type="button"
                  variant={supported ? "secondary" : "default"}
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={supported || loadingId === r.id}
                  onClick={() => apoiar(r.id)}
                >
                  <ThumbsUp className="h-3.5 w-3.5 mr-1.5" aria-hidden />
                  {supported ? "Apoiado" : "Apoiar"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function base64Utf8ToString(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function parseSimilarUrbanReportsB64(content: string): SimilarReportPayload | null {
  const m = content.match(/\[SIMILAR_URBAN_REPORTS_B64:([A-Za-z0-9+/=]+)\]/);
  if (!m?.[1]) return null;
  try {
    const json = base64Utf8ToString(m[1]);
    const data = JSON.parse(json) as SimilarReportPayload;
    if (!data || !Array.isArray(data.reports)) return null;
    return data;
  } catch {
    return null;
  }
}
