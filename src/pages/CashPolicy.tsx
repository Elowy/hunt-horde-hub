import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

interface CashPolicy {
  id?: string;
  hunter_society_id: string;
  max_cash_balance: string;
  closing_cycle: "napi" | "heti" | "havi";
  require_signature: boolean;
  digital_only: boolean;
  retention_years: number;
}

interface CashCategory {
  id: string;
  hunter_society_id: string;
  code: string;
  name: string;
  direction: "bevetel" | "kiadas" | "mindketto";
  is_active: boolean;
}

const CashPolicyPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [policy, setPolicy] = useState<CashPolicy>({
    hunter_society_id: "",
    max_cash_balance: "",
    closing_cycle: "napi",
    require_signature: false,
    digital_only: true,
    retention_years: 8,
  });
  const [policyId, setPolicyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState<CashCategory[]>([]);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<CashCategory | null>(null);
  const [catForm, setCatForm] = useState({
    code: "",
    name: "",
    direction: "mindketto" as CashCategory["direction"],
    is_active: true,
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, user_type")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile || profile.user_type !== "hunter_society") {
        toast.error("Csak vadásztársaság fiók férhet hozzá.");
        navigate("/dashboard");
        return;
      }
      setSocietyId(profile.id);
      await loadAll(profile.id);
      setLoading(false);
    })();
  }, []);

  const loadAll = async (sid: string) => {
    const [{ data: pol }, { data: cats }] = await Promise.all([
      supabase
        .from("cash_policy")
        .select("*")
        .eq("hunter_society_id", sid)
        .is("cash_register_id", null)
        .maybeSingle(),
      supabase
        .from("cash_categories")
        .select("*")
        .eq("hunter_society_id", sid)
        .order("code", { ascending: true }),
    ]);
    if (pol) {
      setPolicyId(pol.id);
      setPolicy({
        hunter_society_id: sid,
        max_cash_balance: pol.max_cash_balance != null ? String(pol.max_cash_balance) : "",
        closing_cycle: pol.closing_cycle as any,
        require_signature: pol.require_signature,
        digital_only: pol.digital_only,
        retention_years: pol.retention_years,
      });
    } else {
      setPolicy((p) => ({ ...p, hunter_society_id: sid }));
    }
    setCategories((cats || []) as CashCategory[]);
  };

  const savePolicy = async () => {
    if (!societyId) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      hunter_society_id: societyId,
      cash_register_id: null,
      max_cash_balance: policy.max_cash_balance ? Number(policy.max_cash_balance) : null,
      closing_cycle: policy.closing_cycle,
      require_signature: policy.require_signature,
      digital_only: policy.digital_only,
      retention_years: Math.max(8, Number(policy.retention_years) || 8),
      updated_by: user?.id,
    };
    let error;
    if (policyId) {
      ({ error } = await supabase.from("cash_policy").update(payload).eq("id", policyId));
    } else {
      const res = await supabase.from("cash_policy").insert(payload).select().maybeSingle();
      error = res.error;
      if (res.data) setPolicyId((res.data as any).id);
    }
    setSaving(false);
    if (error) {
      toast.error("Mentés sikertelen: " + error.message);
      return;
    }
    toast.success("Szabályzat mentve");
  };

  const openNewCat = () => {
    setEditingCat(null);
    setCatForm({ code: "", name: "", direction: "mindketto", is_active: true });
    setCatDialogOpen(true);
  };
  const openEditCat = (c: CashCategory) => {
    setEditingCat(c);
    setCatForm({ code: c.code, name: c.name, direction: c.direction, is_active: c.is_active });
    setCatDialogOpen(true);
  };
  const saveCat = async () => {
    if (!societyId) return;
    if (!catForm.code.trim() || !catForm.name.trim()) {
      toast.error("A kód és a név kötelező");
      return;
    }
    const payload = {
      hunter_society_id: societyId,
      code: catForm.code.trim(),
      name: catForm.name.trim(),
      direction: catForm.direction,
      is_active: catForm.is_active,
    };
    let error;
    if (editingCat) {
      ({ error } = await supabase.from("cash_categories").update(payload).eq("id", editingCat.id));
    } else {
      ({ error } = await supabase.from("cash_categories").insert(payload));
    }
    if (error) {
      toast.error("Mentés sikertelen: " + error.message);
      return;
    }
    toast.success("Jogcím mentve");
    setCatDialogOpen(false);
    await loadAll(societyId);
  };
  const toggleCatActive = async (c: CashCategory) => {
    const { error } = await supabase
      .from("cash_categories")
      .update({ is_active: !c.is_active })
      .eq("id", c.id);
    if (error) toast.error(error.message);
    else if (societyId) await loadAll(societyId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate("/cash-register")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Vissza a házipénztárhoz
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pénzkezelési szabályzat</CardTitle>
            <CardDescription>
              Ezeket az értékeket a társaság könyvelőjével kell véglegesíteni és a pénzkezelési
              szabályzatban rögzíteni. A rendszer csak ezeket a paramétereket használja —
              nincs hardkódolt szabályzati érték.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Pénztári maximum (Ft)</Label>
                <Input
                  type="number"
                  value={policy.max_cash_balance}
                  onChange={(e) => setPolicy({ ...policy, max_cash_balance: e.target.value })}
                  placeholder="pl. 1500000"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Üresen hagyva nincs felső korlát figyelmeztetés.
                </p>
              </div>
              <div>
                <Label>Zárási ciklus</Label>
                <Select
                  value={policy.closing_cycle}
                  onValueChange={(v) => setPolicy({ ...policy, closing_cycle: v as any })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="napi">Napi</SelectItem>
                    <SelectItem value="heti">Heti</SelectItem>
                    <SelectItem value="havi">Havi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Retenciós évek (min. 8)</Label>
                <Input
                  type="number"
                  min={8}
                  value={policy.retention_years}
                  onChange={(e) => setPolicy({ ...policy, retention_years: Number(e.target.value) || 8 })}
                />
              </div>
              <div className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <Label className="text-base">Kézi aláírás kell</Label>
                  <p className="text-xs text-muted-foreground">
                    A nyomtatott bizonylatot kézzel aláíratja a pénztáros/befizető.
                  </p>
                </div>
                <Switch
                  checked={policy.require_signature}
                  onCheckedChange={(c) => setPolicy({ ...policy, require_signature: c })}
                />
              </div>
              <div className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <Label className="text-base">Csak digitális bizonylat</Label>
                  <p className="text-xs text-muted-foreground">
                    Nincs nyomtatott példány; csak elektronikus tárolás.
                  </p>
                </div>
                <Switch
                  checked={policy.digital_only}
                  onCheckedChange={(c) => setPolicy({ ...policy, digital_only: c })}
                />
              </div>
            </div>
            <div>
              <Button onClick={savePolicy} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Szabályzat mentése
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Jogcímtár</CardTitle>
              <CardDescription>
                A pénztári tételekhez használható jogcímek. Új tételnél csak innen lehet választani.
              </CardDescription>
            </div>
            <Button onClick={openNewCat}><Plus className="h-4 w-4 mr-2" />Új jogcím</Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kód</TableHead>
                  <TableHead>Név</TableHead>
                  <TableHead>Irány</TableHead>
                  <TableHead>Állapot</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      Még nincs jogcím. Hozz létre legalább egyet a bizonylat-rögzítéshez.
                    </TableCell>
                  </TableRow>
                )}
                {categories.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.code}</TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>
                      {c.direction === "bevetel" ? "Bevétel"
                        : c.direction === "kiadas" ? "Kiadás" : "Mindkettő"}
                    </TableCell>
                    <TableCell>
                      {c.is_active
                        ? <Badge variant="secondary">Aktív</Badge>
                        : <Badge variant="outline">Inaktív</Badge>}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="ghost" onClick={() => openEditCat(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleCatActive(c)}>
                        {c.is_active ? "Inaktivál" : "Aktivál"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCat ? "Jogcím szerkesztése" : "Új jogcím"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Kód *</Label>
              <Input value={catForm.code} onChange={(e) => setCatForm({ ...catForm, code: e.target.value })} placeholder="pl. VAD-ERT" />
            </div>
            <div>
              <Label>Név *</Label>
              <Input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="pl. Vad értékesítés" />
            </div>
            <div>
              <Label>Irány *</Label>
              <Select value={catForm.direction} onValueChange={(v) => setCatForm({ ...catForm, direction: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bevetel">Bevétel</SelectItem>
                  <SelectItem value="kiadas">Kiadás</SelectItem>
                  <SelectItem value="mindketto">Mindkettő</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Aktív</Label>
              <Switch checked={catForm.is_active} onCheckedChange={(c) => setCatForm({ ...catForm, is_active: c })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCatDialogOpen(false)}>Mégse</Button>
            <Button onClick={saveCat}>Mentés</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CashPolicyPage;
