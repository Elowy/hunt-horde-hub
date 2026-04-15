import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Calendar, Clock, MapPin, CheckCircle, XCircle, AlertCircle, Crown, Package, ChevronDown, Trash2, Ban, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/PageHeader";
import { useNotifications } from "@/hooks/useNotifications";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { AssignAnimalToRegistrationDialog } from "@/components/AssignAnimalToRegistrationDialog";

interface SecurityZone {
  id: string;
  name: string;
  description: string | null;
  settlements: {
    name: string;
  } | null;
}

interface HuntingLocation {
  id: string;
  name: string;
  type: string;
  security_zones?: {
    name: string;
    settlements?: {
      name: string;
    } | null;
  } | null;
}

interface ZoneClosure {
  id: string;
  security_zone_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  security_zones: {
    name: string;
    settlements: {
      name: string;
    } | null;
  };
}

interface HunterUser {
  id: string;
  profiles: {
    contact_name: string | null;
    hunter_license_number: string | null;
  };
}

interface HiredHunter {
  id: string;
  name: string;
  license_number: string | null;
}

interface Animal {
  id: string;
  animal_id: string;
  species: string;
  weight: number | null;
}

interface WeatherData {
  timestamp: string;
  settlement: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  current: {
    temperature: number;
    humidity: number;
    precipitation_probability: number;
    weather_code: number;
    wind_speed: number;
    wind_direction: number;
  };
  hourly: {
    time: string[];
    temperature: number[];
    humidity: number[];
    precipitation_probability: number[];
    weather_code: number[];
    wind_speed: number[];
    wind_direction: number[];
  };
}

interface HuntingRegistration {
  id: string;
  user_id: string;
  hired_hunter_id: string | null;
  security_zone_id: string;
  hunting_location_id: string | null;
  start_time: string;
  end_time: string;
  status: string;
  requires_admin_approval: boolean;
  admin_note: string | null;
  created_at: string;
  is_guest: boolean | null;
  guest_name: string | null;
  guest_address: string | null;
  guest_license_number: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  weather_data: any | null;
  security_zones: {
    name: string;
    settlements: {
      name: string;
    } | null;
  };
  hunting_locations: {
    name: string;
    type: string;
  } | null;
  profiles: {
    contact_name: string | null;
    contact_phone: string | null;
    hunter_license_number: string | null;
  };
  hired_hunters: {
    name: string;
    license_number: string | null;
  } | null;
  animals?: Animal[];
}

