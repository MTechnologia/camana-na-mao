import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
  const sessionTokenRef = useRef<string>(crypto.randomUUID());
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Check if input looks like a CEP (8 digits, optionally with hyphen)
  const isCepFormat = (input: string): boolean => {
    const cleaned = input.replace(/\D/g, '');
    return cleaned.length === 8;
  };

  // Fetch address from ViaCEP
  const fetchFromViaCep = useCallback(async (cep: string): Promise<StructuredAddress | null> => {
    const cleaned = cep.replace(/\D/g, '');
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        return null;
      }
      
      return {
        street: data.logradouro || '',
        streetNumber: '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
        cep: data.cep?.replace('-', '') || cleaned,
        formattedAddress: `${data.logradouro || ''}, ${data.bairro || ''} - ${data.localidade || ''}/${data.uf || ''}`,
        latitude: 0,
        longitude: 0,
      };
    } catch (err) {
      console.error('ViaCEP error:', err);
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
      if (viaCepAddress && viaCepAddress.street) {
        // Create a synthetic prediction for the CEP result
        setPredictions([{
          placeId: `viacep-${viaCepAddress.cep}`,
          description: viaCepAddress.formattedAddress,
          mainText: viaCepAddress.street,
          secondaryText: `${viaCepAddress.neighborhood}, ${viaCepAddress.city} - ${viaCepAddress.state}`,
        }]);
        setShowDropdown(true);
        setSelectedIndex(-1);
      } else {
        setError("CEP não encontrado");
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
        }
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
    if (prediction.placeId.startsWith('viacep-')) {
      const cep = prediction.placeId.replace('viacep-', '');
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
      const { data, error: fnError } = await supabase.functions.invoke(
        "google-places-details",
        {
          body: {
            placeId: prediction.placeId,
            sessionToken: sessionTokenRef.current,
          },
        }
      );

      // Generate new session token for next search
      sessionTokenRef.current = crypto.randomUUID();

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
        setSelectedIndex((prev) =>
          prev < predictions.length - 1 ? prev + 1 : prev
        );
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
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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

      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}

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
                index === selectedIndex && "bg-muted"
              )}
              onClick={() => handleSelect(prediction)}
            >
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {prediction.mainText}
                </p>
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
