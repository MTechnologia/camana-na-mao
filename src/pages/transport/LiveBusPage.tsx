import { useMemo, useState, useCallback, useEffect } from "react";
import { MapPin, RefreshCw, Info, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { invokeSptransOlhoVivo } from "@/lib/sptransOlhoVivo";
import { parseBusPositionsFromOlhoVivo } from "@/lib/parseOlhoVivoPosicao";
import { formatPrevisaoChegada } from "@/lib/parseOlhoVivoPrevisao";
import {
  pickClFromLinhaBuscar,
  findLineInPosicaoAgregada,
} from "@/lib/sptransOlhoVivoLineCode";
import { LineSearchInput } from "@/components/transport/LineSearchInput";
import { ParadaSearchInput } from "@/components/transport/ParadaSearchInput";
import { LiveBusMap } from "@/components/transport/LiveBusMap";
import PageHeader from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGeolocation } from "@/hooks/useGeolocation";
import { MAX_GPS_ACCURACY_NEARBY_UI_METERS } from "@/lib/gpsAccuracy";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import type { CepCenter } from "@/components/map/CepSearchCard";
import { LocationSearchCard, type NearbyLocationUiPhase } from "@/components/map/LocationSearchCard";
import { getUserPrimaryAddressCenter } from "@/lib/userPrimaryAddressCenter";

type SelectedLine = { id: string; line_code: string; line_name: string };

type PositionSource =
  | { kind: "linha"; cl: number }
  | { kind: "agregada"; lineCode: string };

const AUTO_REFRESH_MS = 25_000;
type NearbyLocationMode = "unset" | "gps" | "profile_address" | "cep_lookup";

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object";
}

function getInvokeErrorMessage(data: unknown, fallback: string): string | null {
  if (!isRecord(data)) return null;
  if (typeof data.error === "string") return data.error;
  return null;
}

