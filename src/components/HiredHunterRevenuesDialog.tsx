import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";

interface Revenue {
  id: string;
  amount: number;
  description: string | null;
  revenue_date: string;
  created_at: string;
}

interface HiredHunterRevenuesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hiredHunterId: string;
  hunterName: string;
}

export function HiredHunterRevenuesDialog({ 
  open, 
  onOpenChange, 
  hiredHunterId,
  hunterName 
}: HiredHunterRevenuesDialogProps) {
  const { toast } = useToast();
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    revenue_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (open) {
      fetchRevenues();
    }
  }, [open]);

  const fetchRevenues = async () => {
    try {
      const { data, error } = await supabase
        .from("hired_hunter_revenues")
        .select("*")
        .eq("hired_hunter_id", hiredHunterId)
        .order("revenue_date", { ascending: false });

      if (error) throw error;
      setRevenues(data || []);
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddRevenue = async () => {
    if (!formData.amount) {
      toast({
        title: "Hiba",
        description: "Az összeg megadása kötelező!",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nincs bejelentkezve");

      const { error } = await supabase
        .from("hired_hunter_revenues")
        .insert({
          hired_hunter_id: hiredHunterId,
          amount: parseFloat(formData.amount),
          description: formData.description || null,
          revenue_date: formData.revenue_date,
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: "Siker",
        description: "Bevétel hozzáadva!",
      });

      setFormData({
        amount: "",
        description: "",
        revenue_date: new Date().toISOString().split("T")[0],
      });

      fetchRevenues();
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

  const handleDeleteRevenue = async (id: string) => {
    try {
      const { error } = await supabase
        .from("hired_hunter_revenues")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Siker",
        description: "Bevétel törölve!",
      });

      fetchRevenues();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const totalRevenue = revenues.reduce((sum, r) => sum + r.amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bevételek - {hunterName}</DialogTitle>
          <DialogDescription>
            Bérvadász bevételeinek kezelése
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-medium">Új bevétel hozzáadása</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Összeg (Ft) *</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Dátum *</Label>
                <Input
                  type="date"
                  value={formData.revenue_date}
                  onChange={(e) => setFormData({ ...formData, revenue_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Leírás</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Bevétel leírása..."
                rows={2}
              />
            </div>
            <Button onClick={handleAddRevenue} disabled={loading}>
              <Plus className="h-4 w-4 mr-2" />
              Hozzáadás
            </Button>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Bevételek listája</h3>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Összesen:</p>
                <p className="text-xl font-bold text-primary">
                  {totalRevenue.toLocaleString("hu-HU")} Ft
                </p>
              </div>
            </div>

            {revenues.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Még nincs bevétel rögzítve
              </p>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dátum</TableHead>
                      <TableHead>Összeg</TableHead>
                      <TableHead>Leírás</TableHead>
                      <TableHead className="text-right">Műveletek</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revenues.map((revenue) => (
                      <TableRow key={revenue.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(revenue.revenue_date), "PPP", { locale: hu })}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {revenue.amount.toLocaleString("hu-HU")} Ft
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {revenue.description || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteRevenue(revenue.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
