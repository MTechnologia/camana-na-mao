import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface PlacePrediction {
  place: string;
  placeId: string;
  text: { text: string };
  structuredFormat?: {
    mainText: { text: string };
    secondaryText?: { text: string };
  };
}

interface AutocompleteResponse {
  suggestions?: Array<{
    placePrediction: PlacePrediction;
  }>;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { query, sessionToken } = await req.json();
    
    if (!query || query.length < 3) {
      return new Response(
        JSON.stringify({ predictions: [], error: 'Query must be at least 3 characters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Build request body for Places API (New)
    const requestBody: Record<string, unknown> = {
      input: query,
      languageCode: 'pt-BR',
      includedRegionCodes: ['BR'],
      includedPrimaryTypes: ['street_address', 'route', 'premise', 'subpremise'],
      locationBias: {
        circle: {
          center: { latitude: -23.5505, longitude: -46.6333 }, // São Paulo center
          radius: 50000.0 // 50km radius
        }
      }
    };

    // Add session token if provided (helps with billing optimization)
    if (sessionToken) {
      requestBody.sessionToken = sessionToken;
    }

    const url = 'https://places.googleapis.com/v1/places:autocomplete';
    
    console.log('Fetching Google Places Autocomplete (New API):', query);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    const data: AutocompleteResponse = await response.json();

    // Check for API errors
    if (data.error) {
      console.error('Google Places API error:', data.error.status, data.error.message);
      return new Response(
        JSON.stringify({ error: `Google API error: ${data.error.status}`, predictions: [] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform suggestions to match the expected format (retrocompatible)
    const predictions = (data.suggestions || []).map((suggestion) => {
      const pred = suggestion.placePrediction;
      return {
        placeId: pred.placeId,
        description: pred.text?.text || '',
        mainText: pred.structuredFormat?.mainText?.text || pred.text?.text || '',
        secondaryText: pred.structuredFormat?.secondaryText?.text || '',
      };
    });

    console.log(`Found ${predictions.length} predictions for "${query}"`);

    return new Response(
      JSON.stringify({ predictions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in google-places-autocomplete:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, predictions: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
