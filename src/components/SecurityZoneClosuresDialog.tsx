import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ban, Plus, Pencil, Trash2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SecurityZone {
  id: string;
  name: string;
  settlements: {
    name: string;
  } | null;
}

interface ZoneClosure {
  id: string;
  security_zone_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  security_zones: {
    name: string;
    settlements: {
      name: string;
    } | null;
  };
}

export const SecurityZoneClosuresDialog = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [zones, setZones] = useState<SecurityZone[]>([]);
  const [closures, setClosures] = useState<ZoneClosure[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingClosure, setEditingClosure] = useState<ZoneClosure | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    security_zone_id: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: format(new Date(), "yyyy-MM-dd"),
    reason: "",
  });

  useEffect(() => {
    if (open) {
      fetchZones();
      fetchClosures();
    }
  }, [open]);

  const fetchZones = async () => {
    try {
      const { data, error } = await supabase
        .from("security_zones")
        .select("id, name, settlements(name)")
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

  const fetchClosures = async () => {
    try {
      const { data, error } = await supabase
        .from("security_zone_closures")
        .select(`
          *,
          security_zones (
            name,
            settlements (name)
          )
        `)
        .order("start_date", { ascending: false });

      if (error) throw error;
      setClosures(data || []);
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      security_zone_id: "",
      start_date: format(new Date(), "yyyy-MM-dd"),
      end_date: format(new Date(), "yyyy-MM-dd"),
      reason: "",
    });
    setEditingClosure(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.security_zone_id || !formData.reason.trim()) {
      toast({
        title: "Hiba",
        description: "Kötelező mezők kitöltése szükséges!",
        variant: "destructive",
      });
      return;
    }

    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);

    if (endDate <= startDate) {
      toast({
        title: "Hiba",
        description: "A befejezés dátuma későbbi kell legyen a kezdésnél!",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nincs bejelentkezve!");

      const closureData = {
        security_zone_id: formData.security_zone_id,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        reason: formData.reason,
        user_id: user.id,
      };

      if (editingClosure) {
        const { error } = await supabase
          .from("security_zone_closures")
          .update(closureData)
          .eq("id", editingClosure.id);

        if (error) throw error;
        toast({ title: "Siker!", description: "Lezárás módosítva!" });
      } else {
        const { error } = await supabase
          .from("security_zone_closures")
          .insert(closureData);

        if (error) throw error;
        toast({ title: "Siker!", description: "Lezárás hozzáadva!" });
      }

      resetForm();
      fetchClosures();
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

  const handleEdit = (closure: ZoneClosure) => {
    setEditingClosure(closure);
    setFormData({
      security_zone_id: closure.security_zone_id,
      start_date: format(new Date(closure.start_date), "yyyy-MM-dd"),
      end_date: format(new Date(closure.end_date), "yyyy-MM-dd"),
      reason: closure.reason,
    });
    setShowAddForm(true);
  };

  const handleDelete = async (closureId: string) => {
    if (!confirm("Biztosan törli ezt a lezárást?")) return;

    try {
      const { error } = await supabase
        .from("security_zone_closures")
        .delete()
        .eq("id", closureId);

      if (error) throw error;
      toast({ title: "Siker!", description: "Lezárás törölve!" });
      fetchClosures();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const isActive = (closure: ZoneClosure) => {
    const now = new Date();
    const start = new Date(closure.start_date);
    const end = new Date(closure.end_date);
    return now >= start && now <= end;
  };

  const activeClosures = closures.filter(isActive);
  const upcomingClosures = closures.filter(c => new Date(c.start_date) > new Date());
  const pastClosures = closures.filter(c => new Date(c.end_date) < new Date());

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start">
          <Ban className="mr-2 h-4 w-4" />
          Körzetek lezárása
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Beírókörzetek időszakos lezárása</DialogTitle>
          <DialogDescription>
            Körzetek átmeneti lezárása vadászat alól indoklással
          </DialogDescription>
        </DialogHeader>

        {activeClosures.length > 0 && (
          <Alert className="border-orange-500/50 bg-orange-500/10">
            <Ban className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertDescription className="text-orange-600 dark:text-orange-400">
              Jelenleg {activeClosures.length} körzet van lezárva vadászat alól.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {!showAddForm ? (
            <Button onClick={() => setShowAddForm(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Új lezárás hozzáadása
            </Button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4">
              <h3 className="font-medium">
                {editingClosure ? "Lezárás szerkesztése" : "Új lezárás"}
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="security_zone_id">Beírókörzet *</Label>
                <Select
                  value={formData.security_zone_id}
                  onValueChange={(value) => setFormData({ ...formData, security_zone_id: value })}
                >
                  <SelectTrigger id="security_zone_id">
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
                  <Label htmlFor="start_date">Lezárás kezdete *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Lezárás vége *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Indoklás *</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Pl. Szaporodási időszak, zárt időszak, regeneráció, stb."
                  rows={3}
                  required
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Mégse
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Mentés..." : editingClosure ? "Módosítás" : "Hozzáadás"}
                </Button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            <h3 className="font-medium">Aktív lezárások</h3>
            {activeClosures.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Jelenleg nincs aktív lezárás
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Körzet</TableHead>
                    <TableHead>Időszak</TableHead>
                    <TableHead>Indoklás</TableHead>
                    <TableHead className="text-right">Műveletek</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeClosures.map((closure) => (
                    <TableRow key={closure.id}>
                      <TableCell>
                        {closure.security_zones.settlements?.name
                          ? `${closure.security_zones.settlements.name} - ${closure.security_zones.name}`
                          : closure.security_zones.name}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(closure.start_date), "yyyy. MM. dd.", { locale: hu })}
                          {" - "}
                          {format(new Date(closure.end_date), "yyyy. MM. dd.", { locale: hu })}
                        </div>
                      </TableCell>
                      <TableCell>{closure.reason}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(closure)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(closure.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {upcomingClosures.length > 0 && (
              <>
                <h3 className="font-medium mt-6">Jövőbeli lezárások</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Körzet</TableHead>
                      <TableHead>Időszak</TableHead>
                      <TableHead>Indoklás</TableHead>
                      <TableHead className="text-right">Műveletek</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingClosures.map((closure) => (
                      <TableRow key={closure.id}>
                        <TableCell>
                          {closure.security_zones.settlements?.name
                            ? `${closure.security_zones.settlements.name} - ${closure.security_zones.name}`
                            : closure.security_zones.name}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(closure.start_date), "yyyy. MM. dd.", { locale: hu })}
                            {" - "}
                            {format(new Date(closure.end_date), "yyyy. MM. dd.", { locale: hu })}
                          </div>
                        </TableCell>
                        <TableCell>{closure.reason}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(closure)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(closure.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}

            {pastClosures.length > 0 && (
              <>
                <h3 className="font-medium mt-6">Lejárt lezárások</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Körzet</TableHead>
                      <TableHead>Időszak</TableHead>
                      <TableHead>Indoklás</TableHead>
                      <TableHead className="text-right">Műveletek</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastClosures.slice(0, 5).map((closure) => (
                      <TableRow key={closure.id} className="opacity-60">
                        <TableCell>
                          {closure.security_zones.settlements?.name
                            ? `${closure.security_zones.settlements.name} - ${closure.security_zones.name}`
                            : closure.security_zones.name}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(closure.start_date), "yyyy. MM. dd.", { locale: hu })}
                            {" - "}
                            {format(new Date(closure.end_date), "yyyy. MM. dd.", { locale: hu })}
                          </div>
                        </TableCell>
                        <TableCell>{closure.reason}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(closure.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
