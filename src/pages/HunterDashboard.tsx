import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { DashboardMenu } from "@/components/DashboardMenu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, BarChart, Bell } from "lucide-react";
import { HunterSocietySelector } from "@/components/HunterSocietySelector";
import { format } from "date-fns";
import { hu } from "date-fns/locale";

interface HunterSociety {
  id: string;
  company_name: string;
}

interface HuntingRegistration {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  security_zones: {
    name: string;
  };
}

interface MembershipPayment {
  id: string;
  amount: number;
  period: string;
  season_year: number;
  paid: boolean;
}

export default function HunterDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [societies, setSocieties] = useState<HunterSociety[]>([]);
  const [registrations, setRegistrations] = useState<HuntingRegistration[]>([]);
  const [payments, setPayments] = useState<MembershipPayment[]>([]);
  const [selectedSociety, setSelectedSociety] = useState<string | null>(null);
  const [permissions, setPermissions] = useState({
    allow_registrations: true,
    allow_view_cooled_animals: true,
    allow_reserve_animals: true,
    allow_view_statistics: true,
    allow_view_announcements: true,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    // Load saved society from localStorage
    const savedSociety = localStorage.getItem('selected-hunter-society');
    if (savedSociety && societies.find(s => s.id === savedSociety)) {
      setSelectedSociety(savedSociety);
    } else if (societies.length > 0 && !selectedSociety) {
      setSelectedSociety(societies[0].id);
    }
  }, [societies]);

  useEffect(() => {
    if (selectedSociety) {
      // Save selected society to localStorage
      localStorage.setItem('selected-hunter-society', selectedSociety);
      fetchDashboardData();
    }
  }, [selectedSociety]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/login");
      return;
    }

    // Check if user is a hunter
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    const userRoles = roles?.map(r => r.role) || [];
    
    // Check if user is hunter OR super_admin
    const isSuperAdmin = userRoles.includes("super_admin");
    
    if (!userRoles.includes("hunter") && !isSuperAdmin) {
      navigate("/dashboard");
      return;
    }

    // Fetch hunter's societies
    const { data: membershipData } = await supabase
      .from("hunter_society_members")
      .select(`
        hunter_society_id,
        profiles!hunter_society_members_hunter_society_id_fkey (
          id,
          company_name
        )
      `)
      .eq("hunter_id", session.user.id);

    if (membershipData && membershipData.length > 0) {
      const societiesData = membershipData.map((m: any) => ({
        id: m.profiles.id,
        company_name: m.profiles.company_name
      }));
      setSocieties(societiesData);
      // Don't set selectedSociety here - let the useEffect handle it with localStorage
    }

    setLoading(false);
  };

  const fetchDashboardData = async () => {
    if (!selectedSociety) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch user's hunter category
    const { data: profileData } = await supabase
      .from("profiles")
      .select("hunter_category")
      .eq("id", user.id)
      .single();

    const hunterCategory = profileData?.hunter_category;

    // Fetch subscription status for the selected society
    const { data: subscriptionData } = await supabase
      .from("trial_subscriptions")
      .select("*")
      .eq("user_id", selectedSociety)
      .maybeSingle();

    const { data: lifetimeData } = await supabase
      .from("lifetime_subscriptions")
      .select("*")
      .eq("user_id", selectedSociety)
      .maybeSingle();

    const hasActiveSubscription = subscriptionData && new Date(subscriptionData.expires_at) > new Date();
    const hasLifetimeSubscription = !!lifetimeData;

    // Fetch permissions for this hunter's category
    if (hunterCategory && (hasActiveSubscription || hasLifetimeSubscription)) {
      const { data: permissionsData } = await supabase
        .from("hunter_feature_permissions")
        .select("*")
        .eq("hunter_society_id", selectedSociety)
        .eq("hunter_category", hunterCategory)
        .single();

      if (permissionsData) {
        setPermissions({
          allow_registrations: permissionsData.allow_registrations,
          allow_view_cooled_animals: permissionsData.allow_view_cooled_animals,
          allow_reserve_animals: permissionsData.allow_reserve_animals,
          allow_view_statistics: permissionsData.allow_view_statistics,
          allow_view_announcements: permissionsData.allow_view_announcements,
        });
      }
    } else {
      // No active subscription - disable all features
      setPermissions({
        allow_registrations: false,
        allow_view_cooled_animals: false,
        allow_reserve_animals: false,
        allow_view_statistics: false,
        allow_view_announcements: false,
      });
    }

    // Fetch animals in storage from selected society (only if allowed)
    // Fetch hunting registrations
    const { data: regData } = await supabase
      .from("hunting_registrations")
      .select(`
        id,
        start_time,
        end_time,
        status,
        security_zones (
          name
        )
      `)
      .eq("user_id", user.id)
      .gte("end_time", new Date().toISOString())
      .order("start_time", { ascending: true })
      .limit(5);

    if (regData) setRegistrations(regData);

    // Fetch membership payments for selected society
    const { data: paymentsData } = await supabase
      .from("membership_payments")
      .select("*")
      .eq("user_id", user.id)
      .eq("hunter_society_id", selectedSociety)
      .eq("paid", false)
      .order("season_year", { ascending: false });

    if (paymentsData) setPayments(paymentsData);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const getPeriodLabel = (period: string) => {
    const labels: Record<string, string> = {
      first_half: "Első félév",
      second_half: "Második félév",
      full_year: "Teljes év"
    };
    return labels[period] || period;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Betöltés...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        isHunter={true}
        onLogout={handleLogout}
      />
      
      <div className="container mx-auto p-4 md:p-6 max-w-7xl">
        <AnnouncementBanner />

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Vadász Dashboard</h1>
          <p className="text-muted-foreground">
            Üdvözöllek a vadász dashboardon! Itt találod a legfontosabb információkat.
          </p>
        </div>

        {/* Society Selector */}
        <HunterSocietySelector
          societies={societies}
          selectedSociety={selectedSociety}
          onSocietyChange={setSelectedSociety}
        />

        <div className="grid gap-6 md:grid-cols-2">
          {/* Upcoming Registrations - only if allowed */}
          {permissions.allow_registrations && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Következő beiratkozások
                </CardTitle>
                <CardDescription>
                  A következő vadászati beiratkozásaid
                </CardDescription>
              </CardHeader>
              <CardContent>
                {registrations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nincs következő beiratkozás</p>
                ) : (
                  <div className="space-y-3">
                    {registrations.map((reg) => (
                      <div key={reg.id} className="flex items-center justify-between border-b pb-2">
                        <div>
                          <p className="font-medium">{reg.security_zones.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(reg.start_time), "PPp", { locale: hu })}
                          </p>
                        </div>
                        <Badge variant={reg.status === "approved" ? "default" : "secondary"}>
                          {reg.status === "approved" ? "Jóváhagyva" : "Függőben"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => navigate("/hunting-registrations")}
                >
                  Összes beiratkozás megtekintése
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Membership Payments */}
          {payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Tagdíjak
                </CardTitle>
                <CardDescription>
                  Befizetésre váró tagdíjak
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="font-medium">{payment.season_year} - {getPeriodLabel(payment.period)}</p>
                        <p className="text-sm text-muted-foreground">
                          {payment.amount.toLocaleString()} Ft
                        </p>
                      </div>
                      <Badge variant="destructive">Befizetésre vár</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Statistics - only if allowed */}
          {permissions.allow_view_statistics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5" />
                  Statisztikák
                </CardTitle>
                <CardDescription>
                  Vadászati statisztikák
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Részletes statisztikák a vadászati tevékenységedről
                </p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate("/hunter-statistics")}
                >
                  Statisztikák megtekintése
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
