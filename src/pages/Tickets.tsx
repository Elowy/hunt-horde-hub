import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { Plus, MessageSquare, Clock, CheckCircle, XCircle } from "lucide-react";
import { CreateTicketDialog } from "@/components/CreateTicketDialog";
import { ViewTicketDialog } from "@/components/ViewTicketDialog";
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

const Tickets = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [isHunter, setIsHunter] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchTickets();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roles) {
      setIsAdmin(roles.some(r => r.role === "admin"));
      setIsEditor(roles.some(r => r.role === "editor"));
      setIsHunter(roles.some(r => r.role === "hunter"));
      setIsSuperAdmin(roles.some(r => r.role === "super_admin"));
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("tickets")
        .select("*");

      // Super adminok minden ticketet látnak, mások csak a sajátjukat
      if (!isSuperAdmin) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
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
        isAdmin={isAdmin}
        isEditor={isEditor}
        onLogout={handleLogout}
      />
      
      <div className="container mx-auto py-6 px-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-forest-deep">Támogatási jegyek</h2>
            <p className="text-muted-foreground">
              {isSuperAdmin ? "Összes támogatási jegy kezelése" : "Támogatási kérések és hibajegyek"}
            </p>
          </div>
          <CreateTicketDialog 
            onTicketCreated={fetchTickets}
            isHunter={isHunter}
            isAdmin={isAdmin}
            isEditor={isEditor}
          />
        </div>

        {tickets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">Még nincs támogatási jegy</p>
              <CreateTicketDialog 
                onTicketCreated={fetchTickets}
                isHunter={isHunter}
                isAdmin={isAdmin}
                isEditor={isEditor}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {tickets.map((ticket) => (
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
                      <CardDescription className="line-clamp-2">
                        {ticket.message}
                      </CardDescription>
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
      </div>

      {selectedTicket && (
        <ViewTicketDialog
          ticket={selectedTicket}
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
          isSuperAdmin={isSuperAdmin}
          onTicketUpdated={fetchTickets}
        />
      )}
    </div>
  );
};

export default Tickets;
