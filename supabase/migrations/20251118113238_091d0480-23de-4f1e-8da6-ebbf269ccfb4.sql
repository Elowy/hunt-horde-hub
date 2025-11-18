-- Add weather data to hunting registrations
ALTER TABLE public.hunting_registrations
ADD COLUMN weather_data JSONB;

COMMENT ON COLUMN public.hunting_registrations.weather_data IS 'Stores 24-hour weather data from registration time, deleted on archival';