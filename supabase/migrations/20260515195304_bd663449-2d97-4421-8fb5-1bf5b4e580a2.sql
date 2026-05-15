UPDATE public.security_zones
SET polygon_geojson = NULL
WHERE polygon_geojson IS NOT NULL
  AND jsonb_array_length(polygon_geojson->'coordinates'->0) < 4;