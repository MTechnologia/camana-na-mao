import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addressSchema } from "@/lib/validations";
import { MapPin, Loader2, CheckCircle2, Home, Building2, Navigation } from "lucide-react";
import { lookupCepAddress } from "@/lib/cepLookup";

interface AddressFormProps {
  userId: string;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const AddressForm = ({ userId }: AddressFormProps) => {
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [zipCode, setZipCode] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  /** Quando true, rua, bairro, cidade e estado foram preenchidos pelo CEP e ficam somente leitura */
  const [addressFilledFromCep, setAddressFilledFromCep] = useState(false);

  const loadAddress = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', userId)
        .eq('is_primary', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAddressId(data.id);
        setZipCode(data.zip_code);
        setStreet(data.street);
        setNumber(data.number);
        setComplement(data.complement || "");
        setNeighborhood(data.neighborhood);
        setCity(data.city);
        setState(data.state);
        setIsPrimary(data.is_primary);
        const zipLen = (data.zip_code || "").replace(/\D/g, "").length;
        const hasAddressFields = !!(data.street && data.neighborhood && data.city && data.state);
        setAddressFilledFromCep(zipLen === 8 && hasAddressFields);
        if (data.latitude && data.longitude) {
          setCoordinates({
            latitude: data.latitude,
            longitude: data.longitude,
          });
        }
      }
    } catch (error: unknown) {
      console.error("Error loading address:", error);
    }
  }, [userId]);

  useEffect(() => {
    loadAddress();
  }, [loadAddress]);

  const geocodeAddress = async (fullAddress: string): Promise<Coordinates | null> => {
    setGeocoding(true);
    try {
      const { data: autocompleteData, error: autocompleteError } = await supabase.functions.invoke(
        'google-places-autocomplete',
        { body: { query: fullAddress } }
      );

      if (autocompleteError) {
        console.error('Autocomplete error:', autocompleteError);
        return null;
      }

      if (!autocompleteData?.predictions?.length) {
        console.log('No predictions found for address:', fullAddress);
        return null;
      }

      const placeId = autocompleteData.predictions[0].place_id;
      
      const { data: detailsData, error: detailsError } = await supabase.functions.invoke(
        'google-places-details',
        { body: { placeId } }
      );

      if (detailsError) {
        console.error('Details error:', detailsError);
        return null;
      }

      if (detailsData?.structuredAddress?.latitude && detailsData?.structuredAddress?.longitude) {
        const coords: Coordinates = {
          latitude: detailsData.structuredAddress.latitude,
          longitude: detailsData.structuredAddress.longitude,
        };
        setCoordinates(coords);
        return coords;
      }

      return null;
    } catch (error) {
      console.error('Geocoding failed:', error);
      return null;
    } finally {
      setGeocoding(false);
    }
  };

  const handleZipCodeChange = async (value: string) => {
    const cleanedZipCode = value.replace(/\D/g, "");
    setZipCode(cleanedZipCode);
    
    if (cleanedZipCode.length < 8) {
      setCoordinates(null);
      setAddressFilledFromCep(false);
    }

    if (cleanedZipCode.length === 8) {
      setLoadingCep(true);
      try {
        const result = await lookupCepAddress(cleanedZipCode);
        if (!result.ok) {
          if (result.errorType === "not_found") {
            toast.error("CEP não encontrado");
          } else {
            toast.info("Não foi possível consultar o CEP agora. Você pode preencher o endereço manualmente.");
          }
          return;
        }

        setStreet(result.address.street);
        setNeighborhood(result.address.neighborhood);
        setCity(result.address.city);
        setState(result.address.state);
        setAddressFilledFromCep(true);

        const fullAddress = [
          result.address.street,
          result.address.neighborhood,
          result.address.city,
          result.address.state,
          "Brasil",
        ]
          .filter(Boolean)
          .join(", ");

        const coords = fullAddress ? await geocodeAddress(fullAddress) : null;
        
        if (coords) {
          toast.success("Endereço encontrado com localização mapeada!");
        } else {
          toast.success("Endereço encontrado!");
        }
      } catch (error) {
        toast.error("Erro ao buscar CEP");
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const formatZipCode = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 5) return cleaned;
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
  };

  const handleSave = async () => {
    try {
      const validated = addressSchema.parse({
        zipCode,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        isPrimary,
      });

      setLoading(true);

      // Se não temos coordenadas, tentar geocodificar (rua + número + bairro...) para salvar lat/lon
      // e que "Usar endereço cadastrado" traga serviços ordenados por proximidade
      let coordsToSave = coordinates;
      if (!coordsToSave?.latitude && !coordsToSave?.longitude && (street || neighborhood)) {
        const fullAddress = [street, number, neighborhood, city, state, "Brasil"].filter(Boolean).join(", ");
        const geocoded = fullAddress ? await geocodeAddress(fullAddress) : null;
        if (geocoded) {
          coordsToSave = geocoded;
          setCoordinates(geocoded);
        }
      }

      const addressData = {
        zip_code: validated.zipCode,
        street: validated.street,
        number: validated.number,
        complement: validated.complement || null,
        neighborhood: validated.neighborhood,
        city: validated.city,
        state: validated.state,
        is_primary: validated.isPrimary,
        latitude: coordsToSave?.latitude ?? null,
        longitude: coordsToSave?.longitude ?? null,
      };

      if (addressId) {
        const { error } = await supabase
          .from('user_addresses')
          .update(addressData)
          .eq('id', addressId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_addresses')
          .insert({
            user_id: userId,
            ...addressData,
          });

        if (error) throw error;
      }

      toast.success("Endereço salvo com sucesso!");
      loadAddress();
    } catch (error: unknown) {
      const err = error as { errors?: Array<{ message?: string }>; message?: string };
      if (err?.errors) {
        err.errors.forEach((e) => toast.error(e.message ?? 'Erro'));
      } else {
        toast.error(err?.message || "Erro ao salvar endereço");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Card: Localização */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Localização
          </CardTitle>
          <CardDescription>
            Digite o CEP para buscar automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              CEP <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Input
                type="text"
                placeholder="00000-000"
                value={formatZipCode(zipCode)}
                onChange={(e) => handleZipCodeChange(e.target.value)}
                className="h-11 pr-10"
                maxLength={9}
              />
              {(loadingCep || geocoding) && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
              )}
              {!loadingCep && !geocoding && zipCode.length === 8 && (
                <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
              )}
            </div>
          </div>
          
          {coordinates && (
            <div className="flex items-center gap-2 p-2.5 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                Localização mapeada com sucesso
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card: Endereço Completo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Home className="h-4 w-4 text-primary" />
            Endereço Completo
          </CardTitle>
          <CardDescription>
            Detalhes do seu endereço
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 flex items-center gap-2">
              <Home className="h-3.5 w-3.5" />
              Rua <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              placeholder="Nome da rua"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className="h-11"
              disabled={addressFilledFromCep}
              readOnly={addressFilledFromCep}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                Número <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                placeholder="123"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="h-11"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                Complemento
              </label>
              <Input
                type="text"
                placeholder="Apto 45"
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
                className="h-11"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1.5 flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5" />
              Bairro <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              placeholder="Nome do bairro"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className="h-11"
              disabled={addressFilledFromCep}
              readOnly={addressFilledFromCep}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 flex items-center gap-2">
                <Navigation className="h-3.5 w-3.5" />
                Cidade <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                placeholder="Nome da cidade"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-11"
                disabled={addressFilledFromCep}
                readOnly={addressFilledFromCep}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                Estado <span className="text-destructive">*</span>
              </label>
              <Select value={state} onValueChange={setState} disabled={addressFilledFromCep}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((uf) => (
                    <SelectItem key={uf} value={uf}>
                      {uf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center space-x-2 px-1">
        <Checkbox
          id="primary"
          checked={isPrimary}
          onCheckedChange={(checked) => setIsPrimary(checked as boolean)}
        />
        <label
          htmlFor="primary"
          className="text-sm text-muted-foreground cursor-pointer"
        >
          Definir como endereço principal
        </label>
      </div>

      <Button
        onClick={handleSave}
        disabled={loading || !zipCode || !street || !number || !neighborhood || !city || !state}
        className="w-full h-11"
      >
        {loading ? "Salvando..." : "Salvar Endereço"}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        * Campos obrigatórios
      </p>
    </div>
  );
};

export default AddressForm;
