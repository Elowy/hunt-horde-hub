import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ViewTicketDialog } from "./ViewTicketDialog";
import { CreateTicketDialog } from "./CreateTicketDialog";
import { MessageSquare, Clock, CheckCircle, Ticket as TicketIcon } from "lucide-react";
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

interface UserTicketsProps {
  isHunter?: boolean;
  isAdmin?: boolean;
  isEditor?: boolean;
}

export const UserTickets = ({ isHunter, isAdmin, isEditor }: UserTicketsProps) => {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("user_id", user.id)
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
      cooling_location: "Hűtési helyszínek",
      statistics: "Statisztika",
      animal_records: "Állat nyilvántartás",
      user_issues: "Felhasználói hibák",
      animal_add: "Vad felvétel",
      transport: "Elszállítás",
      hunting_registration: "Vadászati beiratkozás",
      hired_hunters: "Bérvadászok",
      zone_closures: "Körzetek lezárása",
      qr_code: "QR kód",
      subscription: "Előfizetés",
    };
    return labels[category] || category;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Nyitott
          </Badge>
        );
      case "in_progress":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            Folyamatban
          </Badge>
        );
      case "closed":
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Lezárt
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setViewDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TicketIcon className="h-5 w-5" />
            Támogatási jegyeim
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Betöltés...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TicketIcon className="h-5 w-5" />
                Támogatási jegyeim
              </CardTitle>
              <CardDescription>
                A beküldött támogatási kéréseim és állapotuk
              </CardDescription>
            </div>
            <CreateTicketDialog 
              onTicketCreated={fetchTickets}
              isHunter={isHunter}
              isAdmin={isAdmin}
              isEditor={isEditor}
            />
          </div>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TicketIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Még nincs támogatási jegye.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => handleTicketClick(ticket)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold truncate">{ticket.subject}</h3>
                        {getStatusBadge(ticket.status)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {getCategoryLabel(ticket.category)}
                        </Badge>
                        <span>•</span>
                        <span>
                          {format(new Date(ticket.created_at), "yyyy. MMM dd. HH:mm", {
                            locale: hu,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
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
          onTicketUpdated={fetchTickets}
        />
      )}
    </>
  );
};
