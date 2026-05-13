import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Loader2, Building2, History, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getBoundingBoxForRadiusMeters, mapPublicServiceRowToNearbyService } from "@/lib/nearbyServiceRow";
import { textMatchesSearchQuery } from "@/lib/searchTextMatch";
import { cn } from "@/lib/utils";
import { getGoogleMapsApiKey, getGoogleMapsNotConfiguredMessage } from "@/lib/googleMapsKey";
import { lookupCepAddress } from "@/lib/cepLookup";
import { getServiceDisplayName } from "@/lib/mapUtils";
import { createClientId } from "@/lib/clientId";
import type { NearbyService } from "@/hooks/useNearbyServices";
import type { CepCenter } from "@/components/map/CepSearchCard";
import {
  filterRecentEntriesForQuery,
  useNearbySearchRecent,
  type NearbyRecentSearchEntry,
} from "@/hooks/useNearbySearchRecent";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const MAX_PLACE_SUGGESTIONS = 5;
const MAX_EQUIPMENT_SUGGESTIONS = 8;
const MAX_RECENT_WHEN_TYPING = 5;
/** Autocomplete de endereços: debounce curto para sensação “em tempo real”. */
const PLACES_DEBOUNCE_MS = 200;
/** Debounce para RPC de equipamentos (área ampla). */
const EQUIPMENT_RPC_DEBOUNCE_MS = 320;
const MIN_TEXT_QUERY_TO_SAVE = 2;
/** Raio padrão para sugestões de equipamento no dropdown (além do raio da lista). */
const DEFAULT_EQUIPMENT_SUGGESTION_RADIUS_M = 45_000;
/** Mínimo de caracteres para consultar equipamentos no servidor (alinhado ao RPC). */
const MIN_EQUIPMENT_QUERY_CHARS = 2;

type PlacePrediction = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

function matchesEquipmentQuery(
  s: NearbyService,
  q: string,
  resolved: Record<string, string>,
): boolean {
  const haystack = [
    s.name,
    s.address,
    s.district,
    resolved[s.id] ?? "",
    s.services_offered ?? "",
  ].join(" ");
  return textMatchesSearchQuery(haystack, q);
}

