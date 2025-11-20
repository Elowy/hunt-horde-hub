import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { settlementName } = await req.json();

    if (!settlementName) {
      return new Response(
        JSON.stringify({ error: 'Settlement name is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get coordinates from settlement name using OpenStreetMap Nominatim
    const geocodeResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(settlementName)},Hungary&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'VadgondokApp/1.0'
        }
      }
    );

    const geocodeData = await geocodeResponse.json();

    if (!geocodeData || geocodeData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Settlement not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { lat, lon } = geocodeData[0];

    // Get weather data from Open-Meteo (free, no API key required)
    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m&timezone=Europe/Budapest&forecast_days=2`
    );

    const weatherData = await weatherResponse.json();

    if (!weatherData.hourly) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch weather data' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Process weather data for current hour
    const currentHour = new Date().getHours();
    const weather = {
      timestamp: new Date().toISOString(),
      settlement: settlementName,
      coordinates: { lat, lon },
      current: {
        temperature: weatherData.hourly.temperature_2m[currentHour],
        humidity: weatherData.hourly.relative_humidity_2m[currentHour],
        precipitation_probability: weatherData.hourly.precipitation_probability[currentHour],
        weather_code: weatherData.hourly.weather_code[currentHour],
        wind_speed: weatherData.hourly.wind_speed_10m[currentHour],
        wind_direction: weatherData.hourly.wind_direction_10m[currentHour],
      },
      hourly: {
        time: weatherData.hourly.time,
        temperature: weatherData.hourly.temperature_2m,
        humidity: weatherData.hourly.relative_humidity_2m,
        precipitation_probability: weatherData.hourly.precipitation_probability,
        weather_code: weatherData.hourly.weather_code,
        wind_speed: weatherData.hourly.wind_speed_10m,
        wind_direction: weatherData.hourly.wind_direction_10m,
      }
    };

    return new Response(
      JSON.stringify(weather),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error fetching weather:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
