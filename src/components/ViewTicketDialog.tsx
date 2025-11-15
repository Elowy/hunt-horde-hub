import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Clock, MessageSquare, User, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface Comment {
  id: string;
  ticket_id: string;
  user_id: string;
  comment: string;
  created_at: string;
}

interface ViewTicketDialogProps {
  ticket: Ticket;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSuperAdmin?: boolean;
  onTicketUpdated: () => void;
}

export const ViewTicketDialog = ({ ticket, open, onOpenChange, isSuperAdmin, onTicketUpdated }: ViewTicketDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [status, setStatus] = useState(ticket.status);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    if (open) {
      fetchComments();
      getCurrentUser();
      setStatus(ticket.status);
    }
  }, [open, ticket.id]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("ticket_comments")
        .select("*")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      console.error("Error fetching comments:", error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nincs bejelentkezve");

      const { error } = await supabase.from("ticket_comments").insert({
        ticket_id: ticket.id,
        user_id: user.id,
        comment: newComment.trim(),
      });

      if (error) throw error;

      toast({
        title: "Hozzászólás elküldve!",
        description: "Hozzászólás sikeresen hozzáadva!",
      });

      setNewComment("");
      fetchComments();
      onTicketUpdated();
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

  const handleStatusChange = async (newStatus: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("tickets")
        .update({ 
          status: newStatus as "open" | "in_progress" | "closed",
          closed_at: newStatus === "closed" ? new Date().toISOString() : null,
          closed_by: newStatus === "closed" ? currentUserId : null,
        })
        .eq("id", ticket.id);

      if (error) throw error;

      setStatus(newStatus as "open" | "in_progress" | "closed");
      toast({
        title: "Státusz frissítve!",
        description: "Jegy státusza sikeresen módosítva!",
      });
      onTicketUpdated();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">{ticket.subject}</DialogTitle>
            {isSuperAdmin && (
              <Select value={status} onValueChange={handleStatusChange} disabled={loading}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Nyitott
                    </div>
                  </SelectItem>
                  <SelectItem value="in_progress">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Folyamatban
                    </div>
                  </SelectItem>
                  <SelectItem value="closed">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Lezárt
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogDescription>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">{getCategoryLabel(ticket.category)}</Badge>
              <span className="text-xs text-muted-foreground">
                Létrehozva: {format(new Date(ticket.created_at), "yyyy. MM. dd. HH:mm", { locale: hu })}
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Eredeti üzenet */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">Kezdeti üzenet</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.message}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hozzászólások */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Hozzászólások ({comments.length})</Label>
            <ScrollArea className="h-[200px] w-full rounded-md border p-4">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Még nincs hozzászólás
                </p>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <Card key={comment.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            comment.user_id === ticket.user_id ? 'bg-accent' : 'bg-primary'
                          }`}>
                            <User className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium">
                                {comment.user_id === ticket.user_id ? "Ön" : "Támogatás"}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(comment.created_at), "MM. dd. HH:mm", { locale: hu })}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {comment.comment}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Új hozzászólás - csak ha nem lezárt */}
          {status !== "closed" && (
            <div className="space-y-2">
              <Label htmlFor="comment">Új hozzászólás</Label>
              <Textarea
                id="comment"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Írja be a hozzászólását..."
                rows={3}
              />
              <div className="flex justify-end">
                <Button 
                  onClick={handleAddComment} 
                  disabled={loading || !newComment.trim()}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Hozzászólás küldése
                </Button>
              </div>
            </div>
          )}

          {status === "closed" && (
            <div className="bg-muted p-4 rounded-md text-center">
              <p className="text-sm text-muted-foreground">
                Ez a jegy lezárásra került. Új hozzászólás nem lehetséges.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
