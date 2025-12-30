import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface StructuredAddress {
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

function extractAddressComponent(
  components: AddressComponent[],
  type: string
): string {
  const component = components.find(c => c.types.includes(type));
  return component?.long_name || '';
}

function parseAddressComponents(components: AddressComponent[]): Partial<StructuredAddress> {
  return {
    streetNumber: extractAddressComponent(components, 'street_number'),
    street: extractAddressComponent(components, 'route'),
    neighborhood: 
      extractAddressComponent(components, 'sublocality_level_1') ||
      extractAddressComponent(components, 'sublocality') ||
      extractAddressComponent(components, 'neighborhood'),
    city: 
      extractAddressComponent(components, 'administrative_area_level_2') ||
      extractAddressComponent(components, 'locality'),
    state: extractAddressComponent(components, 'administrative_area_level_1'),
    cep: extractAddressComponent(components, 'postal_code'),
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { placeId, sessionToken } = await req.json();
    
    if (!placeId) {
      return new Response(
        JSON.stringify({ error: 'placeId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      console.error('GOOGLE_PLACES_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Google Places API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build Google Places Details URL
    const params = new URLSearchParams({
      place_id: placeId,
      key: apiKey,
      language: 'pt-BR',
      fields: 'address_component,formatted_address,geometry',
    });

    // Add session token if provided
    if (sessionToken) {
      params.append('sessiontoken', sessionToken);
    }

    const url = `https://maps.googleapis.com/maps/api/place/details/json?${params}`;
    
    console.log('Fetching Google Places Details for:', placeId);
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Places Details API error:', data.status, data.error_message);
      return new Response(
        JSON.stringify({ error: `Google API error: ${data.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = data.result;
    const addressParts = parseAddressComponents(result.address_components || []);
    
    const structuredAddress: StructuredAddress = {
      street: addressParts.street || '',
      streetNumber: addressParts.streetNumber || '',
      neighborhood: addressParts.neighborhood || '',
      city: addressParts.city || '',
      state: addressParts.state || '',
      cep: (addressParts.cep || '').replace(/\D/g, ''),
      formattedAddress: result.formatted_address || '',
      latitude: result.geometry?.location?.lat || 0,
      longitude: result.geometry?.location?.lng || 0,
    };

    console.log('Structured address:', structuredAddress);

    return new Response(
      JSON.stringify({ address: structuredAddress }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in google-places-details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
