import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Calendar, Clock, MapPin, CheckCircle, XCircle, AlertCircle, Crown, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

interface HuntingRegistration {
  id: string;
  user_id: string;
  hired_hunter_id: string | null;
  security_zone_id: string;
  start_time: string;
  end_time: string;
  status: string;
  requires_admin_approval: boolean;
  admin_note: string | null;
  created_at: string;
  security_zones: {
    name: string;
  };
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
  const { isPro, loading: subscriptionLoading } = useSubscription();
  const [registrations, setRegistrations] = useState<HuntingRegistration[]>([]);
  const [zones, setZones] = useState<SecurityZone[]>([]);
  const [hunters, setHunters] = useState<HunterUser[]>([]);
  const [hiredHunters, setHiredHunters] = useState<HiredHunter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHunter, setIsHunter] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const getDefaultFormData = () => {
    const now = new Date();
    const endTime = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours later
    
    return {
      security_zone_id: "",
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
    fetchHunters();
    fetchHiredHunters();
    fetchRegistrations();
  }, []);

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
      
      // Fetch registrations with security zones, ordered by creation date (newest first)
      const { data: registrationsData, error: registrationsError } = await supabase
        .from("hunting_registrations")
        .select(`
          *,
          security_zones (name),
          hired_hunters (name, license_number)
        `)
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
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      };

      if (isAdmin && formData.selected_user_id) {
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

      const { error } = await supabase
        .from("hunting_registrations")
        .insert(insertData);

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "Beiratkozás rögzítve! Ellenőrzés alatt áll.",
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
      const { error } = await supabase
        .from("hunting_registrations")
        .update({ status: "approved" })
        .eq("id", regId);

      if (error) throw error;
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
      const { error } = await supabase
        .from("hunting_registrations")
        .update({ status: "rejected" })
        .eq("id", regId);

      if (error) throw error;
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

  if (!isPro) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
        <div className="bg-gradient-to-r from-forest-deep to-forest-light text-primary-foreground">
          <div className="container mx-auto px-6 py-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/dashboard")}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Vissza
              </Button>
              <div>
                <h1 className="text-3xl font-bold mb-2">Vadászati beiratkozások</h1>
                <p className="text-primary-foreground/90">Beiratkozások kezelése és új beiratkozás létrehozása</p>
              </div>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-6 py-8">
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="bg-gradient-to-r from-forest-deep to-forest-light text-primary-foreground">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/dashboard")}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Vissza
              </Button>
              <div>
                <h1 className="text-3xl font-bold mb-2">Vadászati beiratkozások</h1>
                <p className="text-primary-foreground/90">Biztonsági körzetek kezelése</p>
              </div>
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
                      <Select value={formData.security_zone_id} onValueChange={(value) => setFormData({ ...formData, security_zone_id: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Válasszon körzetet" />
                        </SelectTrigger>
                        <SelectContent>
                          {zones.map((zone) => (
                            <SelectItem key={zone.id} value={zone.id}>
                              {zone.settlements?.name ? `${zone.settlements.name} - ${zone.name}` : zone.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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
        </div>
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
                        {reg.security_zones.name}
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
                      {(isAdmin || isEditor) && (
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
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Package className="h-4 w-4" />
                        Hozzárendelt állatok ({reg.animals.length})
                      </div>
                      <div className="grid gap-2 pl-6">
                        {reg.animals.map((animal) => (
                          <div key={animal.id} className="text-sm bg-muted/50 p-2 rounded">
                            <div><strong>Azonosító:</strong> {animal.animal_id}</div>
                            <div><strong>Faj:</strong> {animal.species}</div>
                            {animal.weight && <div><strong>Súly:</strong> {animal.weight} kg</div>}
                          </div>
                        ))}
                      </div>
                    </div>
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
                            {reg.security_zones.name}
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
            {loading ? (
              <p>Betöltés...</p>
            ) : registrations.filter(reg => {
              const now = new Date();
              const endTime = new Date(reg.end_time);
              const isEnded = now > endTime;
              return reg.status === "cancelled" || reg.status === "rejected" || isEnded;
            }).length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  Nincs archivált beiratkozás.
                </CardContent>
              </Card>
            ) : (
              registrations.filter(reg => {
                const now = new Date();
                const endTime = new Date(reg.end_time);
                const isEnded = now > endTime;
                return reg.status === "cancelled" || reg.status === "rejected" || isEnded;
              }).map((reg) => (
                <Card key={reg.id} className="opacity-75">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <MapPin className="h-5 w-5" />
                          {reg.security_zones.name}
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
                        {(isAdmin || isEditor) && (
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
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Package className="h-4 w-4" />
                          Hozzárendelt állatok ({reg.animals.length})
                        </div>
                        <div className="grid gap-2 pl-6">
                          {reg.animals.map((animal) => (
                            <div key={animal.id} className="text-sm bg-muted/50 p-2 rounded">
                              <div><strong>Azonosító:</strong> {animal.animal_id}</div>
                              <div><strong>Faj:</strong> {animal.species}</div>
                              {animal.weight && <div><strong>Súly:</strong> {animal.weight} kg</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default HuntingRegistrations;
