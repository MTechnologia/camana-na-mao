import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AddressComponent {
  longText: string;
  shortText: string;
  types: string[];
}

interface PlaceDetailsResponse {
  id?: string;
  formattedAddress?: string;
  addressComponents?: AddressComponent[];
  location?: {
    latitude: number;
    longitude: number;
  };
  error?: {
    code: number;
    message: string;
    status: string;
  };
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
  return component?.longText || '';
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

    // Build URL for Places API (New) - GET request with place ID in path
    const url = `https://places.googleapis.com/v1/places/${placeId}`;
    
    console.log('Fetching Google Places Details (New API) for:', placeId);
    
    // Build headers with field mask for the data we need
    const headers: Record<string, string> = {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'id,formattedAddress,addressComponents,location',
    };

    // Add session token if provided
    if (sessionToken) {
      headers['X-Goog-Session-Token'] = sessionToken;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const data: PlaceDetailsResponse = await response.json();

    // Check for API errors
    if (data.error) {
      console.error('Google Places Details API error:', data.error.status, data.error.message);
      return new Response(
        JSON.stringify({ error: `Google API error: ${data.error.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const addressParts = parseAddressComponents(data.addressComponents || []);
    
    const structuredAddress: StructuredAddress = {
      street: addressParts.street || '',
      streetNumber: addressParts.streetNumber || '',
      neighborhood: addressParts.neighborhood || '',
      city: addressParts.city || '',
      state: addressParts.state || '',
      cep: (addressParts.cep || '').replace(/\D/g, ''),
      formattedAddress: data.formattedAddress || '',
      latitude: data.location?.latitude || 0,
      longitude: data.location?.longitude || 0,
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