export default function LiveBusPage() {
  const { user } = useAuth();
  const [geoInsecureContext, setGeoInsecureContext] = useState(false);
  useEffect(() => {
    setGeoInsecureContext(
      typeof window !== "undefined" && !window.isSecureContext,
    );
  }, []);

  const [selectedLine, setSelectedLine] = useState<SelectedLine | null>(null);
  const [loading, setLoading] = useState(false);
  const [rawJson, setRawJson] = useState<unknown>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [resolvedCodigo, setResolvedCodigo] = useState<number | null>(null);
  const [positionSource, setPositionSource] = useState<PositionSource | null>(
    null,
  );
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [codigoParadaPrevisao, setCodigoParadaPrevisao] = useState("");
  const [paradaSelecionadaResumo, setParadaSelecionadaResumo] = useState<
    string | null
  >(null);
  const [previsaoLoading, setPrevisaoLoading] = useState(false);
  const [previsaoText, setPrevisaoText] = useState<string | null>(null);
  const [cepCenter, setCepCenter] = useState<CepCenter | null>(null);
  const [locationMode, setLocationMode] = useState<NearbyLocationMode>("unset");
  const [locationUiPhase, setLocationUiPhase] = useState<NearbyLocationUiPhase>("picking");
  const [savedProfileCenter, setSavedProfileCenter] = useState<CepCenter | null>(null);
  const [profileAddressLoading, setProfileAddressLoading] = useState(false);

  const {
    latitude: userLat,
    longitude: userLng,
    error: geoError,
    loading: geoLoading,
    refetch: refetchGeo,
  } = useGeolocation({
    autoRequest: false,
    maxAccuracyMeters: MAX_GPS_ACCURACY_NEARBY_UI_METERS,
  });

  const searchLat = locationMode === "gps" ? userLat : cepCenter?.latitude ?? null;
  const searchLng = locationMode === "gps" ? userLng : cepCenter?.longitude ?? null;
  const userLocation =
    searchLat != null && searchLng != null
      ? { lat: searchLat, lng: searchLng }
      : null;

  const lockedLabel = useMemo(() => {
    if (locationUiPhase !== "locked") return null;
    if (locationMode === "gps" && searchLat != null && searchLng != null) return "Minha localização atual";
    return cepCenter?.label ?? null;
  }, [locationUiPhase, locationMode, searchLat, searchLng, cepCenter]);

  const handleAlterarLocal = useCallback(() => {
    setLocationUiPhase("picking");
    setLocationMode("unset");
    setCepCenter(null);
  }, []);

  const handleRequestGps = useCallback(() => {
    setLocationMode("gps");
    setCepCenter(null);
    refetchGeo();
  }, [refetchGeo]);

  const handleUseProfileAddress = useCallback(async () => {
    if (savedProfileCenter) {
      setCepCenter(savedProfileCenter);
      setLocationMode("profile_address");
      setLocationUiPhase("locked");
      return;
    }
    if (!user?.id) {
      toast.error("Faça login para usar o endereço cadastrado.");
      return;
    }
    setProfileAddressLoading(true);
    try {
      const result = await getUserPrimaryAddressCenter(user.id);
      if (result.center) {
        setSavedProfileCenter(result.center);
        setCepCenter(result.center);
        setLocationMode("profile_address");
        setLocationUiPhase("locked");
      } else if (result.reason === "not_found") {
        toast.error("Você ainda não tem endereço cadastrado. Cadastre em Perfil → Endereço.");
      } else {
        toast.error("Seu endereço cadastrado ainda não possui coordenadas. Atualize em Perfil → Endereço.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar endereço cadastrado");
    } finally {
      setProfileAddressLoading(false);
    }
  }, [savedProfileCenter, user?.id]);

  const handleCepSearchComplete = useCallback((center: CepCenter) => {
    setCepCenter(center);
    setLocationMode("cep_lookup");
    setLocationUiPhase("locked");
  }, []);

  useEffect(() => {
    if (locationMode !== "gps") return;
    if (geoLoading) return;
    if (userLat != null && userLng != null && !geoError) {
      setLocationUiPhase("locked");
    }
  }, [locationMode, geoLoading, userLat, userLng, geoError]);

  useEffect(() => {
    if (locationMode !== "gps" || geoLoading) return;
    if (geoError) {
      toast.error(geoError);
      setLocationMode("unset");
      setLocationUiPhase("picking");
    }
  }, [locationMode, geoLoading, geoError]);

  const buses = useMemo(
    () => (rawJson ? parseBusPositionsFromOlhoVivo(rawJson) : []),
    [rawJson],
  );

  const resolveCodigoLinha = useCallback(
    async (line: SelectedLine, override: string): Promise<number | null> => {
      const trimmed = override.trim();
      if (trimmed) {
        const n = parseInt(trimmed, 10);
        if (!Number.isFinite(n)) return null;
        return n;
      }
      if (/^\d+$/.test(line.line_code.trim())) {
        return parseInt(line.line_code.trim(), 10);
      }
      // Documentação SPTrans: GET /Linha/Buscar?termosBusca=...
      // Vários formatos (ex.: só "7000" vs "7000-10") alteram o resultado; tentamos em sequência.
      const termCandidates = [
        line.line_code.trim(),
        line.line_code.split("-")[0]?.trim() ?? "",
        line.line_code.replace(/-/g, " ").trim(),
      ]
        .filter((s) => s.length > 0)
        .filter((s, i, arr) => arr.indexOf(s) === i);

      for (const termosBusca of termCandidates) {
        const { data, error: fnError } = await invokeSptransOlhoVivo(supabase, {
          path: "Linha/Buscar",
          termosBusca,
        });
        if (fnError) {
          throw new Error(fnError.message);
        }
        const msg = getInvokeErrorMessage(data, "");
        if (msg) throw new Error(msg);
        const cl = pickClFromLinhaBuscar(data, line);
        if (cl != null) return cl;
      }
      return null;
    },
    [],
  );

  const refreshPositions = useCallback(async () => {
    if (!selectedLine || !positionSource) return;
    setLoading(true);
    setFetchError(null);
    try {
      if (positionSource.kind === "linha") {
        const { data, error: fnError } = await invokeSptransOlhoVivo(supabase, {
          path: "Posicao/Linha",
          codigoLinha: positionSource.cl,
        });
        if (fnError) {
          setFetchError(fnError.message);
          return;
        }
        const msg = getInvokeErrorMessage(data, "");
        if (msg) {
          setFetchError(msg);
          return;
        }
        setRawJson(data ?? null);
        return;
      }
      const { data: posData, error: posErr } = await invokeSptransOlhoVivo(
        supabase,
        { path: "Posicao" },
      );
      if (posErr) {
        setFetchError(posErr.message);
        return;
      }
      const posMsg = getInvokeErrorMessage(posData, "");
      if (posMsg) {
        setFetchError(posMsg);
        return;
      }
      const found = findLineInPosicaoAgregada(
        posData,
        positionSource.lineCode,
      );
      if (found) {
        setRawJson(found.snapshot);
        setResolvedCodigo(found.cl);
      } else {
        setFetchError(
          "Não foi possível localizar esta linha na resposta agregada. Atualize manualmente.",
        );
      }
    } catch (e) {
      setFetchError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [positionSource, selectedLine, supabase]);

  useEffect(() => {
    if (!autoRefresh || !positionSource || !selectedLine) return;
    const id = window.setInterval(() => {
      void refreshPositions();
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [autoRefresh, positionSource, selectedLine, refreshPositions]);

  const fetchPrevisao = async () => {
    if (!selectedLine || resolvedCodigo == null) return;
    const cp = parseInt(codigoParadaPrevisao.trim(), 10);
    if (!Number.isFinite(cp)) {
      setPrevisaoText("Informe o código numérico da parada (codigoParada).");
      return;
    }
    setPrevisaoLoading(true);
    setPrevisaoText(null);
    try {
      const { data, error: fnError } = await invokeSptransOlhoVivo(supabase, {
        path: "Previsao",
        codigoParada: cp,
        codigoLinha: resolvedCodigo,
      });
      if (fnError) {
        setPrevisaoText(fnError.message);
        return;
      }
      const msg = getInvokeErrorMessage(data, "");
      if (msg) {
        setPrevisaoText(msg);
        return;
      }
      setPrevisaoText(
        formatPrevisaoChegada(
          data,
          selectedLine.line_code,
          resolvedCodigo,
        ),
      );
    } catch (e) {
      setPrevisaoText((e as Error).message);
    } finally {
      setPrevisaoLoading(false);
    }
  };

  const fetchPositions = async () => {
    if (!selectedLine) {
      setFetchError("Selecione uma linha.");
      return;
    }
    setLoading(true);
    setFetchError(null);
    setRawJson(null);
    setResolvedCodigo(null);
    setPositionSource(null);
    setPrevisaoText(null);
    try {
      let codigo = await resolveCodigoLinha(selectedLine, "");
      let rawFromPosicaoAgregada: unknown = null;

      if (codigo == null) {
        const { data: posData, error: posErr } = await invokeSptransOlhoVivo(
          supabase,
          { path: "Posicao" },
        );
        if (posErr) {
          setFetchError(posErr.message);
          return;
        }
        const posMsg = getInvokeErrorMessage(posData, "");
        if (posMsg) {
          setFetchError(posMsg);
          return;
        }
        const found = findLineInPosicaoAgregada(posData, selectedLine.line_code);
        if (found) {
          codigo = found.cl;
          rawFromPosicaoAgregada = found.snapshot;
        }
      }

      if (codigo == null) {
        setFetchError(
          "Não foi possível obter o código numérico da linha na API Olho Vivo. Tente outra denominação da linha ou volte a tentar mais tarde.",
        );
        return;
      }
      setResolvedCodigo(codigo);

      if (rawFromPosicaoAgregada != null) {
        setRawJson(rawFromPosicaoAgregada);
        setPositionSource({
          kind: "agregada",
          lineCode: selectedLine.line_code,
        });
        return;
      }

      const { data, error: fnError } = await invokeSptransOlhoVivo(supabase, {
        path: "Posicao/Linha",
        codigoLinha: codigo,
      });
      if (fnError) {
        setFetchError(fnError.message);
        return;
      }
      const msg = getInvokeErrorMessage(data, "");
      if (msg) {
        setFetchError(msg);
        return;
      }
      setRawJson(data ?? null);
      setPositionSource({ kind: "linha", cl: codigo });
    } catch (e) {
      setFetchError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="Ônibus ao vivo" backTo="/relatos" />
      <div className="min-h-screen bg-background pt-[60px] pb-24 px-4 max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <Label>Linha</Label>
          <LineSearchInput
            onSelectLine={(line) => {
              setSelectedLine(line);
              setRawJson(null);
              setFetchError(null);
              setResolvedCodigo(null);
              setPositionSource(null);
              setPrevisaoText(null);
              setCodigoParadaPrevisao("");
              setParadaSelecionadaResumo(null);
            }}
            allowCustom
          />
        </div>

        <LocationSearchCard
          phase={locationUiPhase}
          lockedLabel={lockedLabel}
          onAlterarLocal={handleAlterarLocal}
          onRequestGps={handleRequestGps}
          onUseProfileAddress={handleUseProfileAddress}
          profileAddressLoading={profileAddressLoading}
          onCepSearchComplete={handleCepSearchComplete}
          geoLoading={geoLoading}
          gpsError={locationUiPhase === "picking" ? geoError : null}
        />

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={fetchPositions}
              disabled={loading || !selectedLine}
            >
              {loading ? (
                "A atualizar…"
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar posições
                </>
              )}
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
              disabled={!positionSource}
            />
            <Label htmlFor="auto-refresh" className="font-normal cursor-pointer">
              Atualizar automaticamente (~{AUTO_REFRESH_MS / 1000}s)
            </Label>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Com dados carregados, o mapa interpola o movimento entre uma atualização e a
          seguinte. Respeite os limites da API SPTrans ao usar o modo automático.
        </p>

        <div className="space-y-3 rounded-lg border p-4 bg-muted/20">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="w-4 h-4" />
            Previsão de chegada (parada)
          </div>
          <div className="space-y-2">
            <Label htmlFor="parada-busca">Parada</Label>
            <ParadaSearchInput
              key={selectedLine?.line_code ?? "sem-linha"}
              onSelectParada={(p) => {
                setCodigoParadaPrevisao(String(p.cp));
                setParadaSelecionadaResumo(
                  [p.np, p.ed].filter(Boolean).join(" · "),
                );
              }}
            />
            {paradaSelecionadaResumo && codigoParadaPrevisao && (
              <p className="text-xs text-muted-foreground">
                Selecionado: código <strong>{codigoParadaPrevisao}</strong> —{" "}
                {paradaSelecionadaResumo}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="space-y-1 flex-1 min-w-[140px]">
              <Label htmlFor="codigo-parada">Código da parada (manual)</Label>
              <Input
                id="codigo-parada"
                inputMode="numeric"
                placeholder="Se já souber o código, pode editar aqui"
                value={codigoParadaPrevisao}
                onChange={(e) => {
                  setCodigoParadaPrevisao(e.target.value);
                  setParadaSelecionadaResumo(null);
                }}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={
                previsaoLoading ||
                resolvedCodigo == null ||
                !codigoParadaPrevisao.trim()
              }
              onClick={() => void fetchPrevisao()}
            >
              {previsaoLoading ? "A consultar…" : "Consultar previsão"}
            </Button>
          </div>
          {previsaoText && (
            <pre className="text-xs whitespace-pre-wrap bg-background border rounded-md p-3 mt-2">
              {previsaoText}
            </pre>
          )}
        </div>
        {geoInsecureContext && (
          <Alert className="border-amber-200 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-900">
            <Info className="h-4 w-4 text-amber-800 dark:text-amber-200" />
            <AlertTitle className="text-amber-900 dark:text-amber-100">
              Localização e endereço do site
            </AlertTitle>
            <AlertDescription className="text-amber-900/90 dark:text-amber-100/90">
              Em <strong className="font-medium">http://</strong> pelo IP da rede (ex.:{" "}
              <code className="text-xs">192.168.x.x</code>), o navegador pode tratar o
              site como não seguro e recusar ou dificultar o GPS. Para testar no telemóvel
              ou PC, use <code className="text-xs">http://localhost:5173</code> no mesmo
              equipamento onde corre o Vite, ou sirva o app com HTTPS.
            </AlertDescription>
          </Alert>
        )}

        {geoError && (
          <Alert className="border-amber-200 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-900">
            <MapPin className="h-4 w-4 text-amber-800 dark:text-amber-200" />
            <AlertTitle className="text-amber-900 dark:text-amber-100">
              Não foi possível mostrar a sua posição
            </AlertTitle>
            <AlertDescription className="text-amber-900/90 dark:text-amber-100/90 whitespace-pre-wrap">
              {geoError}
            </AlertDescription>
          </Alert>
        )}

        {resolvedCodigo != null && (
          <p className="text-xs text-muted-foreground">
            Consulta: <strong>Posicao/Linha</strong> · código{" "}
            <strong>{resolvedCodigo}</strong>
          </p>
        )}

        {fetchError && (
          <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">
            {fetchError}
          </div>
        )}

        {!fetchError && rawJson && buses.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Resposta recebida, mas não encontrámos coordenadas válidas nos dados.
          </p>
        )}

        <LiveBusMap buses={buses} userLocation={userLocation} />

        {buses.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {buses.length} veículo(s) no mapa.
          </p>
        )}
      </div>
    </>
  );
}
