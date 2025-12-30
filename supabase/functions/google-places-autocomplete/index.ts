import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    // Build Google Places Autocomplete URL
    const params = new URLSearchParams({
      input: query,
      key: apiKey,
      language: 'pt-BR',
      components: 'country:br',
      types: 'address',
      // Bias results to São Paulo
      locationbias: 'circle:50000@-23.5505,-46.6333',
    });

    // Add session token if provided (helps with billing optimization)
    if (sessionToken) {
      params.append('sessiontoken', sessionToken);
    }

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`;
    
    console.log('Fetching Google Places Autocomplete:', query);
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.status, data.error_message);
      return new Response(
        JSON.stringify({ error: `Google API error: ${data.status}`, predictions: [] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform predictions to a simpler format
    const predictions = (data.predictions || []).map((p: any) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text || p.description,
      secondaryText: p.structured_formatting?.secondary_text || '',
    }));

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