function isCepDigits(value: string): boolean {
  return value.replace(/\D/g, "").length === 8;
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-inherit rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

function recentKindLabel(kind: NearbyRecentSearchEntry["kind"]): string {
  if (kind === "text") return "Busca";
  if (kind === "place") return "Endereço";
  return "Equipamento";
}

type NearbyEquipmentSearchInputProps = {
  value: string;
  onChange: (next: string) => void;
  /** Lista já filtrada por raio/tipo/status/horário — antes do filtro textual */
  servicesInArea: NearbyService[];
  resolvedAddresses: Record<string, string>;
  /** Ao escolher um lugar/CEP: recentrar a busca neste ponto */
  onPlaceCenterSelected: (center: CepCenter) => void;
  /** Ao escolher um equipamento na lista: centralizar o mapa neste ponto (ex.: abre aba Mapa) */
  onEquipmentMapFocus?: (service: NearbyService) => void;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
};

export function NearbyEquipmentSearchInput({
  value,
  onChange,
  servicesInArea,
  resolvedAddresses,
  onPlaceCenterSelected,
  onEquipmentMapFocus,
  searchCenterLat,
  searchCenterLng,
  equipmentSuggestionRadiusMeters = DEFAULT_EQUIPMENT_SUGGESTION_RADIUS_M,
  serviceTypesFilter,
  disabled,
  className,
  inputClassName,
}: NearbyEquipmentSearchInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [placePredictions, setPlacePredictions] = useState<PlacePrediction[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedFlatIndex, setSelectedFlatIndex] = useState(-1);
  const [remoteEquipmentRows, setRemoteEquipmentRows] = useState<NearbyService[]>([]);
  const [remoteEquipmentLoading, setRemoteEquipmentLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sessionTokenRef = useRef<string>(createClientId("places-session"));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const equipmentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const equipmentRequestIdRef = useRef(0);

  const {
    entries: recentEntries,
    addTextQuery,
    addPlace,
    addEquipment,
    removeEntry,
    clearAll,
    cloudHydrated,
  } = useNearbySearchRecent();

  const apiKey = getGoogleMapsApiKey();

  const filteredRecentRows = useMemo(() => {
    const t = value.trim();
    if (!t) return recentEntries;
    return filterRecentEntriesForQuery(recentEntries, t, MAX_RECENT_WHEN_TYPING);
  }, [recentEntries, value]);

  const localEquipmentMatches = useMemo(() => {
    const q = value.trim();
    if (q.length < 1) return [];
    return servicesInArea.filter((s) => matchesEquipmentQuery(s, q, resolvedAddresses));
  }, [value, servicesInArea, resolvedAddresses]);

  const mergedEquipmentMatches = useMemo(() => {
    const byId = new Map<string, NearbyService>();
    for (const s of remoteEquipmentRows) {
      if (!byId.has(s.id)) byId.set(s.id, s);
    }
    for (const s of localEquipmentMatches) {
      byId.set(s.id, s);
    }
    return [...byId.values()]
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
      .slice(0, MAX_EQUIPMENT_SUGGESTIONS);
  }, [remoteEquipmentRows, localEquipmentMatches]);

  const equipmentMatches = mergedEquipmentMatches;

  const placeRows = useMemo(() => placePredictions.slice(0, MAX_PLACE_SUGGESTIONS), [placePredictions]);

  const flatRecentCount = filteredRecentRows.length;
  const flatPlaceCount = placeRows.length;
  const flatEquipmentCount = equipmentMatches.length;
  const flatTotal = flatRecentCount + flatPlaceCount + flatEquipmentCount;

  const fetchPlaces = useCallback(
    async (raw: string) => {
      const q = raw.trim();
      if (q.length < 3 && !isCepDigits(raw)) {
        setPlacePredictions([]);
        setPlacesLoading(false);
        return;
      }

      if (isCepDigits(raw)) {
        setPlacesLoading(true);
        try {
          const cleaned = raw.replace(/\D/g, "");
          const result = await lookupCepAddress(cleaned);
          if (!result.ok) {
            setPlacePredictions([]);
            return;
          }
          const label = [
            result.address.street,
            result.address.neighborhood,
            [result.address.city, result.address.state].filter(Boolean).join(" - "),
          ]
            .filter(Boolean)
            .join(", ");
          setPlacePredictions([
            {
              placeId: `cep-region-${cleaned}`,
              description: label || `CEP ${cleaned}`,
              mainText: "Buscar neste CEP",
              secondaryText: label || `CEP ${cleaned.slice(0, 5)}-${cleaned.slice(5)}`,
            },
          ]);
        } finally {
          setPlacesLoading(false);
        }
        return;
      }

      setPlacesLoading(true);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("google-places-autocomplete", {
          body: {
            query: q,
            sessionToken: sessionTokenRef.current,
          },
        });
        if (fnError) {
          console.warn("[NearbySearch] places autocomplete:", fnError);
          setPlacePredictions([]);
          return;
        }
        if (data?.predictions?.length) {
          setPlacePredictions(data.predictions as PlacePrediction[]);
        } else {
          setPlacePredictions([]);
        }
      } catch (e) {
        console.warn("[NearbySearch] places fetch:", e);
        setPlacePredictions([]);
      } finally {
        setPlacesLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchPlaces(value);
    }, PLACES_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, fetchPlaces]);

  useEffect(() => {
    if (equipmentDebounceRef.current) clearTimeout(equipmentDebounceRef.current);
    const q = value.trim();
    const lat = searchCenterLat;
    const lng = searchCenterLng;
    if (
      q.length < MIN_EQUIPMENT_QUERY_CHARS ||
      typeof lat !== "number" ||
      Number.isNaN(lat) ||
      typeof lng !== "number" ||
      Number.isNaN(lng)
    ) {
      setRemoteEquipmentRows([]);
      setRemoteEquipmentLoading(false);
      return;
    }

    equipmentDebounceRef.current = setTimeout(() => {
      const reqId = ++equipmentRequestIdRef.current;
      setRemoteEquipmentLoading(true);
      void (async () => {
        try {
          const r = equipmentSuggestionRadiusMeters;
          const { minLat, maxLat, minLng, maxLng } = getBoundingBoxForRadiusMeters(lat, lng, r);
          const effectiveTypes = serviceTypesFilter?.filter((t) => t !== "all") ?? [];
          const { data, error } = await supabase.rpc("search_public_services_fulltext", {
            min_lat: minLat,
            max_lat: maxLat,
            min_lng: minLng,
            max_lng: maxLng,
            center_lat: lat,
            center_lng: lng,
            radius_meters: r,
            search_query: q,
            service_types: effectiveTypes.length > 0 ? effectiveTypes : null,
            result_limit: 24,
          });
          if (reqId !== equipmentRequestIdRef.current) return;
          if (error) {
            console.warn("[NearbySearch] equipment RPC:", error.message);
            setRemoteEquipmentRows([]);
            return;
          }
          const rows = (data || [])
            .map((raw) =>
              mapPublicServiceRowToNearbyService(raw as Record<string, unknown>, lat, lng),
            )
            .filter((s): s is NearbyService => s !== null);
          setRemoteEquipmentRows(rows);
        } catch (e) {
          if (reqId !== equipmentRequestIdRef.current) return;
          console.warn("[NearbySearch] equipment fetch:", e);
          setRemoteEquipmentRows([]);
        } finally {
          if (reqId === equipmentRequestIdRef.current) {
            setRemoteEquipmentLoading(false);
          }
        }
      })();
    }, EQUIPMENT_RPC_DEBOUNCE_MS);

    return () => {
      if (equipmentDebounceRef.current) clearTimeout(equipmentDebounceRef.current);
      equipmentRequestIdRef.current += 1;
      setRemoteEquipmentLoading(false);
    };
  }, [value, searchCenterLat, searchCenterLng, equipmentSuggestionRadiusMeters, serviceTypesFilter]);

  const resolveCepToCenter = useCallback(
    async (cleanedCep: string): Promise<CepCenter | null> => {
      if (!apiKey) {
        toast.error(getGoogleMapsNotConfiguredMessage());
        return null;
      }
      const result = await lookupCepAddress(cleanedCep);
      if (!result.ok) {
        toast.error("CEP não encontrado");
        return null;
      }
      const addressParts = [
        result.address.street,
        result.address.neighborhood,
        result.address.city,
        result.address.state,
        "Brasil",
      ].filter(Boolean);
      const address = addressParts.join(", ");
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&language=pt-BR`;
      const geoRes = await fetch(geocodeUrl);
      const geoData = await geoRes.json();
      const first = geoData?.results?.[0];
      if (!first?.geometry?.location) {
        toast.error("Não foi possível localizar este CEP no mapa");
        return null;
      }
      const { lat, lng } = first.geometry.location;
      return {
        latitude: lat,
        longitude: lng,
        label: first.formatted_address ?? address,
      };
    },
    [apiKey],
  );

  const handleSelectPlacePrediction = useCallback(
    async (prediction: PlacePrediction) => {
      setDetailsLoading(true);
      setShowDropdown(false);
      setSelectedFlatIndex(-1);

      if (prediction.placeId.startsWith("cep-region-")) {
        const cep = prediction.placeId.replace("cep-region-", "");
        const center = await resolveCepToCenter(cep);
        if (center) {
          onChange("");
          addPlace({
            latitude: center.latitude,
            longitude: center.longitude,
            label: center.label ?? `CEP ${cep}`,
          });
          onPlaceCenterSelected(center);
          toast.success("Mostrando serviços próximos a este endereço");
        }
        setDetailsLoading(false);
        return;
      }

      try {
        const { data, error: fnError } = await supabase.functions.invoke("google-places-details", {
          body: {
            placeId: prediction.placeId,
            sessionToken: sessionTokenRef.current,
          },
        });
        sessionTokenRef.current = createClientId("places-session");

        if (fnError || !data?.address) {
          toast.error("Não foi possível obter o endereço completo");
          setDetailsLoading(false);
          return;
        }
        const addr = data.address as {
          latitude: number;
          longitude: number;
          formattedAddress: string;
        };
        onChange("");
        addPlace({
          latitude: addr.latitude,
          longitude: addr.longitude,
          label: addr.formattedAddress ?? prediction.description,
        });
        onPlaceCenterSelected({
          latitude: addr.latitude,
          longitude: addr.longitude,
          label: addr.formattedAddress ?? prediction.description,
        });
        toast.success("Mostrando serviços próximos a este endereço");
      } catch {
        toast.error("Erro ao buscar detalhes do lugar");
      } finally {
        setDetailsLoading(false);
      }
    },
    [onChange, onPlaceCenterSelected, resolveCepToCenter, addPlace],
  );

  const handleSelectEquipment = useCallback(
    (s: NearbyService) => {
      const display = getServiceDisplayName({
        name: s.name,
        address: s.address,
        district: s.district,
        service_type: s.service_type,
      });
      onChange(display);
      addEquipment({
        serviceId: s.id,
        label: display,
        latitude: s.latitude,
        longitude: s.longitude,
      });
      onEquipmentMapFocus?.(s);
      setShowDropdown(false);
      setSelectedFlatIndex(-1);
      inputRef.current?.blur();
    },
    [onChange, onEquipmentMapFocus, addEquipment],
  );

  const handleSelectRecent = useCallback(
    (entry: NearbyRecentSearchEntry) => {
      setShowDropdown(false);
      setSelectedFlatIndex(-1);
      if (entry.kind === "text" && entry.text) {
        onChange(entry.text);
        return;
      }
      if (entry.kind === "place" && entry.place) {
        onChange("");
        onPlaceCenterSelected({
          latitude: entry.place.latitude,
          longitude: entry.place.longitude,
          label: entry.place.label,
        });
        return;
      }
      if (entry.kind === "equipment" && entry.equipment) {
        const found = servicesInArea.find((s) => s.id === entry.equipment.serviceId);
        if (found) {
          handleSelectEquipment(found);
          return;
        }
        onChange(entry.equipment.label);
        toast.info("Equipamento pode não estar mais nesta área — ajuste o mapa ou o raio.");
      }
    },
    [onChange, onPlaceCenterSelected, handleSelectEquipment, servicesInArea],
  );

  const hasTypedQuery = value.trim().length >= 1;
  const dropdownVisible =
    showDropdown &&
    (flatRecentCount > 0 ||
      (hasTypedQuery &&
        (placesLoading ||
          flatPlaceCount > 0 ||
          flatEquipmentCount > 0 ||
          remoteEquipmentLoading)));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setShowDropdown(false);
      setSelectedFlatIndex(-1);
      return;
    }

    if (e.key === "Enter" && selectedFlatIndex < 0 && value.trim().length >= MIN_TEXT_QUERY_TO_SAVE) {
      e.preventDefault();
      addTextQuery(value.trim());
      setShowDropdown(false);
      return;
    }

    if (!dropdownVisible || flatTotal === 0) {
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedFlatIndex((i) => (i < flatTotal - 1 ? i + 1 : i));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedFlatIndex((i) => (i > 0 ? i - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedFlatIndex < 0) return;
        if (selectedFlatIndex < flatRecentCount) {
          handleSelectRecent(filteredRecentRows[selectedFlatIndex]);
        } else if (selectedFlatIndex < flatRecentCount + flatPlaceCount) {
          void handleSelectPlacePrediction(placeRows[selectedFlatIndex - flatRecentCount]);
        } else {
          handleSelectEquipment(
            equipmentMatches[selectedFlatIndex - flatRecentCount - flatPlaceCount],
          );
        }
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const onDocMouseDown = (ev: MouseEvent) => {
      const t = ev.target as Node;
      if (dropdownRef.current?.contains(t) || inputRef.current?.contains(t)) return;
      setShowDropdown(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  useEffect(() => {
    setSelectedFlatIndex(-1);
  }, [value, flatRecentCount, flatPlaceCount, flatEquipmentCount]);

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="search"
          placeholder="Equipamento (CEU, UBS…), endereço ou bairro"
          value={value}
          disabled={disabled || detailsLoading}
          onChange={(e) => {
            onChange(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          className={cn(
            "pl-9",
            value.trim().length > 0 && !disabled && !detailsLoading ? "pr-16" : "pr-9",
            inputClassName,
          )}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={dropdownVisible}
          aria-controls="nearby-search-suggestions"
          aria-busy={!cloudHydrated}
        />
        {value.trim().length > 0 && !disabled && !detailsLoading && (
          <button
            type="button"
            className={cn(
              "absolute top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted/80",
              placesLoading ? "right-10" : "right-3",
            )}
            aria-label="Limpar busca"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange("");
              setShowDropdown(recentEntries.length > 0);
              inputRef.current?.focus();
            }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {(placesLoading || detailsLoading) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {dropdownVisible && (
        <div
          id="nearby-search-suggestions"
          ref={dropdownRef}
          className="absolute z-50 left-0 right-0 top-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-md max-h-[min(70vh,22rem)] overflow-y-auto"
          role="listbox"
        >
          {flatRecentCount > 0 && (
            <div className="border-b border-border/80">
              <div className="sticky top-0 z-[1] flex items-center justify-between gap-2 bg-muted/90 backdrop-blur-sm px-3 py-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" aria-hidden />
                  Buscas recentes
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] text-muted-foreground"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => clearAll()}
                >
                  Limpar
                </Button>
              </div>
              {filteredRecentRows.map((entry, i) => {
                const flatIdx = i;
                const label =
                  entry.kind === "text" && entry.text
                    ? entry.text
                    : entry.kind === "place" && entry.place
                      ? entry.place.label
                      : entry.kind === "equipment" && entry.equipment
                        ? entry.equipment.label
                        : "";
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "flex items-stretch border-b border-border/40 last:border-b-0",
                      selectedFlatIndex === flatIdx && "bg-muted",
                    )}
                  >
                    <button
                      type="button"
                      role="option"
                      className="min-w-0 flex-1 px-3 py-2.5 text-left flex items-start gap-2 hover:bg-muted/80 transition-colors"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectRecent(entry)}
                    >
                      <History className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight line-clamp-2">
                          <HighlightMatch text={label} query={value} />
                        </p>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">
                          {recentKindLabel(entry.kind)}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="shrink-0 px-2 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                      aria-label={`Remover "${label}" do histórico`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => removeEntry(entry.id)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {flatPlaceCount > 0 && (
            <div className="border-b border-border/80">
              <div className="sticky top-0 z-[1] bg-muted/90 backdrop-blur-sm px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Endereços e lugares
              </div>
              {placeRows.map((p, i) => {
                const flatIdx = flatRecentCount + i;
                return (
                  <button
                    key={p.placeId}
                    type="button"
                    role="option"
                    className={cn(
                      "w-full px-3 py-2.5 text-left flex items-start gap-2 hover:bg-muted/80 transition-colors border-b border-border/40 last:border-b-0",
                      selectedFlatIndex === flatIdx && "bg-muted",
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => void handleSelectPlacePrediction(p)}
                  >
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight line-clamp-2">
                        <HighlightMatch text={p.mainText} query={value} />
                      </p>
                      {p.secondaryText ? (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{p.secondaryText}</p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {flatEquipmentCount > 0 && (
            <div>
              <div className="sticky top-0 z-[1] bg-muted/90 backdrop-blur-sm px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Equipamentos
              </div>
              {equipmentMatches.map((s, i) => {
                const flatIdx = flatRecentCount + flatPlaceCount + i;
                const display = getServiceDisplayName({
                  name: s.name,
                  address: s.address,
                  district: s.district,
                  service_type: s.service_type,
                });
                const sub = [resolvedAddresses[s.id], s.district].filter(Boolean).join(" · ");
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="option"
                    className={cn(
                      "w-full px-3 py-2.5 text-left flex items-start gap-2 hover:bg-muted/80 transition-colors border-b border-border/40 last:border-b-0",
                      selectedFlatIndex === flatIdx && "bg-muted",
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectEquipment(s)}
                  >
                    <Building2 className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight line-clamp-2">
                        <HighlightMatch text={display} query={value} />
                      </p>
                      {sub ? <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{sub}</p> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {placesLoading && flatPlaceCount === 0 && value.trim().length >= 3 && (
            <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Buscando endereços…
            </div>
          )}

          {remoteEquipmentLoading &&
            flatEquipmentCount === 0 &&
            value.trim().length >= MIN_EQUIPMENT_QUERY_CHARS && (
              <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2 border-t border-border/40">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Buscando equipamentos no cadastro…
              </div>
            )}
        </div>
      )}
    </div>
  );
}
