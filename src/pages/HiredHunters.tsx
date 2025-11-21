import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, AlertCircle, Mail, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSubscription } from "@/hooks/useSubscription";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { HiredHunterRevenuesDialog } from "@/components/HiredHunterRevenuesDialog";
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
  address: string | null;
  notes: string | null;
  expires_at: string | null;
  invited_at: string | null;
  registered_at: string | null;
  is_registered: boolean | null;
  created_at: string;
}

const HiredHunters = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [hunters, setHunters] = useState<HiredHunter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHunter, setEditingHunter] = useState<HiredHunter | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [hunterToDelete, setHunterToDelete] = useState<string | null>(null);
  const [revenueDialogOpen, setRevenueDialogOpen] = useState(false);
  const [selectedHunterForRevenue, setSelectedHunterForRevenue] = useState<{ id: string; name: string } | null>(null);
  const { limits, loading: subscriptionLoading } = useSubscription();
  const [formData, setFormData] = useState({
    name: "",
    license_number: "",
    phone: "",
    email: "",
    address: "",
    expires_at: "",
    notes: "",
  });

  useEffect(() => {
    checkAuth();
    fetchHunters();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const { data: editorRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "editor")
      .maybeSingle();

    setIsAdmin(!!adminRole);
    setIsEditor(!!editorRole);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

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

      const hunterData = {
        name: formData.name,
        license_number: formData.license_number || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        expires_at: formData.expires_at || null,
        notes: formData.notes || null,
      };

      if (editingHunter) {
        const { error } = await supabase
          .from("hired_hunters")
          .update(hunterData)
          .eq("id", editingHunter.id);

        if (error) throw error;
        toast({ title: "Siker!", description: "Bérvadász módosítva!" });
      } else {
        const { error } = await supabase
          .from("hired_hunters")
          .insert({
            ...hunterData,
            user_id: user.id,
          });

        if (error) throw error;
        toast({ title: "Siker!", description: "Bérvadász hozzáadva!" });
      }

      resetForm();
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
      address: hunter.address || "",
      expires_at: hunter.expires_at ? hunter.expires_at.split("T")[0] : "",
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

  const handleSendInvitation = async (hunter: HiredHunter) => {
    if (!hunter.email) {
      toast({
        title: "Hiba",
        description: "Email cím nincs megadva!",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke("send-hired-hunter-invitation", {
        body: { hiredHunterId: hunter.id },
      });

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "Meghívó email elküldve!",
      });

      fetchHunters();
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
      name: "",
      license_number: "",
      phone: "",
      email: "",
      address: "",
      expires_at: "",
      notes: "",
    });
    setEditingHunter(null);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const getStatusBadge = (hunter: HiredHunter) => {
    if (hunter.is_registered) {
      return <Badge variant="default" className="bg-green-600">Regisztrált</Badge>;
    }
    if (hunter.expires_at && new Date(hunter.expires_at) < new Date()) {
      return <Badge variant="destructive">Lejárt</Badge>;
    }
    if (hunter.invited_at) {
      return <Badge variant="secondary">Várakozik</Badge>;
    }
    return <Badge variant="outline">Nincs meghívva</Badge>;
  };

  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Betöltés...</p>
      </div>
    );
  }

  if (!limits.canManageHunters) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader 
          isAdmin={isAdmin}
          isEditor={isEditor}
          onLogout={handleLogout}
        />
        
        <div className="container mx-auto py-6 px-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Nincs hozzáférés</AlertTitle>
            <AlertDescription>
              A bérvadászok kezelése funkció csak Pro előfizetéssel érhető el. Váltson Pro előfizetésre ezen funkció használatához!
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button onClick={() => navigate("/subscriptions")}>
              Előfizetések megtekintése
            </Button>
          </div>
        </div>
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
            <h2 className="text-3xl font-bold text-forest-deep">Bérvadászok</h2>
            <p className="text-muted-foreground">Bérvadászok kezelése</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Új bérvadász
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingHunter ? "Bérvadász módosítása" : "Új bérvadász"}
                </DialogTitle>
                <DialogDescription>
                  Adja meg a bérvadász adatait. Az email és lejárati dátum megadása esetén meghívó küldhető.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                </div>
                
                <div className="grid grid-cols-2 gap-4">
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
                    <Label>Telefonszám</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Pl.: +36301234567"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cím</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Teljes lakcím"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Link lejárati dátuma</Label>
                  <Input
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    A regisztrációs link ezen dátumig lesz érvényes
                  </p>
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

        {loading ? (
          <p>Betöltés...</p>
        ) : hunters.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Még nincs bérvadász a rendszerben.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Név</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Cím</TableHead>
                    <TableHead>Lejárat</TableHead>
                    <TableHead>Státusz</TableHead>
                    <TableHead className="text-right">Műveletek</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hunters.map((hunter) => (
                    <TableRow key={hunter.id}>
                      <TableCell className="font-medium">{hunter.name}</TableCell>
                      <TableCell>{hunter.email || "-"}</TableCell>
                      <TableCell>{hunter.phone || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">{hunter.address || "-"}</TableCell>
                      <TableCell>
                        {hunter.expires_at 
                          ? new Date(hunter.expires_at).toLocaleDateString("hu-HU")
                          : "-"
                        }
                      </TableCell>
                      <TableCell>{getStatusBadge(hunter)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendInvitation(hunter)}
                            disabled={!hunter.email}
                            title={hunter.email ? "Meghívó küldése" : "Email cím nincs megadva"}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedHunterForRevenue({ id: hunter.id, name: hunter.name });
                              setRevenueDialogOpen(true);
                            }}
                            title="Bevételek kezelése"
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

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

        {selectedHunterForRevenue && (
          <HiredHunterRevenuesDialog
            open={revenueDialogOpen}
            onOpenChange={setRevenueDialogOpen}
            hiredHunterId={selectedHunterForRevenue.id}
            hunterName={selectedHunterForRevenue.name}
          />
        )}
      </div>
    </div>
  );
};

export default HiredHunters;
