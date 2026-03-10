import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, Search, Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PublicService {
  id: string;
  name: string;
  service_type: string;
  district: string;
  address: string;
}

interface InlineServicePickerProps {
  serviceType?: string;
  /** Quando informado com serviceType, pre-carrega lista de serviços do bairro (dropdown) */
  district?: string;
  onSelect: (name: string, neighborhood: string, address: string, serviceId?: string) => void;
}

export const InlineServicePicker = ({ serviceType, district, onSelect }: InlineServicePickerProps) => {
  const [query, setQuery] = useState("");
  const [services, setServices] = useState<PublicService[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState(false);

  const searchServices = useCallback(async (searchQuery: string) => {
    const effectiveQuery = (searchQuery?.trim() || (district && serviceType ? district : ''));
    if (!effectiveQuery || effectiveQuery.length < 2) {
      setServices([]);
      return;
    }

    setIsLoading(true);
    try {
      let dbQuery = supabase
        .from('public_services')
        .select('id, name, service_type, district, address')
        .or(`name.ilike.%${effectiveQuery}%,district.ilike.%${effectiveQuery}%`)
        .limit(12);
      
      if (serviceType) {
        dbQuery = dbQuery.eq('service_type', serviceType);
      }

      const { data, error } = await dbQuery;

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error searching services:', error);
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  }, [serviceType, district]);

  useEffect(() => {
    if (district && serviceType) {
      searchServices(district);
    }
  }, [district, serviceType]); // eslint-disable-line react-hooks/exhaustive-deps -- inicial

  useEffect(() => {
    if (district && serviceType) return;
    const debounce = setTimeout(() => {
      searchServices(query);
    }, 300);
    return () => clearTimeout(debounce);
  }, [query, searchServices, district, serviceType]);

  const handleSelect = (service: PublicService) => {
    setSelected(true);
    onSelect(service.name, service.district, service.address, service.id);
  };

  const handleCustomService = () => {
    if (query.trim()) {
      setSelected(true);
      onSelect(query, '', '', undefined);
    }
  };

  if (selected) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
        <Building2 className="h-3 w-3" />
        <span>Serviço selecionado ✓</span>
      </div>
    );
  }

  return (
    <div className="mt-2 w-full max-w-xs">
      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
        <Building2 className="h-3 w-3 flex-shrink-0" />
        <span>Qual o nome do serviço?</span>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Digite o nome ou bairro..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-8"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {((district && serviceType) || query.length >= 2) && (
        <div className="mt-2 rounded-md border bg-popover">
          {services.length > 0 ? (
            <ScrollArea className="max-h-[200px]">
              <div className="p-1">
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => handleSelect(service)}
                    className="w-full text-left px-3 py-2 rounded-sm hover:bg-accent text-sm"
                  >
                    <div className="font-medium">{service.name}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{service.district}</span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          ) : !isLoading ? (
            <div className="p-3">
              <p className="text-sm text-muted-foreground mb-2">Serviço não encontrado</p>
              {(query || district) && (
                <button
                  onClick={() => {
                    const text = query.trim() || district || '';
                    if (text) {
                      setSelected(true);
                      onSelect(text, district || '', '', undefined);
                    }
                  }}
                  className="w-full text-left px-3 py-2 rounded-sm hover:bg-accent text-sm border"
                >
                  Usar &quot;{query || district}&quot;
                </button>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default InlineServicePicker;
