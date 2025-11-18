import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Ban, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { Progress } from "@/components/ui/progress";

const formSchema = z.object({
  guest_name: z.string().min(1, "A név megadása kötelező").max(100, "A név maximum 100 karakter lehet"),
  guest_address: z.string().min(1, "A cím megadása kötelező").max(200, "A cím maximum 200 karakter lehet"),
  guest_license_number: z.string().min(1, "A vadászjegyszám megadása kötelező").max(50, "A vadászjegyszám maximum 50 karakter lehet"),
  guest_phone: z.string().min(1, "A telefonszám megadása kötelező").max(20, "A telefonszám maximum 20 karakter lehet"),
  guest_email: z.string().email("Érvényes email címet adjon meg").max(100, "Az email cím maximum 100 karakter lehet"),
  security_zone_id: z.string().min(1, "A biztonsági körzet kiválasztása kötelező"),
  hunting_location_id: z.string().optional(),
  start_time: z.date({ required_error: "A kezdési időpont megadása kötelező" }),
  end_time: z.date({ required_error: "A befejezési időpont megadása kötelező" }),
});

type FormData = z.infer<typeof formSchema>;

export default function GuestRegistration() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qrCode = searchParams.get('qr');
  const [qrValidated, setQrValidated] = useState(false);
  const [validatingQR, setValidatingQR] = useState(!!qrCode);
  const [securityZones, setSecurityZones] = useState<any[]>([]);
  const [huntingLocations, setHuntingLocations] = useState<any[]>([]);
  const [closures, setClosures] = useState<any[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [huntingChance, setHuntingChance] = useState<number | null>(null);
  const [loadingChance, setLoadingChance] = useState(false);
  const { limits, loading: subscriptionLoading } = useSubscription();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const selectedZoneId = form.watch("security_zone_id");

  useEffect(() => {
    if (qrCode) {
      validateQRCode();
    }
    fetchSecurityZones();
    fetchClosures();
  }, [qrCode]);

  useEffect(() => {
    if (selectedZoneId) {
      fetchHuntingLocations(selectedZoneId);
    }
  }, [selectedZoneId]);

  const validateQRCode = async () => {
    if (!qrCode) return;

    try {
      setValidatingQR(true);
      
      const { data, error } = await supabase
        .from("qr_codes")
        .select("*")
        .eq("code", qrCode)
        .eq("type", "guest_registration")
        .eq("is_active", true)
        .single();

      if (error || !data) {
        toast.error("Érvénytelen QR kód vagy a QR kód le van tiltva");
        setTimeout(() => navigate("/"), 3000);
        return;
      }

      // Check if expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast.error("Ez a QR kód lejárt");
        setTimeout(() => navigate("/"), 3000);
        return;
      }

      setQrValidated(true);
      toast.success("QR kód érvényesítve! Töltse ki az űrlapot a beiratkozáshoz.");
    } catch (error: any) {
      console.error("Error validating QR code:", error);
      toast.error("Nem sikerült ellenőrizni a QR kódot");
    } finally {
      setValidatingQR(false);
    }
  };

  const fetchSecurityZones = async () => {
    const { data, error } = await supabase
      .from("security_zones")
      .select("*, settlements(name)")
      .order("display_order");

    if (error) {
      toast.error("Hiba a körzetek betöltésekor");
      return;
    }
    setSecurityZones(data || []);
  };

  const fetchHuntingLocations = async (zoneId: string) => {
    const { data, error } = await supabase
      .from("hunting_locations")
      .select("*")
      .eq("security_zone_id", zoneId)
      .order("display_order");

    if (error) {
      toast.error("Hiba a helyszínek betöltésekor");
      return;
    }
    setHuntingLocations(data || []);
  };

  const fetchClosures = async () => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("security_zone_closures")
      .select("*, security_zones(name, settlements(name))")
      .lte("start_date", now)
      .gte("end_date", now);

    if (error) {
      console.error("Error fetching closures:", error);
      return;
    }
    setClosures(data || []);
  };

  const isZoneClosed = (zoneId: string) => {
    return closures.some((closure) => closure.security_zone_id === zoneId);
  };

  const fetchWeather = async (settlementName: string) => {
    if (!settlementName) return;
    
    setLoadingWeather(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-weather', {
        body: { settlementName }
      });

      if (error) throw error;
      setWeatherData(data);
    } catch (error) {
      console.error('Error fetching weather:', error);
      toast.error("Nem sikerült lekérdezni az időjárást");
    } finally {
      setLoadingWeather(false);
    }
  };

  const fetchHuntingChance = async (zoneId: string) => {
    setLoadingChance(true);
    try {
      // Get registrations in the last 90 days for this zone
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: registrations, error: regError } = await supabase
        .from("hunting_registrations")
        .select("id")
        .eq("security_zone_id", zoneId)
        .gte("start_time", ninetyDaysAgo.toISOString());

      if (regError) throw regError;

      const registrationCount = registrations?.length || 0;

      // Get animals shot in the last 90 days for this zone
      const { data: animals, error: animalsError } = await supabase
        .from("animals")
        .select("id, hunting_registrations!inner(security_zone_id, start_time)")
        .eq("hunting_registrations.security_zone_id", zoneId)
        .gte("hunting_registrations.start_time", ninetyDaysAgo.toISOString());

      if (animalsError) throw animalsError;

      const shotCount = animals?.length || 0;

      // Calculate hunting chance percentage
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

  const handleZoneChange = async (value: string) => {
    form.setValue("security_zone_id", value);
    
    const selectedZoneData = securityZones.find(z => z.id === value);
    if (selectedZoneData?.settlements?.name) {
      await fetchWeather(selectedZoneData.settlements.name);
    }
    await fetchHuntingChance(value);
  };

  const onSubmit = async (values: FormData) => {
    try {
      const { error } = await supabase.from("hunting_registrations").insert({
        is_guest: true,
        guest_name: values.guest_name,
        guest_address: values.guest_address,
        guest_license_number: values.guest_license_number,
        guest_phone: values.guest_phone,
        guest_email: values.guest_email,
        security_zone_id: values.security_zone_id,
        hunting_location_id: values.hunting_location_id || null,
        start_time: values.start_time.toISOString(),
        end_time: values.end_time.toISOString(),
        requires_admin_approval: true,
        status: "pending",
        user_id: "00000000-0000-0000-0000-000000000000", // Placeholder for guest
        weather_data: weatherData,
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Beiratkozás sikeresen elküldve jóváhagyásra");
    } catch (error: any) {
      console.error("Error submitting registration:", error);
      toast.error(error.message || "Hiba történt a beiratkozás során");
    }
  };

  if (subscriptionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Betöltés...</p>
      </div>
    );
  }

  if (!limits.canUseElectronicRegistration) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-forest-deep to-earth-warm flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <CardTitle className="text-3xl text-center text-forest-deep">Nincs hozzáférés</CardTitle>
            <CardDescription className="text-center text-lg">
              Az elektronikus beiratkozási rendszer csak Pro előfizetéssel érhető el.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Pro funkció</AlertTitle>
              <AlertDescription>
                Az elektronikus beiratkozási rendszer és vendég vadászok kezelése csak Pro előfizetéssel érhető el. 
                Váltson Pro előfizetésre ezen funkciók használatához!
              </AlertDescription>
            </Alert>
            <div className="mt-6 flex justify-center">
              <Button onClick={() => navigate("/subscriptions")}>
                Előfizetések megtekintése
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
            <CardTitle>Beiratkozás elküldve</CardTitle>
            <CardDescription>
              Köszönjük a beiratkozást! A vadászati beiratkozás adminisztrátori jóváhagyásra vár.
              E-mailben értesítjük a döntésről.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Vissza a főoldalra
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto max-w-2xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>Vendég vadászati beiratkozás</CardTitle>
            <CardDescription>
              Töltse ki az alábbi űrlapot a vadászati beiratkozáshoz. A beiratkozás adminisztrátori jóváhagyást igényel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {closures.length > 0 && (
              <Alert className="mb-6 border-orange-500/50 bg-orange-500/10">
                <Ban className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <AlertTitle className="text-orange-700 dark:text-orange-300">
                  Lezárt körzetek
                </AlertTitle>
                <AlertDescription className="text-orange-600 dark:text-orange-400">
                  <div className="mt-2 space-y-2">
                    {closures.map((closure) => (
                      <div key={closure.id} className="text-sm">
                        <span className="font-medium">
                          {closure.security_zones.settlements?.name
                            ? `${closure.security_zones.settlements.name} - ${closure.security_zones.name}`
                            : closure.security_zones.name}
                        </span>
                        <span className="mx-2">•</span>
                        <span>
                          {format(new Date(closure.start_date), "yyyy. MM. dd.", { locale: hu })}
                          {" - "}
                          {format(new Date(closure.end_date), "yyyy. MM. dd.", { locale: hu })}
                        </span>
                        <div className="mt-1 italic">{closure.reason}</div>
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="guest_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teljes név *</FormLabel>
                      <FormControl>
                        <Input placeholder="Kovács János" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="guest_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cím *</FormLabel>
                      <FormControl>
                        <Input placeholder="1234 Budapest, Példa utca 12." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="guest_license_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vadászjegyszám *</FormLabel>
                      <FormControl>
                        <Input placeholder="VJ-123456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="guest_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefonszám *</FormLabel>
                      <FormControl>
                        <Input placeholder="+36 20 123 4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="guest_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email cím *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="pelda@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="security_zone_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Biztonsági körzet *</FormLabel>
                      <Select onValueChange={handleZoneChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Válasszon körzetet" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {securityZones.map((zone) => {
                            const closed = isZoneClosed(zone.id);
                            return (
                              <SelectItem key={zone.id} value={zone.id} disabled={closed}>
                                {zone.settlements?.name
                                  ? `${zone.settlements.name} - ${zone.name}`
                                  : zone.name}
                                {closed && " (Lezárva)"}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {loadingWeather && (
                  <div className="text-sm text-muted-foreground">
                    Időjárás betöltése...
                  </div>
                )}

                {weatherData && !loadingWeather && (
                  <Card className="bg-accent/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Aktuális időjárás - {weatherData.settlement}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Hőmérséklet:</span>
                        <span className="font-medium">{weatherData.current.temperature}°C</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Páratartalom:</span>
                        <span className="font-medium">{weatherData.current.humidity}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Csapadék valószínűség:</span>
                        <span className="font-medium">{weatherData.current.precipitation_probability}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Szélsebesség:</span>
                        <span className="font-medium">{weatherData.current.wind_speed} km/h</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {loadingChance && selectedZoneId && (
                  <div className="text-sm text-muted-foreground">
                    Elejtési esély számítása...
                  </div>
                )}

                {huntingChance !== null && !loadingChance && selectedZoneId && (
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
                )}

                {huntingLocations.length > 0 && (
                  <FormField
                    control={form.control}
                    name="hunting_location_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pontos helyszín (opcionális)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Válasszon helyszínt" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {huntingLocations.map((location) => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.name} ({location.type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Kezdési időpont *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "yyyy. MM. dd. HH:mm", { locale: hu })
                              ) : (
                                <span>Válasszon időpontot</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            locale={hu}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Befejezési időpont *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "yyyy. MM. dd. HH:mm", { locale: hu })
                              ) : (
                                <span>Válasszon időpontot</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            locale={hu}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full">
                  Beiratkozás küldése
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
