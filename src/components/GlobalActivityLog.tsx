import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";

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

interface Profile {
  id: string;
  company_name: string | null;
}

export const GlobalActivityLog = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSociety, setSelectedSociety] = useState<string>("all");
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [societies, setSocieties] = useState<Profile[]>([]);

  useEffect(() => {
    fetchSocieties();
    fetchLogs();

    // Realtime subscription
    const channel = supabase
      .channel('global_activity_logs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_logs'
        },
        () => fetchLogs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, selectedSociety, selectedAction]);

  const fetchSocieties = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, company_name")
        .eq("user_type", "hunter_society")
        .order("company_name");

      if (error) throw error;
      setSocieties(data || []);
    } catch (error) {
      console.error("Error fetching societies:", error);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entity_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedSociety !== "all") {
      filtered = filtered.filter(log => log.user_id === selectedSociety);
    }

    if (selectedAction !== "all") {
      filtered = filtered.filter(log => log.action === selectedAction);
    }

    setFilteredLogs(filtered);
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
      price_setting: "Árazási beállítás",
      transporter: "Fuvarozó",
      hunter_society_member: "Vadásztársaság tag",
    };
    return translations[type] || type;
  };

  const translateAction = (action: string) => {
    const translations: Record<string, string> = {
      create: "Létrehozás",
      update: "Módosítás",
      delete: "Törlés",
      add_member: "Tag hozzáadása",
      remove_member: "Tag eltávolítása",
    };
    return translations[action] || action;
  };

  const uniqueActions = Array.from(new Set(logs.map(log => log.action)));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Globális Tevékenységi Napló</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Keresés..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedSociety} onValueChange={setSelectedSociety}>
            <SelectTrigger>
              <SelectValue placeholder="Összes vadásztársaság" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Összes vadásztársaság</SelectItem>
              {societies.map((society) => (
                <SelectItem key={society.id} value={society.id}>
                  {society.company_name || "Névtelen"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedAction} onValueChange={setSelectedAction}>
            <SelectTrigger>
              <SelectValue placeholder="Összes művelet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Összes művelet</SelectItem>
              {uniqueActions.map((action) => (
                <SelectItem key={action} value={action}>
                  {translateAction(action)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Időpont</TableHead>
                <TableHead>Felhasználó</TableHead>
                <TableHead>Művelet</TableHead>
                <TableHead>Entitás típusa</TableHead>
                <TableHead>Részletek</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nincs megjeleníthető tevékenység
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(log.created_at), "yyyy. MM. dd. HH:mm", { locale: hu })}
                    </TableCell>
                    <TableCell>{log.user_email || "Ismeretlen"}</TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {translateAction(log.action)}
                      </Badge>
                    </TableCell>
                    <TableCell>{translateEntityType(log.entity_type)}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {log.details && typeof log.details === 'object' 
                        ? JSON.stringify(log.details).substring(0, 100) + "..."
                        : "Nincs részlet"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
