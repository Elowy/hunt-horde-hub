import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ViewTicketDialog } from "./ViewTicketDialog";
import { MessageSquare, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";

interface Ticket {
  id: string;
  category: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "closed";
  created_at: string;
  updated_at: string;
  user_id: string;
}

export const TicketManagement = () => {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets(data || []);
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

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      cooling_location: "Hűtési helyszínek hiba",
      statistics: "Statisztika hiba",
      animal_records: "Állat nyilvántartás hiba",
      user_issues: "Felhasználói hibák",
      animal_add: "Vad felvétel hiba",
      transport: "Elszállítási hiba",
      hunting_registration: "Vadászati beiratkozás hiba",
      hired_hunters: "Bérvadászok hiba",
      zone_closures: "Körzetek lezárása hiba",
      qr_code: "QR kód hiba",
      subscription: "Előfizetés hiba",
    };
    return labels[category] || category;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="destructive"><Clock className="h-3 w-3 mr-1" />Nyitott</Badge>;
      case "in_progress":
        return <Badge variant="secondary"><MessageSquare className="h-3 w-3 mr-1" />Folyamatban</Badge>;
      case "closed":
        return <Badge variant="outline"><CheckCircle className="h-3 w-3 mr-1" />Lezárt</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setViewDialogOpen(true);
  };

  const filteredTickets = filterStatus === "all" 
    ? tickets 
    : tickets.filter(t => t.status === filterStatus);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Betöltés...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Támogatási jegyek kezelése</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("all")}
              >
                Összes ({tickets.length})
              </Button>
              <Button
                variant={filterStatus === "open" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("open")}
              >
                Nyitott ({tickets.filter(t => t.status === "open").length})
              </Button>
              <Button
                variant={filterStatus === "in_progress" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("in_progress")}
              >
                Folyamatban ({tickets.filter(t => t.status === "in_progress").length})
              </Button>
              <Button
                variant={filterStatus === "closed" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("closed")}
              >
                Lezárt ({tickets.filter(t => t.status === "closed").length})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTickets.length === 0 ? (
            <div className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {filterStatus === "all" ? "Még nincs támogatási jegy" : `Nincs ${filterStatus === "open" ? "nyitott" : filterStatus === "in_progress" ? "folyamatban lévő" : "lezárt"} jegy`}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredTickets.map((ticket) => (
                <Card 
                  key={ticket.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleTicketClick(ticket)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusBadge(ticket.status)}
                          <Badge variant="outline">{getCategoryLabel(ticket.category)}</Badge>
                        </div>
                        <CardTitle className="text-xl mb-1">{ticket.subject}</CardTitle>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {ticket.message}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Létrehozva: {format(new Date(ticket.created_at), "yyyy. MM. dd. HH:mm", { locale: hu })}</span>
                      <Button variant="ghost" size="sm">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Megnyitás
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTicket && (
        <ViewTicketDialog
          ticket={selectedTicket}
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
          isSuperAdmin={true}
          onTicketUpdated={fetchTickets}
        />
      )}
    </>
  );
};
