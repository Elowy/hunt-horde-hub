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

interface HuntingRegistration {
  id: string;
  user_id: string;
  security_zone_id: string;
  hunting_location_id: string | null;
  start_time: string;
  end_time: string;
  status: string;
  is_guest: boolean;
  guest_name: string | null;
  created_at: string;
  security_zones?: {
    name: string;
    settlement_id: string | null;
    settlements?: {
      name: string;
    } | null;
  } | null;
  hunting_locations?: {
    name: string;
  } | null;
  user_profile?: {
    contact_name: string | null;
    company_name: string | null;
  } | null;
}

interface Profile {
  id: string;
  company_name: string | null;
}

export const SuperAdminRegistrations = () => {
  const [registrations, setRegistrations] = useState<HuntingRegistration[]>([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState<HuntingRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSociety, setSelectedSociety] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [societies, setSocieties] = useState<Profile[]>([]);

  useEffect(() => {
    fetchSocieties();
    fetchRegistrations();

    // Realtime subscription
    const channel = supabase
      .channel('hunting_registrations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hunting_registrations'
        },
        () => fetchRegistrations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterRegistrations();
  }, [registrations, searchTerm, selectedSociety, selectedStatus]);

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

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("hunting_registrations")
        .select(`
          *,
          security_zones (
            name,
            settlement_id,
            settlements (name)
          ),
          hunting_locations (name)
        `)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      // Fetch user profiles separately
      if (data && data.length > 0) {
        const userIds = data.map(reg => reg.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, contact_name, company_name")
          .in("id", userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        const enrichedData = data.map(reg => ({
          ...reg,
          user_profile: profilesMap.get(reg.user_id) || null
        }));

        setRegistrations(enrichedData);
      } else {
        setRegistrations([]);
      }
    } catch (error) {
      console.error("Error fetching registrations:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterRegistrations = () => {
    let filtered = [...registrations];

    if (searchTerm) {
      filtered = filtered.filter(reg => 
        reg.guest_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.user_profile?.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.security_zones?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.hunting_locations?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedSociety !== "all") {
      filtered = filtered.filter(reg => reg.user_id === selectedSociety);
    }

    if (selectedStatus !== "all") {
      filtered = filtered.filter(reg => reg.status === selectedStatus);
    }

    setFilteredRegistrations(filtered);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "approved": return "default";
      case "pending": return "secondary";
      case "rejected": return "destructive";
      default: return "outline";
    }
  };

  const translateStatus = (status: string) => {
    const translations: Record<string, string> = {
      approved: "Jóváhagyva",
      pending: "Folyamatban",
      rejected: "Elutasítva",
    };
    return translations[status] || status;
  };

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
        <CardTitle>Vadászati Beiratkozások</CardTitle>
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
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Összes státusz" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Összes státusz</SelectItem>
              <SelectItem value="approved">Jóváhagyva</SelectItem>
              <SelectItem value="pending">Folyamatban</SelectItem>
              <SelectItem value="rejected">Elutasítva</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vadász</TableHead>
                <TableHead>Település</TableHead>
                <TableHead>Beírókörzet</TableHead>
                <TableHead>Pontos helyszín</TableHead>
                <TableHead>Időpont</TableHead>
                <TableHead>Státusz</TableHead>
                <TableHead>Típus</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRegistrations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nincs megjeleníthető beiratkozás
                  </TableCell>
                </TableRow>
              ) : (
                filteredRegistrations.map((reg) => (
                  <TableRow key={reg.id}>
                    <TableCell>
                      {reg.is_guest 
                        ? reg.guest_name || "Vendég" 
                        : reg.user_profile?.contact_name || "Névtelen"}
                    </TableCell>
                    <TableCell>
                      {reg.security_zones?.settlements?.name || "-"}
                    </TableCell>
                    <TableCell>
                      {reg.security_zones?.name || "-"}
                    </TableCell>
                    <TableCell>
                      {reg.hunting_locations?.name || "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(reg.start_time), "yyyy. MM. dd. HH:mm", { locale: hu })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(reg.status)}>
                        {translateStatus(reg.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={reg.is_guest ? "secondary" : "outline"}>
                        {reg.is_guest ? "Vendég" : "Tag"}
                      </Badge>
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
