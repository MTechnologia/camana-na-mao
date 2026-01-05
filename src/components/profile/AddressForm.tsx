import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addressSchema } from "@/lib/validations";
import { MapPin, Loader2, CheckCircle2 } from "lucide-react";

interface AddressFormProps {
  userId: string;
}

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
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

  useEffect(() => {
    loadAddress();
  }, [userId]);

  const loadAddress = async () => {
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
        
        // Carregar coordenadas existentes
        if (data.latitude && data.longitude) {
          setCoordinates({
            latitude: data.latitude,
            longitude: data.longitude,
          });
        }
      }
    } catch (error: any) {
      console.error("Error loading address:", error);
    }
  };

  const geocodeAddress = async (fullAddress: string): Promise<Coordinates | null> => {
    setGeocoding(true);
    try {
      // Primeiro, buscar sugestões de autocomplete
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

      // Buscar detalhes do primeiro resultado para obter coordenadas
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
    // Remove caracteres não numéricos
    const cleanedZipCode = value.replace(/\D/g, "");
    setZipCode(cleanedZipCode);
    
    // Limpar coordenadas quando CEP mudar
    if (cleanedZipCode.length < 8) {
      setCoordinates(null);
    }

    if (cleanedZipCode.length === 8) {
      setLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanedZipCode}/json/`);
        const data: ViaCepResponse = await response.json();

        if (data.erro) {
          toast.error("CEP não encontrado");
          return;
        }

        setStreet(data.logradouro);
        setNeighborhood(data.bairro);
        setCity(data.localidade);
        setState(data.uf);
        
        // Geocodificar o endereço para obter coordenadas
        const fullAddress = `${data.logradouro}, ${data.bairro}, ${data.localidade}, ${data.uf}, Brasil`;
        const coords = await geocodeAddress(fullAddress);
        
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
      // Validar dados
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

      const addressData = {
        zip_code: validated.zipCode,
        street: validated.street,
        number: validated.number,
        complement: validated.complement || null,
        neighborhood: validated.neighborhood,
        city: validated.city,
        state: validated.state,
        is_primary: validated.isPrimary,
        latitude: coordinates?.latitude || null,
        longitude: coordinates?.longitude || null,
      };

      if (addressId) {
        // Update
        const { error } = await supabase
          .from('user_addresses')
          .update(addressData)
          .eq('id', addressId);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('user_addresses')
          .insert({
            user_id: userId,
            ...addressData,
          });

        if (error) throw error;
      }

      toast.success("Endereço salvo com sucesso!");
      loadAddress(); // Recarregar para pegar o ID
    } catch (error: any) {
      if (error.errors) {
        error.errors.forEach((err: any) => {
          toast.error(err.message);
        });
      } else {
        toast.error(error.message || "Erro ao salvar endereço");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-muted-foreground mb-2 block">
          CEP <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <Input
            type="text"
            placeholder="00000-000"
            value={formatZipCode(zipCode)}
            onChange={(e) => handleZipCodeChange(e.target.value)}
            className="h-12 pr-10"
            maxLength={9}
          />
          {(loadingCep || geocoding) && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
          )}
          {!loadingCep && !geocoding && zipCode.length === 8 && (
            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Digite o CEP para buscar automaticamente
        </p>
        
        {/* Indicador de geolocalização */}
        {coordinates && (
          <div className="flex items-center gap-1.5 text-xs text-green-600 mt-2">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Localização mapeada ✓</span>
          </div>
        )}
      </div>

      <div>
        <label className="text-sm text-muted-foreground mb-2 block">
          Rua <span className="text-destructive">*</span>
        </label>
        <Input
          type="text"
          placeholder="Nome da rua"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          className="h-12"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">
            Número <span className="text-destructive">*</span>
          </label>
          <Input
            type="text"
            placeholder="123"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="h-12"
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-2 block">
            Complemento
          </label>
          <Input
            type="text"
            placeholder="Apto 45"
            value={complement}
            onChange={(e) => setComplement(e.target.value)}
            className="h-12"
          />
        </div>
      </div>

      <div>
        <label className="text-sm text-muted-foreground mb-2 block">
          Bairro <span className="text-destructive">*</span>
        </label>
        <Input
          type="text"
          placeholder="Nome do bairro"
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
          className="h-12"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">
            Cidade <span className="text-destructive">*</span>
          </label>
          <Input
            type="text"
            placeholder="Nome da cidade"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="h-12"
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-2 block">
            Estado <span className="text-destructive">*</span>
          </label>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger className="h-12">
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

      <div className="flex items-center space-x-2 pt-2">
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
        className="w-full h-12 bg-foreground text-background hover:bg-foreground/90"
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
