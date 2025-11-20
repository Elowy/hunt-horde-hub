import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Edit, Trash2, AlertTriangle, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

interface EpidemicMeasure {
  id: string;
  name: string;
  severity: "kozepes" | "magas" | "fertozott" | "szigoruan_korlatozott";
  affected_species: string[];
  shooting_fee: number;
  sampling_fee: number;
  is_active: boolean;
  created_at: string;
}

const SEVERITY_LEVELS = [
  { value: "kozepes", label: "Közepes", color: "bg-yellow-500" },
  { value: "magas", label: "Magas", color: "bg-orange-500" },
  { value: "fertozott", label: "Fertőzött", color: "bg-red-500" },
  { value: "szigoruan_korlatozott", label: "Szigorúan korlátozott terület", color: "bg-purple-500" },
];

const AVAILABLE_SPECIES = [
  "Vaddisznó",
  "Gímszarvas",
  "Dámszarvas",
  "Őz",
  "Muflon",
  "Róka",
  "Borz",
  "Nyúl",
  "Fácán",
  "Fogoly",
];

export const EpidemicMeasuresManager = () => {
  const [measures, setMeasures] = useState<EpidemicMeasure[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMeasure, setEditingMeasure] = useState<EpidemicMeasure | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [measureToDelete, setMeasureToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<{
    name: string;
    severity: "kozepes" | "magas" | "fertozott" | "szigoruan_korlatozott";
    affected_species: string[];
    shooting_fee: number;
    sampling_fee: number;
    is_active: boolean;
  }>({
    name: "",
    severity: "kozepes",
    affected_species: [],
    shooting_fee: 0,
    sampling_fee: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchMeasures();
  }, []);

  const fetchMeasures = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("epidemic_measures")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMeasures(data || []);
    } catch (error) {
      console.error("Error fetching epidemic measures:", error);
      toast.error("Hiba a járványügyi intézkedések betöltésekor");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      severity: "kozepes",
      affected_species: [],
      shooting_fee: 0,
      sampling_fee: 0,
      is_active: true,
    });
    setEditingMeasure(null);
  };

  const handleEdit = (measure: EpidemicMeasure) => {
    setEditingMeasure(measure);
    setFormData({
      name: measure.name,
      severity: measure.severity,
      affected_species: measure.affected_species,
      shooting_fee: measure.shooting_fee,
      sampling_fee: measure.sampling_fee,
      is_active: measure.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name.trim()) {
        toast.error("Az intézkedés neve kötelező!");
        return;
      }

      if (formData.affected_species.length === 0) {
        toast.error("Válasszon ki legalább egy vadfajt!");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nincs bejelentkezve");

      if (editingMeasure) {
        const { error } = await supabase
          .from("epidemic_measures")
          .update(formData)
          .eq("id", editingMeasure.id);

        if (error) throw error;
        toast.success("Járványügyi intézkedés frissítve");
      } else {
        const { error } = await supabase
          .from("epidemic_measures")
          .insert([{
            name: formData.name,
            severity: formData.severity,
            affected_species: formData.affected_species,
            shooting_fee: formData.shooting_fee,
            sampling_fee: formData.sampling_fee,
            is_active: formData.is_active,
            user_id: user.id,
          }]);

        if (error) throw error;
        toast.success("Járványügyi intézkedés létrehozva");
      }

      setDialogOpen(false);
      resetForm();
      fetchMeasures();
    } catch (error) {
      console.error("Error saving epidemic measure:", error);
      toast.error("Hiba a járványügyi intézkedés mentésekor");
    }
  };

  const handleDelete = async () => {
    if (!measureToDelete) return;

    try {
      const { error } = await supabase
        .from("epidemic_measures")
        .delete()
        .eq("id", measureToDelete);

      if (error) throw error;
      toast.success("Járványügyi intézkedés törölve");
      fetchMeasures();
    } catch (error) {
      console.error("Error deleting epidemic measure:", error);
      toast.error("Hiba a járványügyi intézkedés törlésekor");
    } finally {
      setDeleteDialogOpen(false);
      setMeasureToDelete(null);
    }
  };

  const toggleSpecies = (species: string) => {
    setFormData(prev => ({
      ...prev,
      affected_species: prev.affected_species.includes(species)
        ? prev.affected_species.filter(s => s !== species)
        : [...prev.affected_species, species]
    }));
  };

  const getSeverityLabel = (severity: string) => {
    return SEVERITY_LEVELS.find(s => s.value === severity)?.label || severity;
  };

  const getSeverityColor = (severity: string) => {
    return SEVERITY_LEVELS.find(s => s.value === severity)?.color || "bg-gray-500";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Járványügyi intézkedések</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Betöltés...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Járványügyi intézkedések
            </CardTitle>
            <CardDescription>
              Állítson be járványügyi intézkedéseket a területen
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Új intézkedés
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {editingMeasure ? "Intézkedés szerkesztése" : "Új járványügyi intézkedés"}
                </DialogTitle>
                <DialogDescription>
                  Adja meg a járványügyi intézkedés részleteit
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Intézkedés neve *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="pl. Afrikai sertéspestis"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="severity">Súlyossági fok *</Label>
                  <Select 
                    value={formData.severity} 
                    onValueChange={(value: "kozepes" | "magas" | "fertozott" | "szigoruan_korlatozott") => 
                      setFormData({ ...formData, severity: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITY_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${level.color}`} />
                            {level.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Érintett vadfajok *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_SPECIES.map((species) => (
                      <label key={species} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.affected_species.includes(species)}
                          onChange={() => toggleSpecies(species)}
                          className="rounded border-input"
                        />
                        <span className="text-sm">{species}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Az érintett vadfajok darabszámban lesznek számolva ár helyett
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="shooting_fee">Kilövési díj (Ft)</Label>
                    <Input
                      id="shooting_fee"
                      type="number"
                      min="0"
                      value={formData.shooting_fee}
                      onChange={(e) => setFormData({ ...formData, shooting_fee: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sampling_fee">Mintavételi díj (Ft)</Label>
                    <Input
                      id="sampling_fee"
                      type="number"
                      min="0"
                      value={formData.sampling_fee}
                      onChange={(e) => setFormData({ ...formData, sampling_fee: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active">Aktív intézkedés</Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Mégse
                </Button>
                <Button onClick={handleSubmit}>
                  {editingMeasure ? "Mentés" : "Létrehozás"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {measures.length === 0 ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Még nincs beállított járványügyi intézkedés. Hozzon létre egyet az "Új intézkedés" gombbal.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {measures.map((measure) => (
              <Card key={measure.id} className={!measure.is_active ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{measure.name}</h4>
                        <Badge className={`${getSeverityColor(measure.severity)} text-white`}>
                          {getSeverityLabel(measure.severity)}
                        </Badge>
                        {!measure.is_active && (
                          <Badge variant="secondary">Inaktív</Badge>
                        )}
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Érintett vadfajok:</span>{" "}
                          {measure.affected_species.join(", ")}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="font-medium">Kilövési díj:</span>{" "}
                            {measure.shooting_fee.toLocaleString()} Ft
                          </div>
                          <div>
                            <span className="font-medium">Mintavételi díj:</span>{" "}
                            {measure.sampling_fee.toLocaleString()} Ft
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(measure)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setMeasureToDelete(measure.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Biztosan törli?</AlertDialogTitle>
            <AlertDialogDescription>
              Ez a művelet nem vonható vissza. A járványügyi intézkedés véglegesen törlésre kerül.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégse</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Törlés</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
