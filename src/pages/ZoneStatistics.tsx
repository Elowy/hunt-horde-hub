import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Cloud, CloudRain, Sun, Wind, Droplets, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface SecurityZone {
  id: string;
  name: string;
  settlements?: {
    name: string;
  };
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [securityZones, setSecurityZones] = useState<SecurityZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");
  const [huntingChance, setHuntingChance] = useState<number | null>(null);
  const [loadingChance, setLoadingChance] = useState(false);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }

      await fetchSecurityZones();
    } catch (error) {
      console.error("Auth check error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const fetchSecurityZones = async () => {
    try {
      const { data, error } = await supabase
        .from("security_zones")
        .select(`
          id,
          name,
          settlements (
            name
          )
        `)
        .order("name");

      if (error) throw error;
      setSecurityZones(data || []);
    } catch (error) {
      console.error("Error fetching security zones:", error);
      toast.error("Nem sikerült betölteni a területeket");
    }
  };

  const fetchHuntingChance = async (zoneId: string) => {
    setLoadingChance(true);
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: registrations, error: regError } = await supabase
        .from("hunting_registrations")
        .select("id")
        .eq("security_zone_id", zoneId)
        .gte("start_time", ninetyDaysAgo.toISOString());

      if (regError) throw regError;

      const registrationCount = registrations?.length || 0;

      const { data: animals, error: animalsError } = await supabase
        .from("animals")
        .select("id, hunting_registrations!inner(security_zone_id, start_time)")
        .eq("hunting_registrations.security_zone_id", zoneId)
        .gte("hunting_registrations.start_time", ninetyDaysAgo.toISOString());

      if (animalsError) throw animalsError;

      const shotCount = animals?.length || 0;

      if (registrationCount === 0) {
        setHuntingChance(0);
      } else {
        const chance = (shotCount / registrationCount) * 100;
        setHuntingChance(Math.min(100, Math.round(chance)));
      }
    } catch (error) {
      console.error("Error fetching hunting chance:", error);
      toast.error("Nem sikerült betölteni az elejtési esély adatokat");
      setHuntingChance(null);
    } finally {
      setLoadingChance(false);
    }
  };

  const fetchWeather = async (settlementName: string) => {
    setLoadingWeather(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-weather", {
        body: { settlementName },
      });

      if (error) throw error;

      setWeatherData(data);
    } catch (error) {
      console.error("Error fetching weather:", error);
      toast.error("Nem sikerült betölteni az időjárás adatokat");
      setWeatherData(null);
    } finally {
      setLoadingWeather(false);
    }
  };

  const handleZoneChange = async (value: string) => {
    setSelectedZoneId(value);
    
    const selectedZone = securityZones.find(z => z.id === value);
    if (selectedZone?.settlements?.name) {
      await fetchWeather(selectedZone.settlements.name);
    }
    await fetchHuntingChance(value);
  };

  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="h-5 w-5" />;
    if (code >= 51 && code <= 67) return <CloudRain className="h-5 w-5" />;
    if (code >= 80 && code <= 99) return <CloudRain className="h-5 w-5" />;
    return <Cloud className="h-5 w-5" />;
  };

  const getWeatherDescription = (code: number) => {
    if (code === 0) return "Tiszta";
    if (code >= 1 && code <= 3) return "Részben felhős";
    if (code >= 45 && code <= 48) return "Ködös";
    if (code >= 51 && code <= 67) return "Esős";
    if (code >= 71 && code <= 77) return "Havas";
    if (code >= 80 && code <= 99) return "Zivataros";
    return "Változó";
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Betöltés...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader onLogout={handleLogout} />

      <main className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Terület statisztikák</h1>
          <p className="text-muted-foreground">
            Válassz egy területet az időjárási és elejtési esély adatok megtekintéséhez
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Terület kiválasztása</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedZoneId} onValueChange={handleZoneChange}>
              <SelectTrigger>
                <SelectValue placeholder="Válassz területet..." />
              </SelectTrigger>
              <SelectContent>
                {securityZones.map((zone) => (
                  <SelectItem key={zone.id} value={zone.id}>
                    {zone.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedZoneId && (
          <div className="grid gap-6 md:grid-cols-2">
            {loadingChance ? (
              <div className="text-sm text-muted-foreground">
                Elejtési esély számítása...
              </div>
            ) : huntingChance !== null ? (
              <Card className="bg-accent/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Elejtési esély
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Esély</span>
                      <span className="text-xl font-bold">{huntingChance}%</span>
                    </div>
                    <Progress value={huntingChance} className="h-2" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Az elmúlt 90 nap adatai alapján a területen
                  </p>
                </CardContent>
              </Card>
            ) : null}

            {loadingWeather ? (
              <div className="text-sm text-muted-foreground">
                Időjárás betöltése...
              </div>
            ) : weatherData ? (
              <Card className="bg-accent/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {getWeatherIcon(weatherData.current.weather_code)}
                    Időjárás
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Hőmérséklet</p>
                      <p className="text-2xl font-bold">{weatherData.current.temperature}°C</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Időjárás</p>
                      <p className="text-sm font-medium">
                        {getWeatherDescription(weatherData.current.weather_code)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Páratartalom</p>
                        <p className="text-sm font-medium">{weatherData.current.humidity}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wind className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Szél</p>
                        <p className="text-sm font-medium">{weatherData.current.wind_speed} km/h</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CloudRain className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Csapadék</p>
                        <p className="text-sm font-medium">{weatherData.current.precipitation_probability}%</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground pt-2 border-t">
                    {weatherData.settlement}
                  </p>
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}

        {!selectedZoneId && (
          <Card className="bg-muted/50">
            <CardContent className="flex items-center gap-3 pt-6">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Válassz egy területet az adatok megtekintéséhez
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