const HuntingRegistrations = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { sendNotification } = useNotifications();
  const { isPro, loading: subscriptionLoading } = useSubscription();
  const [societyIsPro, setSocietyIsPro] = useState(false);
  const [registrations, setRegistrations] = useState<HuntingRegistration[]>([]);
  const [zones, setZones] = useState<SecurityZone[]>([]);
  const [locations, setLocations] = useState<HuntingLocation[]>([]);
  const [closures, setClosures] = useState<ZoneClosure[]>([]);
  const [hunters, setHunters] = useState<HunterUser[]>([]);
  const [hiredHunters, setHiredHunters] = useState<HiredHunter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHunter, setIsHunter] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [huntingChance, setHuntingChance] = useState<number | null>(null);
  const [loadingChance, setLoadingChance] = useState(false);
  
  // Archive filters
  const [archiveFilterZone, setArchiveFilterZone] = useState<string>("");
  const [archiveFilterHunter, setArchiveFilterHunter] = useState<string>("");
  const [archiveFilterStartDate, setArchiveFilterStartDate] = useState<string>("");
  const [archiveFilterEndDate, setArchiveFilterEndDate] = useState<string>("");
  const [archiveFilterAnimalId, setArchiveFilterAnimalId] = useState<string>("");
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const getDefaultFormData = () => {
    const now = new Date();
    const endTime = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours later
    
    return {
      security_zone_id: "",
      hunting_location_id: "",
      start_date: format(now, "yyyy-MM-dd"),
      start_time: format(now, "HH:mm"),
      end_date: format(endTime, "yyyy-MM-dd"),
      end_time: format(endTime, "HH:mm"),
      selected_user_id: "",
    };
  };
  
  const [formData, setFormData] = useState(getDefaultFormData());

  useEffect(() => {
    checkUserRole();
    fetchZones();
    fetchClosures();
    fetchHunters();
    fetchHiredHunters();
    fetchRegistrations();
  }, []);

  useEffect(() => {
    if (formData.security_zone_id) {
      const selectedZone = zones.find(z => z.id === formData.security_zone_id);
      if (selectedZone?.settlements?.name) {
        fetchWeather(selectedZone.settlements.name);
      }
      fetchHuntingChance(formData.security_zone_id);
    } else {
      setWeatherData(null);
      setHuntingChance(null);
    }
  }, [formData.security_zone_id, zones]);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      setCurrentUserId(user.id);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const roleList = roles?.map(r => r.role) || [];
      setIsHunter(roleList.includes("hunter") || roleList.includes("admin"));
      setIsAdmin(roleList.includes("admin"));
      setIsEditor(roleList.includes("editor"));
      setIsSuperAdmin(roleList.includes("super_admin"));

      // Check society subscription for hunters
      if (roleList.includes("hunter") && !roleList.includes("admin") && !roleList.includes("editor")) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("hunter_society_id")
          .eq("id", user.id)
          .single();

        if (profile?.hunter_society_id) {
          // Trial check
          const { data: trialData } = await supabase
            .from("trial_subscriptions")
            .select("expires_at")
            .eq("user_id", profile.hunter_society_id)
            .maybeSingle();

          if (trialData && new Date(trialData.expires_at) > new Date()) {
            setSocietyIsPro(true);
          } else {
            // Lifetime check
            const { data: lifetimeData } = await supabase
              .from("lifetime_subscriptions")
              .select("tier")
              .eq("user_id", profile.hunter_society_id)
              .maybeSingle();

            if (lifetimeData && (lifetimeData.tier === "pro" || lifetimeData.tier === "normal")) {
              setSocietyIsPro(true);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error checking role:", error);
    }
  };

  const fetchZones = async () => {
    try {
      const { data, error } = await supabase
        .from("security_zones")
        .select("*, settlements(name)")
        .order("name");

      if (error) throw error;
      setZones(data || []);
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchLocations = async (securityZoneId: string) => {
    try {
      const { data, error } = await supabase
        .from("hunting_locations")
        .select(`
          id, 
          name, 
          type,
          security_zones (
            name,
            settlements (name)
          )
        `)
        .eq("security_zone_id", securityZoneId)
        .order("display_order");

      if (error) throw error;
      setLocations(data || []);
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchClosures = async () => {
    try {
      const now = new Date();
      const { data, error } = await supabase
        .from("security_zone_closures")
        .select(`
          *,
          security_zones (
            name,
            settlements (name)
          )
        `)
        .gte("end_date", now.toISOString())
        .lte("start_date", now.toISOString());

      if (error) throw error;
      setClosures(data || []);
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
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
      toast({
        title: "Hiba",
        description: "Nem sikerült lekérdezni az időjárást",
        variant: "destructive",
      });
    } finally {
      setLoadingWeather(false);
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
        setHuntingChance(Math.round(chance * 10) / 10);
      }
    } catch (error) {
      console.error('Error fetching hunting chance:', error);
      toast({
        title: "Hiba",
        description: "Nem sikerült kiszámítani az elejtési esélyt",
        variant: "destructive",
      });
    } finally {
      setLoadingChance(false);
    }
  };

  const fetchHunters = async () => {
    try {
      // Get all users with hunter or admin role
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["hunter", "admin"]);

      if (rolesError) throw rolesError;

      const userIds = [...new Set(userRoles?.map(r => r.user_id) || [])];

      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, contact_name, hunter_license_number")
          .in("id", userIds);

        if (profilesError) throw profilesError;

        const huntersList = profiles?.map(p => ({
          id: p.id,
          profiles: {
            contact_name: p.contact_name,
            hunter_license_number: p.hunter_license_number,
          }
        })) || [];

        setHunters(huntersList);
      }
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchHiredHunters = async () => {
    try {
      const { data, error } = await supabase
        .from("hired_hunters")
        .select("id, name, license_number")
        .order("name");

      if (error) throw error;
      setHiredHunters(data || []);
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check user roles to determine what registrations to show
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const roleList = roles?.map(r => r.role) || [];
      const userIsAdmin = roleList.includes("admin");
      const userIsEditor = roleList.includes("editor");
      const userIsSuperAdmin = roleList.includes("super_admin");
      const userIsHunter = roleList.includes("hunter");

      // Build query based on user role
      let query = supabase
        .from("hunting_registrations")
        .select(`
          *,
          security_zones (
            name,
            settlements (name)
          ),
          hunting_locations (name, type),
          hired_hunters (name, license_number)
        `);

      // If user is only hunter (not admin/editor/super_admin), only show their own registrations
      if (userIsHunter && !userIsAdmin && !userIsEditor && !userIsSuperAdmin) {
        query = query.eq("user_id", user.id);
      }

      const { data: registrationsData, error: registrationsError } = await query
        .order("created_at", { ascending: false });

      if (registrationsError) throw registrationsError;

      // Fetch user profiles for all registrations
      const userIds = [...new Set(registrationsData?.map(r => r.user_id) || [])];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, contact_name, contact_phone, hunter_license_number")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Fetch animals for all registrations
      const registrationIds = registrationsData?.map(r => r.id) || [];
      const { data: animalsData, error: animalsError } = await supabase
        .from("animals")
        .select("id, animal_id, species, weight, hunting_registration_id")
        .in("hunting_registration_id", registrationIds);

      if (animalsError) throw animalsError;

      // Map profiles and animals to registrations
      const registrationsWithProfiles = registrationsData?.map(reg => {
        const profile = profilesData?.find(p => p.id === reg.user_id);
        const animals = animalsData?.filter(a => a.hunting_registration_id === reg.id) || [];
        return {
          ...reg,
          profiles: profile || {
            contact_name: null,
            contact_phone: null,
            hunter_license_number: null
          },
          animals
        };
      }) || [];

      setRegistrations(registrationsWithProfiles);
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.security_zone_id || !formData.start_date || !formData.start_time || !formData.end_date || !formData.end_time) {
      toast({
        title: "Hiba",
        description: "Minden mező kitöltése kötelező!",
        variant: "destructive",
      });
      return;
    }

    const startTime = new Date(`${formData.start_date}T${formData.start_time}`);
    const endTime = new Date(`${formData.end_date}T${formData.end_time}`);

    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    if (duration < 3) {
      toast({
        title: "Hiba",
        description: "Minimum 3 óra vadászati időt kell megadni!",
        variant: "destructive",
      });
      return;
    }

    if (duration > 24) {
      toast({
        title: "Hiba",
        description: "Maximum 24 óra vadászati időt lehet megadni!",
        variant: "destructive",
      });
      return;
    }


    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Determine which ID to use based on admin selection
      let insertData: any = {
        security_zone_id: formData.security_zone_id,
        hunting_location_id: formData.hunting_location_id || null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      };

      // Check if admin/editor is creating the registration
      const isAdminOrEditorCreating = isAdmin || isEditor;

      if ((isAdmin || isEditor) && formData.selected_user_id) {
        // Check if it's a hired hunter (starts with "hired-")
        if (formData.selected_user_id.startsWith("hired-")) {
          const hiredHunterId = formData.selected_user_id.replace("hired-", "");
          insertData.hired_hunter_id = hiredHunterId;
          insertData.user_id = user.id; // Admin's ID for ownership
        } else {
          insertData.user_id = formData.selected_user_id;
        }
      } else {
        insertData.user_id = user.id;
      }

      // Check if user already has an active registration (pending or approved) that hasn't ended yet
      const targetUserId = insertData.user_id;
      const { data: existingRegistrations, error: checkError } = await supabase
        .from("hunting_registrations")
        .select("id, status, start_time, end_time, security_zones(name)")
        .eq("user_id", targetUserId)
        .in("status", ["pending", "approved"])
        .gt("end_time", new Date().toISOString())
        .limit(1);

      if (checkError) throw checkError;

      if (existingRegistrations && existingRegistrations.length > 0) {
        const existing = existingRegistrations[0];
        const statusText = existing.status === "pending" ? "jóváhagyásra váró" : "jóváhagyott";
        toast({
          title: "Már van aktív beiratkozás",
          description: `Már létezik egy ${statusText} beiratkozás (${existing.security_zones?.name}). Kérjük, először törölje vagy változtassa meg azt, mielőtt újat hozna létre.`,
          variant: "destructive",
        });
        return;
      }

      // If admin or editor is creating, automatically approve
      if (isAdminOrEditorCreating) {
        insertData.status = "approved";
        insertData.requires_admin_approval = false;
      }

      const { error } = await supabase
        .from("hunting_registrations")
        .insert(insertData);

      if (error) throw error;

      toast({
        title: "Siker!",
        description: isAdminOrEditorCreating 
          ? "Beiratkozás rögzítve és jóváhagyva!"
          : "Beiratkozás rögzítve! Ellenőrzés alatt áll.",
      });

      setFormData(getDefaultFormData());
      setDialogOpen(false);
      fetchRegistrations();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }

  };

  const handleApprove = async (regId: string) => {
    try {
      // Fetch registration details before approval for notification
      const { data: registration, error: fetchError } = await supabase
        .from("hunting_registrations")
        .select(`
          *,
          security_zones!inner(name),
          hunting_locations(name)
        `)
        .eq("id", regId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from("hunting_registrations")
        .update({ 
          status: "approved",
          requires_admin_approval: false 
        })
        .eq("id", regId);

      if (error) throw error;

      // Send notification to the user who created the registration
      if (registration) {
        await sendNotification({
          notification_type: 'registration_approved',
          data: {
            security_zone_name: registration.security_zones?.name,
            hunting_location_name: registration.hunting_locations?.name,
            start_time: registration.start_time,
            end_time: registration.end_time,
            admin_note: registration.admin_note,
          },
        });
      }

      toast({ title: "Siker!", description: "Beiratkozás jóváhagyva!" });
      fetchRegistrations();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReject = async (regId: string) => {
    try {
      // Fetch registration details before rejection for notification
      const { data: registration, error: fetchError } = await supabase
        .from("hunting_registrations")
        .select(`
          *,
          security_zones!inner(name),
          hunting_locations(name)
        `)
        .eq("id", regId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from("hunting_registrations")
        .update({ status: "rejected" })
        .eq("id", regId);

      if (error) throw error;

      // Send notification to the user who created the registration
      if (registration) {
        await sendNotification({
          notification_type: 'registration_rejected',
          data: {
            security_zone_name: registration.security_zones?.name,
            hunting_location_name: registration.hunting_locations?.name,
            start_time: registration.start_time,
            end_time: registration.end_time,
            admin_note: registration.admin_note,
          },
        });
      }

      toast({ title: "Siker!", description: "Beiratkozás elutasítva!" });
      fetchRegistrations();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (regId: string) => {
    try {
      const { error } = await supabase
        .from("hunting_registrations")
        .delete()
        .eq("id", regId);

      if (error) throw error;
      toast({ title: "Siker!", description: "Beiratkozás törölve!" });
      fetchRegistrations();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancel = async (regId: string) => {
    try {
      const { error } = await supabase
        .from("hunting_registrations")
        .update({ status: "cancelled" })
        .eq("id", regId);

      if (error) throw error;
      toast({ title: "Siker!", description: "Kiiratkozás sikeres!" });
      fetchRegistrations();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDetachAnimal = async (animalId: string) => {
    try {
      const { error } = await supabase
        .from("animals")
        .update({ hunting_registration_id: null })
        .eq("id", animalId);

      if (error) throw error;
      toast({ title: "Siker!", description: "Állat leválasztva a beiratkozásról!" });
      fetchRegistrations();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getRegistrationStatus = (registration: HuntingRegistration) => {
    const now = new Date();
    const startTime = new Date(registration.start_time);
    const endTime = new Date(registration.end_time);

    if (registration.status === "cancelled") {
      return { label: "Kiiratkozva", variant: "secondary" as const, icon: XCircle };
    }
    
    if (registration.status === "rejected") {
      return { label: "Elutasítva", variant: "destructive" as const, icon: XCircle };
    }

    if (registration.status === "pending" || registration.requires_admin_approval) {
      return { label: "Elfogadásra vár", variant: "secondary" as const, icon: AlertCircle };
    }

    if (now >= startTime && now <= endTime) {
      return { label: "Jelenleg tart", variant: "default" as const, icon: Clock };
    }

    if (now > endTime) {
      return { label: "Véget ért", variant: "outline" as const, icon: CheckCircle };
    }

    return { label: "Jóváhagyva", variant: "default" as const, icon: CheckCircle };
  };

  const getStatusBadge = (registration: HuntingRegistration) => {
    const status = getRegistrationStatus(registration);
    const Icon = status.icon;
    return (
      <Badge variant={status.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {status.label}
      </Badge>
    );
  };

  if (subscriptionLoading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Betöltés...</p>
      </div>
    );
  }

  const hasProAccess = isPro || societyIsPro;

  if (!hasProAccess) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader 
          isAdmin={isAdmin}
          isEditor={isEditor}
          onLogout={handleLogout}
        />
        <div className="container mx-auto px-6 py-8">
          {/* Page Title */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-forest-deep">Vadászati beiratkozások</h2>
            <p className="text-muted-foreground">Beiratkozások kezelése és új beiratkozás létrehozása</p>
          </div>
          
          <Alert className="border-yellow-500/50 bg-yellow-500/10">
            <Crown className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <AlertTitle className="text-yellow-700 dark:text-yellow-300">Pro csomag szükséges</AlertTitle>
            <AlertDescription className="text-yellow-600 dark:text-yellow-400">
              A vadászati beiratkozási rendszer csak Pro csomaggal érhető el. 
              <Button 
                variant="link" 
                className="p-0 h-auto ml-1 text-yellow-700 dark:text-yellow-300 underline"
                onClick={() => navigate("/subscriptions")}
              >
                Frissítsen Pro csomagra
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        isAdmin={isAdmin}
        isEditor={isEditor}
        onLogout={handleLogout}
      />
      
      <div className="container mx-auto px-6 py-8">
        {/* Page Title */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-forest-deep">Vadászati beiratkozások</h2>
            <p className="text-muted-foreground">Biztonsági körzetek kezelése</p>
          </div>
          {isHunter && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Új beiratkozás
                </Button>
              </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Új vadászati beiratkozás</DialogTitle>
                    <DialogDescription>
                      Minimum 3 óra, maximum 24 óra vadászati idő. Maximum 3 nappal előre foglalható. Átfedés esetén admin jóváhagyás kell.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {isAdmin && (
                    <div className="space-y-2">
                      <Label>Vadász kiválasztása *</Label>
                      <Select value={formData.selected_user_id} onValueChange={(value) => setFormData({ ...formData, selected_user_id: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Válasszon vadászt" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {hiredHunters.map((hunter) => (
                            <SelectItem key={`hired-${hunter.id}`} value={`hired-${hunter.id}`}>
                              Bérvadász - {hunter.name}
                              {hunter.license_number && ` (${hunter.license_number})`}
                            </SelectItem>
                          ))}
                          {hunters.map((hunter) => (
                            <SelectItem key={hunter.id} value={hunter.id}>
                              {hunter.profiles.contact_name || "Név nélkül"} 
                              {hunter.profiles.hunter_license_number && ` (${hunter.profiles.hunter_license_number})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    )}
                    <div className="space-y-2">
                      <Label>Biztonsági körzet *</Label>
                      <Select 
                        value={formData.security_zone_id} 
                        onValueChange={(value) => {
                          setFormData({ ...formData, security_zone_id: value, hunting_location_id: "" });
                          fetchLocations(value);
                          
                          const selectedZone = zones.find(z => z.id === value);
                          if (selectedZone?.settlements?.name) {
                            fetchWeather(selectedZone.settlements.name);
                          }
                          fetchHuntingChance(value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Válasszon körzetet" />
                        </SelectTrigger>
                        <SelectContent>
                          {zones.map((zone) => {
                            const isClosed = closures.some(c => c.security_zone_id === zone.id);
                            return (
                              <SelectItem 
                                key={zone.id} 
                                value={zone.id}
                                disabled={isClosed}
                              >
                                {zone.settlements?.name ? `${zone.settlements.name} - ${zone.name}` : zone.name}
                                {isClosed && " (Lezárva)"}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {loadingWeather && formData.security_zone_id && (
                      <div className="text-sm text-muted-foreground">
                        Időjárás betöltése...
                      </div>
                    )}

                    {weatherData && !loadingWeather && formData.security_zone_id && (
                      <Card className="bg-accent/5">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Időjárás előrejelzés - {weatherData.settlement}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Current weather */}
                          <div className="border-b pb-3">
                            <div className="text-xs font-semibold text-muted-foreground mb-2">Most</div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex justify-between">
                                <span>Hőmérséklet:</span>
                                <span className="font-medium">{weatherData.current.temperature}°C</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Páratartalom:</span>
                                <span className="font-medium">{weatherData.current.humidity}%</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Forecast for 1, 3, 12, 24 hours */}
                          {[1, 3, 12, 24].map((hours) => {
                            const currentHour = new Date().getHours();
                            const targetHour = (currentHour + hours) % weatherData.hourly.time.length;
                            const getWindDirection = (deg: number) => {
                              const directions = ['É', 'ÉK', 'K', 'DK', 'D', 'DNy', 'Ny', 'ÉNy'];
                              return directions[Math.round(deg / 45) % 8];
                            };
                            
                            return (
                              <div key={hours} className="border-b last:border-0 pb-3 last:pb-0">
                                <div className="text-xs font-semibold text-muted-foreground mb-2">
                                  {hours} óra múlva
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="flex justify-between">
                                    <span>Esővalószínűség:</span>
                                    <span className="font-medium">
                                      {weatherData.hourly.precipitation_probability[targetHour]}%
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Szél iránya:</span>
                                    <span className="font-medium">
                                      {getWindDirection(weatherData.hourly.wind_direction[targetHour])}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Szél:</span>
                                    <span className="font-medium">
                                      {weatherData.hourly.wind_speed[targetHour]} km/h
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Hőmérséklet:</span>
                                    <span className="font-medium">
                                      {weatherData.hourly.temperature[targetHour]}°C
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    )}

                    {loadingChance && formData.security_zone_id && (
                      <div className="text-sm text-muted-foreground">
                        Elejtési esély számítása...
                      </div>
                    )}

                    {huntingChance !== null && !loadingChance && formData.security_zone_id && (
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
                    
                    {formData.security_zone_id && locations.length > 0 && (
                      <div className="space-y-2">
                        <Label>Pontos helyszín (opcionális)</Label>
                        <Select 
                          value={formData.hunting_location_id} 
                          onValueChange={(value) => setFormData({ ...formData, hunting_location_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Válasszon helyszínt" />
                          </SelectTrigger>
                        <SelectContent>
                          {locations.map((location) => {
                            const settlement = location.security_zones?.settlements?.name || "";
                            const zone = location.security_zones?.name || "";
                            const displayText = settlement && zone 
                              ? `${settlement} - ${zone} - ${location.name}`
                              : location.name;
                            
                            return (
                              <SelectItem key={location.id} value={location.id}>
                                {displayText}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Kezdés dátuma *</Label>
                        <Input
                          type="date"
                          value={formData.start_date}
                          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Kezdés ideje *</Label>
                        <Input
                          type="time"
                          value={formData.start_time}
                          onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Befejezés dátuma *</Label>
                        <Input
                          type="date"
                          value={formData.end_date}
                          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Befejezés ideje *</Label>
                        <Input
                          type="time"
                          value={formData.end_time}
                          onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        />
                      </div>
                    </div>
                    <Button onClick={handleSubmit} className="w-full">
                      Beiratkozás rögzítése
                    </Button>
                  </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Active Zone Closures Alert */}
        {closures.length > 0 && (
          <Alert className="border-orange-500/50 bg-orange-500/10">
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
      </div>

      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className={`grid w-full ${isAdmin || isEditor ? 'max-w-2xl grid-cols-3' : 'max-w-md grid-cols-2'}`}>
            <TabsTrigger value="active">Aktív beiratkozások</TabsTrigger>
            {(isAdmin || isEditor) && (
              <TabsTrigger value="pending">Elfogadásra vár</TabsTrigger>
            )}
            <TabsTrigger value="archive">Archív</TabsTrigger>
          </TabsList>

          {/* Aktív beiratkozások */}
          <TabsContent value="active" className="space-y-4">
            {loading ? (
              <p>Betöltés...</p>
            ) : registrations.filter(reg => {
              const now = new Date();
              const endTime = new Date(reg.end_time);
              const isEnded = now > endTime;
              const isArchived = reg.status === "cancelled" || reg.status === "rejected" || isEnded;
              return !isArchived;
            }).length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  Nincs aktív beiratkozás.
                </CardContent>
              </Card>
            ) : (
              registrations.filter(reg => {
                const now = new Date();
                const endTime = new Date(reg.end_time);
                const isEnded = now > endTime;
                const isArchived = reg.status === "cancelled" || reg.status === "rejected" || isEnded;
                return !isArchived;
              }).map((reg) => {
                const isOwnRegistration = currentUserId === reg.user_id;
              
              return (
              <Card key={reg.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        {reg.security_zones.settlements?.name ? `${reg.security_zones.settlements.name} -> ` : ''}{reg.security_zones.name}{reg.hunting_locations ? ` -> ${reg.hunting_locations.name}` : ''}
                      </CardTitle>
                      <CardDescription className="mt-2 space-y-2">
                        <div className="flex items-center gap-4 text-sm">
                          <span>
                            <Calendar className="h-4 w-4 inline mr-1" />
                            {format(new Date(reg.start_time), "yyyy. MM. dd. HH:mm", { locale: hu })}
                          </span>
                          <span>-</span>
                          <span>
                            {format(new Date(reg.end_time), "yyyy. MM. dd. HH:mm", { locale: hu })}
                          </span>
                        </div>
                        <div className="text-sm">
                          <strong>Helyszín:</strong> {reg.hunting_locations ? reg.hunting_locations.name : "Egész terület"}
                        </div>
                            <div className="text-sm space-y-1 mt-2">
                              <div><strong>Vadász:</strong> {reg.hired_hunter_id ? reg.hired_hunters?.name : reg.profiles.contact_name || "Névtelen"}</div>
                              {reg.hired_hunter_id && reg.hired_hunters?.license_number && (
                                <div><strong>Vadászjegy:</strong> {reg.hired_hunters.license_number}</div>
                              )}
                              {!reg.hired_hunter_id && reg.profiles.contact_phone && (
                                <div><strong>Telefon:</strong> {reg.profiles.contact_phone}</div>
                              )}
                              {!reg.hired_hunter_id && reg.profiles.hunter_license_number && (
                                <div><strong>Vadászjegy:</strong> {reg.profiles.hunter_license_number}</div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                Beiratkozva: {format(new Date(reg.created_at), "yyyy. MM. dd. HH:mm", { locale: hu })}
                              </div>
                            </div>
                      </CardDescription>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      {getStatusBadge(reg)}
                      {isAdmin && reg.requires_admin_approval && reg.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(reg.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Jóváhagy
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(reg.id)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Elutasít
                          </Button>
                        </div>
                      )}
                      {isOwnRegistration && reg.status !== "cancelled" && reg.status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancel(reg.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Kiiratkozás
                        </Button>
                      )}
                      {(isAdmin || isEditor || isSuperAdmin) && (
                        <AssignAnimalToRegistrationDialog
                          registrationId={reg.id}
                          isHiredHunter={!!reg.hired_hunter_id}
                          hunterName={reg.hired_hunter_id ? reg.hired_hunters?.name : reg.profiles.contact_name}
                          registrationSecurityZoneId={reg.security_zone_id}
                          onAnimalAssigned={fetchRegistrations}
                        />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {reg.admin_note && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Admin megjegyzés:</strong> {reg.admin_note}
                    </p>
                  )}
                  {reg.animals && reg.animals.length > 0 && (
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:underline">
                        <ChevronDown className="h-4 w-4" />
                        <Package className="h-4 w-4" />
                        Hozzárendelt állatok ({reg.animals.length})
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2">
                        <div className="grid gap-2 pl-6">
                          {reg.animals.map((animal) => (
                            <div key={animal.id} className="text-sm bg-muted/50 p-2 rounded flex items-start justify-between">
                              <div className="flex-1">
                                <div><strong>Azonosító:</strong> {animal.animal_id}</div>
                                <div><strong>Faj:</strong> {animal.species}</div>
                                {animal.weight && <div><strong>Súly:</strong> {animal.weight} kg</div>}
                              </div>
                              {(isAdmin || isEditor || isSuperAdmin) && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDetachAnimal(animal.id)}
                                  className="h-8"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
          </TabsContent>

          {/* Elfogadásra váró beiratkozások */}
          {(isAdmin || isEditor) && (
            <TabsContent value="pending" className="space-y-4">
              {loading ? (
                <p>Betöltés...</p>
              ) : registrations.filter(reg => reg.status === "pending" && reg.requires_admin_approval).length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    Nincs elfogadásra váró beiratkozás.
                  </CardContent>
                </Card>
              ) : (
                registrations.filter(reg => reg.status === "pending" && reg.requires_admin_approval).map((reg) => (
                  <Card key={reg.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            {reg.security_zones.settlements?.name ? `${reg.security_zones.settlements.name} -> ` : ''}{reg.security_zones.name}{reg.hunting_locations ? ` -> ${reg.hunting_locations.name}` : ''}
                          </CardTitle>
                          <CardDescription className="mt-2 space-y-2">
                            <div className="flex items-center gap-4 text-sm">
                              <span>
                                <Calendar className="h-4 w-4 inline mr-1" />
                                {format(new Date(reg.start_time), "yyyy. MM. dd. HH:mm", { locale: hu })}
                              </span>
                              <span>-</span>
                              <span>
                                {format(new Date(reg.end_time), "yyyy. MM. dd. HH:mm", { locale: hu })}
                              </span>
                            </div>
                            <div className="text-sm">
                              <strong>Helyszín:</strong> {reg.hunting_locations ? reg.hunting_locations.name : "Egész terület"}
                            </div>
                          <div className="text-sm space-y-1 mt-2">
                            <div><strong>Vadász:</strong> {reg.hired_hunter_id ? reg.hired_hunters?.name : reg.profiles.contact_name || "Névtelen"}</div>
                            {reg.hired_hunter_id && reg.hired_hunters?.license_number && (
                              <div><strong>Vadászjegy:</strong> {reg.hired_hunters.license_number}</div>
                            )}
                            {!reg.hired_hunter_id && reg.profiles.contact_phone && (
                              <div><strong>Telefon:</strong> {reg.profiles.contact_phone}</div>
                            )}
                            {!reg.hired_hunter_id && reg.profiles.hunter_license_number && (
                              <div><strong>Vadászjegy:</strong> {reg.profiles.hunter_license_number}</div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              Beiratkozva: {format(new Date(reg.created_at), "yyyy. MM. dd. HH:mm", { locale: hu })}
                            </div>
                          </div>
                          </CardDescription>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          {getStatusBadge(reg)}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprove(reg.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Jóváhagy
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(reg.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Elutasít
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    {reg.admin_note && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          <strong>Admin megjegyzés:</strong> {reg.admin_note}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                ))
              )}
            </TabsContent>
          )}

          {/* Archív beiratkozások */}
          <TabsContent value="archive" className="space-y-4">
            {/* Archive Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Szűrők</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Biztonsági körzet</Label>
                    <Select value={archiveFilterZone} onValueChange={setArchiveFilterZone}>
                      <SelectTrigger>
                        <SelectValue placeholder="Összes körzet" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Összes körzet</SelectItem>
                        {zones.map((zone) => (
                          <SelectItem key={zone.id} value={zone.id}>
                            {zone.settlements?.name ? `${zone.settlements.name} - ${zone.name}` : zone.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Vadász</Label>
                    <Select value={archiveFilterHunter} onValueChange={setArchiveFilterHunter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Összes vadász" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <SelectItem value="all">Összes vadász</SelectItem>
                        {hunters.map((hunter) => (
                          <SelectItem key={hunter.id} value={hunter.id}>
                            {hunter.profiles.contact_name || "Név nélkül"}
                          </SelectItem>
                        ))}
                        {hiredHunters.map((hunter) => (
                          <SelectItem key={`hired-${hunter.id}`} value={`hired-${hunter.id}`}>
                            Bérvadász - {hunter.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Vad azonosító</Label>
                    <Input
                      placeholder="Vad azonosító keresése..."
                      value={archiveFilterAnimalId}
                      onChange={(e) => setArchiveFilterAnimalId(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Kezdés dátumától</Label>
                    <Input
                      type="date"
                      value={archiveFilterStartDate}
                      onChange={(e) => setArchiveFilterStartDate(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Kezdés dátumáig</Label>
                    <Input
                      type="date"
                      value={archiveFilterEndDate}
                      onChange={(e) => setArchiveFilterEndDate(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setArchiveFilterZone("");
                        setArchiveFilterHunter("");
                        setArchiveFilterStartDate("");
                        setArchiveFilterEndDate("");
                        setArchiveFilterAnimalId("");
                      }}
                      className="w-full"
                    >
                      Szűrők törlése
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {loading ? (
              <p>Betöltés...</p>
            ) : (() => {
              const now = new Date();
              const archivedRegs = registrations.filter(reg => {
                const endTime = new Date(reg.end_time);
                const isEnded = now > endTime;
                const isArchived = reg.status === "cancelled" || reg.status === "rejected" || isEnded;
                
                if (!isArchived) return false;
                
                // Apply filters
                if (archiveFilterZone && archiveFilterZone !== "all" && reg.security_zone_id !== archiveFilterZone) {
                  return false;
                }
                
                if (archiveFilterHunter && archiveFilterHunter !== "all") {
                  if (archiveFilterHunter.startsWith("hired-")) {
                    const hiredHunterId = archiveFilterHunter.replace("hired-", "");
                    if (reg.hired_hunter_id !== hiredHunterId) return false;
                  } else {
                    if (reg.user_id !== archiveFilterHunter) return false;
                  }
                }
                
                if (archiveFilterStartDate) {
                  const filterStart = new Date(archiveFilterStartDate);
                  const regStart = new Date(reg.start_time);
                  if (regStart < filterStart) return false;
                }
                
                if (archiveFilterEndDate) {
                  const filterEnd = new Date(archiveFilterEndDate);
                  filterEnd.setHours(23, 59, 59, 999);
                  const regStart = new Date(reg.start_time);
                  if (regStart > filterEnd) return false;
                }
                
                if (archiveFilterAnimalId && archiveFilterAnimalId.trim() !== "") {
                  const hasMatchingAnimal = reg.animals?.some(animal => 
                    animal.animal_id.toLowerCase().includes(archiveFilterAnimalId.toLowerCase())
                  );
                  if (!hasMatchingAnimal) return false;
                }
                
                return true;
              });
              
              return archivedRegs.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    Nincs archivált beiratkozás a megadott szűrőkkel.
                  </CardContent>
                </Card>
              ) : (
                archivedRegs.map((reg) => (
                <Card key={reg.id} className="opacity-75">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <MapPin className="h-5 w-5" />
                          {reg.security_zones.settlements?.name ? `${reg.security_zones.settlements.name} -> ` : ''}{reg.security_zones.name}{reg.hunting_locations ? ` -> ${reg.hunting_locations.name}` : ''}
                        </CardTitle>
                        <CardDescription className="mt-2 space-y-2">
                          <div className="flex items-center gap-4 text-sm">
                            <span>
                              <Calendar className="h-4 w-4 inline mr-1" />
                              {format(new Date(reg.start_time), "yyyy. MM. dd. HH:mm", { locale: hu })}
                            </span>
                            <span>-</span>
                            <span>
                              {format(new Date(reg.end_time), "yyyy. MM. dd. HH:mm", { locale: hu })}
                            </span>
                          </div>
                          <div className="text-sm">
                            <strong>Helyszín:</strong> {reg.hunting_locations ? reg.hunting_locations.name : "Egész terület"}
                          </div>
                            <div className="text-sm space-y-1 mt-2">
                              <div><strong>Vadász:</strong> {reg.hired_hunter_id ? reg.hired_hunters?.name : reg.profiles.contact_name || "Névtelen"}</div>
                              {reg.hired_hunter_id && reg.hired_hunters?.license_number && (
                                <div><strong>Vadászjegy:</strong> {reg.hired_hunters.license_number}</div>
                              )}
                              {!reg.hired_hunter_id && reg.profiles.contact_phone && (
                                <div><strong>Telefon:</strong> {reg.profiles.contact_phone}</div>
                              )}
                              {!reg.hired_hunter_id && reg.profiles.hunter_license_number && (
                                <div><strong>Vadászjegy:</strong> {reg.profiles.hunter_license_number}</div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                Beiratkozva: {format(new Date(reg.created_at), "yyyy. MM. dd. HH:mm", { locale: hu })}
                              </div>
                            </div>
                        </CardDescription>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        {getStatusBadge(reg)}
                        <div className="flex gap-2">
                          {(isAdmin || isEditor || isSuperAdmin) && (
                            <AssignAnimalToRegistrationDialog
                              registrationId={reg.id}
                              isHiredHunter={!!reg.hired_hunter_id}
                              hunterName={reg.hired_hunter_id ? reg.hired_hunters?.name : reg.profiles.contact_name}
                              registrationSecurityZoneId={reg.security_zone_id}
                              onAnimalAssigned={fetchRegistrations}
                            />
                          )}
                          {isSuperAdmin && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(reg.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Törlés
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {reg.admin_note && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Admin megjegyzés:</strong> {reg.admin_note}
                      </p>
                    )}
                    {reg.animals && reg.animals.length > 0 && (
                      <Collapsible>
                        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:underline">
                          <ChevronDown className="h-4 w-4" />
                          <Package className="h-4 w-4" />
                          Hozzárendelt állatok ({reg.animals.length})
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2">
                          <div className="grid gap-2 pl-6">
                            {reg.animals.map((animal) => (
                              <div key={animal.id} className="text-sm bg-muted/50 p-2 rounded flex items-start justify-between">
                                <div className="flex-1">
                                  <div><strong>Azonosító:</strong> {animal.animal_id}</div>
                                  <div><strong>Faj:</strong> {animal.species}</div>
                                  {animal.weight && <div><strong>Súly:</strong> {animal.weight} kg</div>}
                                </div>
                                {(isAdmin || isEditor || isSuperAdmin) && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDetachAnimal(animal.id)}
                                    className="h-8"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </CardContent>
                </Card>
                ))
              );
            })()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default HuntingRegistrations;
