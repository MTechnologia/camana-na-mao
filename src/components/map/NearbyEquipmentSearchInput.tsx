import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Loader2, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getGoogleMapsApiKey, getGoogleMapsNotConfiguredMessage } from "@/lib/googleMapsKey";
import { lookupCepAddress } from "@/lib/cepLookup";
import { getServiceDisplayName } from "@/lib/mapUtils";
import type { NearbyService } from "@/hooks/useNearbyServices";
import type { CepCenter } from "@/components/map/CepSearchCard";
import { toast } from "sonner";

const MAX_PLACE_SUGGESTIONS = 5;
const MAX_EQUIPMENT_SUGGESTIONS = 8;
const PLACES_DEBOUNCE_MS = 300;

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
  const ql = q.trim().toLowerCase();
  if (!ql) return false;
  const name = (s.name ?? "").toLowerCase();
  const address = (s.address ?? "").toLowerCase();
  const district = (s.district ?? "").toLowerCase();
  const resolvedAddr = (resolved[s.id] ?? "").toLowerCase();
  return (
    name.includes(ql) ||
    address.includes(ql) ||
    district.includes(ql) ||
    resolvedAddr.includes(ql)
  );
}

function isCepDigits(value: string): boolean {
  return value.replace(/\D/g, "").length === 8;
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
  disabled,
  className,
  inputClassName,
}: NearbyEquipmentSearchInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [placePredictions, setPlacePredictions] = useState<PlacePrediction[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedFlatIndex, setSelectedFlatIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sessionTokenRef = useRef<string>(crypto.randomUUID());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apiKey = getGoogleMapsApiKey();

  const equipmentMatches = useMemo(() => {
    const q = value.trim();
    if (q.length < 1) return [];
    return servicesInArea
      .filter((s) => matchesEquipmentQuery(s, q, resolvedAddresses))
      .slice(0, MAX_EQUIPMENT_SUGGESTIONS);
  }, [value, servicesInArea, resolvedAddresses]);

  const placeRows = useMemo(() => placePredictions.slice(0, MAX_PLACE_SUGGESTIONS), [placePredictions]);

  const flatPlaceCount = placeRows.length;
  const flatEquipmentCount = equipmentMatches.length;
  const flatTotal = flatPlaceCount + flatEquipmentCount;

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
        sessionTokenRef.current = crypto.randomUUID();

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
    [onChange, onPlaceCenterSelected, resolveCepToCenter],
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
      onEquipmentMapFocus?.(s);
      setShowDropdown(false);
      setSelectedFlatIndex(-1);
      inputRef.current?.blur();
    },
    [onChange, onEquipmentMapFocus],
  );

  const dropdownVisible =
    showDropdown &&
    value.trim().length >= 1 &&
    (placesLoading || flatPlaceCount > 0 || flatEquipmentCount > 0);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownVisible || flatTotal === 0) {
      if (e.key === "Escape") setShowDropdown(false);
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
        if (selectedFlatIndex < flatPlaceCount) {
          void handleSelectPlacePrediction(placeRows[selectedFlatIndex]);
        } else {
          handleSelectEquipment(equipmentMatches[selectedFlatIndex - flatPlaceCount]);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        setSelectedFlatIndex(-1);
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
  }, [value, flatPlaceCount, flatEquipmentCount]);

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="search"
          placeholder="Buscar por nome, endereço ou bairro"
          value={value}
          disabled={disabled || detailsLoading}
          onChange={(e) => {
            onChange(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => {
            if (value.trim().length >= 1) setShowDropdown(true);
          }}
          onKeyDown={handleKeyDown}
          className={cn("pl-9", inputClassName)}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={dropdownVisible}
        />
        {(placesLoading || detailsLoading) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {dropdownVisible && (
        <div
          ref={dropdownRef}
          className="absolute z-50 left-0 right-0 top-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-md max-h-[min(70vh,22rem)] overflow-y-auto"
          role="listbox"
        >
          {flatPlaceCount > 0 && (
            <div className="border-b border-border/80">
              <div className="sticky top-0 z-[1] bg-muted/90 backdrop-blur-sm px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Endereços e lugares
              </div>
              {placeRows.map((p, i) => {
                const flatIdx = i;
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
                      <p className="text-sm font-medium leading-tight line-clamp-2">{p.mainText}</p>
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
                Equipamentos nesta área
              </div>
              {equipmentMatches.map((s, i) => {
                const flatIdx = flatPlaceCount + i;
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
                      <p className="text-sm font-medium leading-tight line-clamp-2">{display}</p>
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
        </div>
      )}
    </div>
  );
}
