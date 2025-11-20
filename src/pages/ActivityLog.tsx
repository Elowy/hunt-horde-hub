import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { Loader2, Home } from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { DashboardMenu } from "@/components/DashboardMenu";
import { NotificationBell } from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";

interface ActivityLog {
  id: string;
  user_id: string;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: any;
  created_at: string;
}

export default function ActivityLog() {
  const navigate = useNavigate();
  const { isSuperAdmin, loading: superAdminLoading } = useIsSuperAdmin();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (!isAdmin && !isSuperAdmin) return;

    // Set up realtime subscription for activity logs
    const channel = supabase
      .channel('activity_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_logs'
        },
        (payload) => {
          console.log('Activity log change received:', payload);
          // Refresh the logs when there's a change
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, isSuperAdmin]);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const hasAdminRole = roles?.some(r => r.role === "admin" || r.role === "super_admin");
      setIsAdmin(!!hasAdminRole);

      if (!hasAdminRole) {
        navigate("/dashboard");
        return;
      }

      fetchLogs();
    } catch (error) {
      console.error("Error checking admin status:", error);
      navigate("/dashboard");
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // If super admin, show all logs
      if (isSuperAdmin) {
        const { data, error } = await supabase
          .from("activity_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;
        setLogs(data || []);
      } else {
        // For regular admins, only show logs from their company
        const { data, error } = await supabase
          .from("activity_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;
        setLogs(data || []);
      }
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes("create") || action.includes("insert")) return "default";
    if (action.includes("update") || action.includes("edit")) return "secondary";
    if (action.includes("delete") || action.includes("remove")) return "destructive";
    return "outline";
  };

  const translateEntityType = (type: string) => {
    const translations: Record<string, string> = {
      animal: "Állat",
      storage_location: "Hűtési helyszín",
      transport_document: "Elszállítási bizonylat",
      announcement: "Hír",
      user: "Felhasználó",
      hunting_registration: "Vadászati beiratkozás",
      security_zone: "Vadaskerület",
      settlement: "Település",
      price_setting: "Ár beállítás",
      transporter: "Fuvarozó",
    };
    return translations[type] || type;
  };

  const translateAction = (action: string) => {
    const translations: Record<string, string> = {
      create: "Létrehozás",
      update: "Módosítás",
      delete: "Törlés",
      insert: "Hozzáadás",
      edit: "Szerkesztés",
      remove: "Eltávolítás",
    };
    return translations[action] || action;
  };

  if (superAdminLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin && !isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-forest-deep to-forest-light text-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Vadgondok</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="text-white hover:bg-white/10 flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <DashboardMenu 
                isAdmin={isAdmin}
                isEditor={false}
                isHunter={false}
                onLogout={() => {}}
                onPriceUpdated={() => {}}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Tevékenységi napló</h2>
            <p className="text-muted-foreground mt-2">A cégben végzett összes módosítás naplója</p>
          </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Legutóbbi tevékenységek</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Frissítés"}
            </Button>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Még nincsenek naplózott tevékenységek
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Időpont</TableHead>
                      <TableHead>Felhasználó</TableHead>
                      <TableHead>Művelet</TableHead>
                      <TableHead>Típus</TableHead>
                      <TableHead>Részletek</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(log.created_at), "yyyy. MM. dd. HH:mm", { locale: hu })}
                        </TableCell>
                        <TableCell>{log.user_email || "Rendszer"}</TableCell>
                        <TableCell>
                          <Badge variant={getActionBadgeVariant(log.action)}>
                            {translateAction(log.action)}
                          </Badge>
                        </TableCell>
                        <TableCell>{translateEntityType(log.entity_type)}</TableCell>
                        <TableCell className="max-w-md truncate">
                          {log.details && typeof log.details === "object" 
                            ? JSON.stringify(log.details) 
                            : log.details}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
  );
}
