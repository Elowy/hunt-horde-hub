import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface HiredHunter {
  id: string;
  name: string;
  license_number: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

const HiredHunters = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [hunters, setHunters] = useState<HiredHunter[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHunter, setEditingHunter] = useState<HiredHunter | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [hunterToDelete, setHunterToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    license_number: "",
    phone: "",
    email: "",
    notes: "",
  });

  useEffect(() => {
    fetchHunters();
  }, []);

  const fetchHunters = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("hired_hunters")
        .select("*")
        .order("name");

      if (error) throw error;
      setHunters(data || []);
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

  const handleSubmit = async () => {
    if (!formData.name) {
      toast({
        title: "Hiba",
        description: "A név megadása kötelező!",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingHunter) {
        const { error } = await supabase
          .from("hired_hunters")
          .update({
            name: formData.name,
            license_number: formData.license_number || null,
            phone: formData.phone || null,
            email: formData.email || null,
            notes: formData.notes || null,
          })
          .eq("id", editingHunter.id);

        if (error) throw error;
        toast({ title: "Siker!", description: "Bérvadász módosítva!" });
      } else {
        const { error } = await supabase
          .from("hired_hunters")
          .insert({
            user_id: user.id,
            name: formData.name,
            license_number: formData.license_number || null,
            phone: formData.phone || null,
            email: formData.email || null,
            notes: formData.notes || null,
          });

        if (error) throw error;
        toast({ title: "Siker!", description: "Bérvadász hozzáadva!" });
      }

      setFormData({
        name: "",
        license_number: "",
        phone: "",
        email: "",
        notes: "",
      });
      setEditingHunter(null);
      setDialogOpen(false);
      fetchHunters();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (hunter: HiredHunter) => {
    setEditingHunter(hunter);
    setFormData({
      name: hunter.name,
      license_number: hunter.license_number || "",
      phone: hunter.phone || "",
      email: hunter.email || "",
      notes: hunter.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!hunterToDelete) return;

    try {
      const { error } = await supabase
        .from("hired_hunters")
        .delete()
        .eq("id", hunterToDelete);

      if (error) throw error;

      toast({ title: "Siker!", description: "Bérvadász törölve!" });
      setDeleteDialogOpen(false);
      setHunterToDelete(null);
      fetchHunters();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingHunter(null);
      setFormData({
        name: "",
        license_number: "",
        phone: "",
        email: "",
        notes: "",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="bg-gradient-to-r from-forest-deep to-forest-light text-primary-foreground">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/dashboard")}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Vissza
              </Button>
              <div>
                <h1 className="text-3xl font-bold mb-2">Bérvadászok</h1>
                <p className="text-primary-foreground/90">Bérvadászok kezelése</p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Új bérvadász
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingHunter ? "Bérvadász módosítása" : "Új bérvadász"}
                  </DialogTitle>
                  <DialogDescription>
                    Adja meg a bérvadász adatait.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Név *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Pl.: Kovács János"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vadászjegy száma</Label>
                    <Input
                      value={formData.license_number}
                      onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                      placeholder="Pl.: VJ123456"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefonszám</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Pl.: +36301234567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Pl.: kovacs@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Megjegyzések</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="További információk..."
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleSubmit} className="w-full">
                    {editingHunter ? "Módosítás" : "Hozzáadás"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {loading ? (
          <p>Betöltés...</p>
        ) : hunters.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Még nincs bérvadász a rendszerben.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {hunters.map((hunter) => (
              <Card key={hunter.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{hunter.name}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(hunter)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setHunterToDelete(hunter.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {hunter.license_number && (
                    <div>
                      <strong>Vadászjegy:</strong> {hunter.license_number}
                    </div>
                  )}
                  {hunter.phone && (
                    <div>
                      <strong>Telefon:</strong> {hunter.phone}
                    </div>
                  )}
                  {hunter.email && (
                    <div>
                      <strong>Email:</strong> {hunter.email}
                    </div>
                  )}
                  {hunter.notes && (
                    <div>
                      <strong>Megjegyzés:</strong> {hunter.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Biztosan törli?</AlertDialogTitle>
            <AlertDialogDescription>
              Ez a művelet nem vonható vissza. A bérvadász véglegesen törlésre kerül.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégse</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Törlés</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HiredHunters;
