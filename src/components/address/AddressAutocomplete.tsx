import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { lookupCepAddress } from "@/lib/cepLookup";
import { createClientId } from "@/lib/clientId";

export interface StructuredAddress {
  street: string;
  streetNumber: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
}

interface Prediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface AddressAutocompleteProps {
  onSelect: (address: StructuredAddress) => void;
  placeholder?: string;
  className?: string;
}

export function AddressAutocomplete({
  onSelect,
  placeholder = "Digite o endereço...",
  className,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sessionTokenRef = useRef<string>(createClientId("places-session"));
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Formata valor do input como CEP (00000-000) quando o usuário digita só números
  const formatCepDisplay = (value: string): string => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
  };

  // Check if input looks like a CEP (8 digits, optionally with hyphen)
  const isCepFormat = (input: string): boolean => {
    const cleaned = input.replace(/\D/g, "");
    return cleaned.length === 8;
  };

  // Fetch address from ViaCEP
  const fetchFromViaCep = useCallback(async (cep: string): Promise<StructuredAddress | null> => {
    const cleaned = cep.replace(/\D/g, "");
    try {
      const result = await lookupCepAddress(cleaned);
      if (!result.ok) {
        return null;
      }

      return {
        street: result.address.street || "",
        streetNumber: "",
        neighborhood: result.address.neighborhood || "",
        city: result.address.city || "",
        state: result.address.state || "",
        cep: result.address.cep || cleaned,
        formattedAddress: [
          result.address.street,
          result.address.neighborhood,
          [result.address.city, result.address.state].filter(Boolean).join("/"),
        ]
          .filter(Boolean)
          .join(" - "),
        latitude: 0,
        longitude: 0,
      };
    } catch (err) {
      console.error("ViaCEP error:", err);
      return null;
    }
  }, []);

  // Fetch predictions - using ref to avoid dependency issues
  const fetchPredictions = async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Check if it's a CEP - use ViaCEP instead of Google Places
    if (isCepFormat(searchQuery)) {
      const viaCepAddress = await fetchFromViaCep(searchQuery);
      const hasAddressData = !!(
        viaCepAddress &&
        (viaCepAddress.street ||
          viaCepAddress.neighborhood ||
          viaCepAddress.city ||
          viaCepAddress.state)
      );

      if (viaCepAddress && hasAddressData) {
        // Create a synthetic prediction for the CEP result
        setPredictions([
          {
            placeId: `viacep-${viaCepAddress.cep}`,
            description: viaCepAddress.formattedAddress,
            mainText: viaCepAddress.street || `CEP ${viaCepAddress.cep}`,
            secondaryText: [
              viaCepAddress.neighborhood,
              [viaCepAddress.city, viaCepAddress.state].filter(Boolean).join(" - "),
            ]
              .filter(Boolean)
              .join(", "),
          },
        ]);
        setShowDropdown(true);
        setSelectedIndex(-1);
      } else {
        setError("CEP não encontrado ou indisponível no momento");
        setPredictions([]);
        setShowDropdown(false);
      }
      setIsLoading(false);
      return;
    }

    // Use Google Places for regular address search
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "google-places-autocomplete",
        {
          body: {
            query: searchQuery,
            sessionToken: sessionTokenRef.current,
          },
        },
      );

      if (fnError) {
        console.error("Error fetching predictions:", fnError);
        setError("Erro ao buscar endereços");
        setPredictions([]);
      } else if (data?.predictions) {
        setPredictions(data.predictions);
        setShowDropdown(data.predictions.length > 0);
        setSelectedIndex(-1);
      }
    } catch (err) {
      console.error("Error:", err);
      setError("Erro de conexão");
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Use ref to store latest fetch function to avoid stale closures
  const fetchPredictionsRef = useRef(fetchPredictions);
  fetchPredictionsRef.current = fetchPredictions;

  // Debounced search - only depends on query
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchPredictionsRef.current(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // Fetch full address details when a prediction is selected
  const handleSelect = async (prediction: Prediction) => {
    setIsFetchingDetails(true);
    setShowDropdown(false);
    setQuery(prediction.description);

    // Check if this is a ViaCEP result (synthetic placeId)
    if (prediction.placeId.startsWith("viacep-")) {
      const cep = prediction.placeId.replace("viacep-", "");
      const viaCepAddress = await fetchFromViaCep(cep);
      if (viaCepAddress) {
        onSelect(viaCepAddress);
      } else {
        setError("Erro ao obter detalhes do CEP");
      }
      setIsFetchingDetails(false);
      return;
    }

    // Use Google Places for regular selection
    try {
      const { data, error: fnError } = await supabase.functions.invoke("google-places-details", {
        body: {
          placeId: prediction.placeId,
          sessionToken: sessionTokenRef.current,
        },
      });

      // Generate new session token for next search
      sessionTokenRef.current = createClientId("places-session");

      if (fnError) {
        console.error("Error fetching details:", fnError);
        setError("Erro ao obter detalhes do endereço");
      } else if (data?.address) {
        onSelect(data.address);
      }
    } catch (err) {
      console.error("Error:", err);
      setError("Erro de conexão");
    } finally {
      setIsFetchingDetails(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || predictions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < predictions.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && predictions[selectedIndex]) {
          handleSelect(predictions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          inputMode="text"
          autoComplete="street-address"
          value={query}
          onChange={(e) => {
            const raw = e.target.value;
            const digits = raw.replace(/\D/g, "");
            // Se contém só números (e no máximo um hífen), aplicar máscara CEP (00000-000)
            if (/^[\d-]*$/.test(raw) && digits.length <= 8) {
              setQuery(digits.length <= 5 ? digits : formatCepDisplay(digits));
            } else {
              setQuery(raw);
            }
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => predictions.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          className="pl-10 pr-10"
          disabled={isFetchingDetails}
        />
        {(isLoading || isFetchingDetails) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {error && <p className="text-xs text-destructive mt-1">{error}</p>}

      {showDropdown && predictions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 bottom-full mb-1 w-full bg-background border rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {predictions.map((prediction, index) => (
            <button
              key={prediction.placeId}
              type="button"
              className={cn(
                "w-full px-3 py-3 text-left flex items-start gap-3 hover:bg-muted transition-colors",
                index === selectedIndex && "bg-muted",
              )}
              onClick={() => handleSelect(prediction)}
            >
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{prediction.mainText}</p>
                {prediction.secondaryText && (
                  <p className="text-xs text-muted-foreground truncate">
                    {prediction.secondaryText}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
