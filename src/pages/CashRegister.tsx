import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, ArrowLeft, Download, Loader2, Plus, Pencil, Wallet } from "lucide-react";
import { toast } from "sonner";

interface CashRegister {
  id: string;
  hunter_society_id: string;
  name: string;
  description: string | null;
  opening_balance: number;
  currency: string;
  is_active: boolean;
}

interface CashEntry {
  id: string;
  cash_register_id: string;
  entry_type: "bevetel" | "kiadas";
  amount: number;
  entry_date: string;
  category: string | null;
  description: string | null;
  reference_number: string | null;
  source_type: string | null;
  source_id: string | null;
  payment_method?: string | null;
  created_at: string;
}

const COMMON_CATEGORIES = [
  "Vad értékesítés",
  "Tagdíj",
  "Üzemanyag",
  "Eszközbeszerzés",
  "Egyéb bevétel",
  "Egyéb kiadás",
];

const fmtHUF = (n: number) =>
  new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 0 }).format(Math.round(n)) + " Ft";

const CashRegisterPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [selectedRegId, setSelectedRegId] = useState<string | null>(null);
  const [entries, setEntries] = useState<CashEntry[]>([]);

  // Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Register dialog
  const [regDialogOpen, setRegDialogOpen] = useState(false);
  const [editingReg, setEditingReg] = useState<CashRegister | null>(null);
  const [regForm, setRegForm] = useState({ name: "", description: "", opening_balance: "0", is_active: true });

  // Entry dialog
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [entryForm, setEntryForm] = useState({
    cash_register_id: "",
    entry_type: "bevetel" as "bevetel" | "kiadas",
    amount: "",
    entry_date: new Date().toISOString().slice(0, 10),
    category: "",
    description: "",
    reference_number: "",
    payment_method: "készpénz",
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
        toast.error("Csak vadásztársaság fiók férhet hozzá a házipénztárhoz.");
        navigate("/dashboard");
        return;
      }
      setSocietyId(profile.id);
      await loadRegisters(profile.id);
      setLoading(false);
    })();
  }, []);

  const loadRegisters = async (sid: string) => {
    const { data, error } = await supabase
      .from("cash_registers")
      .select("*")
      .eq("hunter_society_id", sid)
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Pénztárak betöltése sikertelen");
      return;
    }
    const list = (data || []) as CashRegister[];
    setRegisters(list);
    if (list.length > 0 && !selectedRegId) {
      const firstActive = list.find((r) => r.is_active) || list[0];
      setSelectedRegId(firstActive.id);
    }
  };

  useEffect(() => {
    if (!selectedRegId) {
      setEntries([]);
      return;
    }
    loadEntries(selectedRegId);
  }, [selectedRegId]);

  const loadEntries = async (regId: string) => {
    const { data, error } = await supabase
      .from("cash_entries")
      .select("*")
      .eq("cash_register_id", regId)
      .order("entry_date", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Tételek betöltése sikertelen");
      return;
    }
    setEntries((data || []) as CashEntry[]);
  };

  const selectedReg = registers.find((r) => r.id === selectedRegId) || null;

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (fromDate && e.entry_date < fromDate) return false;
      if (toDate && e.entry_date > toDate) return false;
      if (categoryFilter && (e.category || "") !== categoryFilter) return false;
      return true;
    });
  }, [entries, fromDate, toDate, categoryFilter]);

  const runningById = useMemo(() => {
    const map = new Map<string, number>();
    let bal = Number(selectedReg?.opening_balance || 0);
    for (const e of entries) {
      bal += e.entry_type === "bevetel" ? Number(e.amount) : -Number(e.amount);
      map.set(e.id, bal);
    }
    return map;
  }, [entries, selectedReg]);

  const totalIncome = entries.reduce((s, e) => s + (e.entry_type === "bevetel" ? Number(e.amount) : 0), 0);
  const totalExpense = entries.reduce((s, e) => s + (e.entry_type === "kiadas" ? Number(e.amount) : 0), 0);
  const currentBalance = Number(selectedReg?.opening_balance || 0) + totalIncome - totalExpense;

  const periodIncome = filteredEntries.reduce((s, e) => s + (e.entry_type === "bevetel" ? Number(e.amount) : 0), 0);
  const periodExpense = filteredEntries.reduce((s, e) => s + (e.entry_type === "kiadas" ? Number(e.amount) : 0), 0);

  const allCategories = useMemo(() => {
    const s = new Set<string>();
    entries.forEach((e) => e.category && s.add(e.category));
    return Array.from(s).sort();
  }, [entries]);

  const openNewReg = () => {
    setEditingReg(null);
    setRegForm({ name: "", description: "", opening_balance: "0", is_active: true });
    setRegDialogOpen(true);
  };
  const openEditReg = (r: CashRegister) => {
    setEditingReg(r);
    setRegForm({
      name: r.name,
      description: r.description || "",
      opening_balance: String(r.opening_balance),
      is_active: r.is_active,
    });
    setRegDialogOpen(true);
  };
  const saveRegister = async () => {
    if (!societyId) return;
    if (!regForm.name.trim()) {
      toast.error("A név kötelező");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = {
      name: regForm.name.trim(),
      description: regForm.description.trim() || null,
      opening_balance: Number(regForm.opening_balance) || 0,
      is_active: regForm.is_active,
    };
    if (editingReg) {
      const { error } = await supabase
        .from("cash_registers")
        .update(payload)
        .eq("id", editingReg.id);
      if (error) {
        toast.error("Mentés sikertelen: " + error.message);
        return;
      }
      toast.success("Pénztár frissítve");
    } else {
      const { data, error } = await supabase
        .from("cash_registers")
        .insert({ ...payload, hunter_society_id: societyId, created_by: user.id })
        .select()
        .maybeSingle();
      if (error) {
        toast.error("Mentés sikertelen: " + error.message);
        return;
      }
      toast.success("Pénztár létrehozva");
      if (data) setSelectedRegId((data as CashRegister).id);
    }
    setRegDialogOpen(false);
    await loadRegisters(societyId);
  };

  const openNewEntry = () => {
    if (!selectedRegId) {
      toast.error("Először válassz egy pénztárat");
      return;
    }
    setEntryForm({
      cash_register_id: selectedRegId,
      entry_type: "bevetel",
      amount: "",
      entry_date: new Date().toISOString().slice(0, 10),
      category: "",
      description: "",
      reference_number: "",
      payment_method: "készpénz",
    });
    setEntryDialogOpen(true);
  };
  const saveEntry = async () => {
    if (!societyId) return;
    const amt = Number(entryForm.amount);
    if (!amt || amt <= 0) {
      toast.error("Az összegnek pozitív számnak kell lennie");
      return;
    }
    if (!entryForm.cash_register_id) {
      toast.error("Pénztár kötelező");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const insertData: any = {
      cash_register_id: entryForm.cash_register_id,
      hunter_society_id: societyId,
      entry_type: entryForm.entry_type,
      amount: amt,
      entry_date: entryForm.entry_date,
      category: entryForm.category || null,
      description: entryForm.description || null,
      reference_number: entryForm.reference_number || null,
      source_type: "manual",
      created_by: user.id,
    };

    if (entryForm.entry_type === "bevetel") {
      insertData.payment_method = entryForm.payment_method;
    }

    const { error } = await supabase.from("cash_entries").insert(insertData);
    if (error) {
      toast.error("Mentés sikertelen: " + error.message);
      return;
    }
    toast.success("Tétel rögzítve");
    setEntryDialogOpen(false);
    await loadEntries(entryForm.cash_register_id);
  };

  const exportCSV = () => {
    if (!selectedReg) return;
    const rows = [
      ["Dátum", "Típus", "Jogcím", "Leírás", "Bizonylat", "Bevétel", "Kiadás", "Egyenleg", "Forrás"],
    ];
    const sorted = [...filteredEntries].sort((a, b) =>
      a.entry_date === b.entry_date ? a.created_at.localeCompare(b.created_at) : a.entry_date.localeCompare(b.entry_date)
    );
    for (const e of sorted) {
      rows.push([
        e.entry_date,
        e.entry_type === "bevetel" ? "Bevétel" : "Kiadás",
        e.category || "",
        (e.description || "").replace(/[\r\n;]/g, " "),
        e.reference_number || "",
        e.entry_type === "bevetel" ? String(e.amount) : "",
        e.entry_type === "kiadas" ? String(e.amount) : "",
        String(runningById.get(e.id) ?? ""),
        e.source_type || "",
      ]);
    }
    const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `penztarkonyv_${selectedReg.name}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openSource = async (e: CashEntry) => {
    if (e.source_type === "invoice") navigate("/invoices");
    else if (e.source_type === "membership") navigate("/membership-payments");
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
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Vissza
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6" /> Házipénztár
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={openNewReg}>
              <Plus className="h-4 w-4 mr-2" /> Új pénztár
            </Button>
          </div>
        </div>

        {registers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">Még nincs pénztár. Hozz létre egyet a kezdéshez.</p>
              <Button onClick={openNewReg}>
                <Plus className="h-4 w-4 mr-2" /> Új pénztár létrehozása
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="pt-6 flex items-center gap-3 flex-wrap">
                <Label className="shrink-0">Pénztár:</Label>
                <Select value={selectedRegId || ""} onValueChange={setSelectedRegId}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Válassz pénztárat" />
                  </SelectTrigger>
                  <SelectContent>
                    {registers.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} {!r.is_active && "(inaktív)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedReg && (
                  <Button variant="ghost" size="sm" onClick={() => openEditReg(selectedReg)}>
                    <Pencil className="h-4 w-4 mr-1" /> Szerkesztés
                  </Button>
                )}
                <div className="ml-auto flex gap-2">
                  <Button onClick={openNewEntry}>
                    <Plus className="h-4 w-4 mr-2" /> Új tétel
                  </Button>
                  <Button variant="outline" onClick={exportCSV}>
                    <Download className="h-4 w-4 mr-2" /> Export CSV
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Nyitóegyenleg</CardTitle>
                </CardHeader>
                <CardContent className="text-xl font-semibold">
                  {fmtHUF(Number(selectedReg?.opening_balance || 0))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Összes bevétel</CardTitle>
                </CardHeader>
                <CardContent className="text-xl font-semibold text-green-600 dark:text-green-400">
                  {fmtHUF(totalIncome)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Összes kiadás</CardTitle>
                </CardHeader>
                <CardContent className="text-xl font-semibold text-red-600 dark:text-red-400">
                  {fmtHUF(totalExpense)}
                </CardContent>
              </Card>
              <Card className={currentBalance < 0 ? "border-destructive" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Aktuális egyenleg</CardTitle>
                </CardHeader>
                <CardContent className={`text-xl font-semibold ${currentBalance < 0 ? "text-destructive" : ""}`}>
                  {fmtHUF(currentBalance)}
                </CardContent>
              </Card>
            </div>

            {currentBalance < 0 && (
              <div className="flex items-center gap-2 p-3 rounded-md border border-destructive bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Figyelem: a pénztár egyenlege negatív. Ellenőrizd a tételeket.</span>
              </div>
            )}

            <Card>
              <CardContent className="pt-6 flex gap-3 flex-wrap items-end">
                <div>
                  <Label className="text-xs">Tól</Label>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Ig</Label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Jogcím</Label>
                  <Select value={categoryFilter || "__all__"} onValueChange={(v) => setCategoryFilter(v === "__all__" ? "" : v)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Mind" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Mind</SelectItem>
                      {allCategories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setFromDate(""); setToDate(""); setCategoryFilter(""); }}>
                  Szűrők törlése
                </Button>
                <div className="ml-auto text-sm text-muted-foreground">
                  Időszaki: <span className="text-green-600 dark:text-green-400">+{fmtHUF(periodIncome)}</span>
                  {"  "} / <span className="text-red-600 dark:text-red-400">-{fmtHUF(periodExpense)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dátum</TableHead>
                      <TableHead>Jogcím</TableHead>
                      <TableHead>Leírás</TableHead>
                      <TableHead className="text-right">Bevétel</TableHead>
                      <TableHead className="text-right">Kiadás</TableHead>
                      <TableHead className="text-right">Egyenleg</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nincs megjeleníthető tétel
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredEntries.map((e) => {
                      const isIncome = e.entry_type === "bevetel";
                      const isAuto = e.source_type && e.source_type !== "manual";
                      return (
                        <TableRow key={e.id} className={isIncome ? "bg-green-500/5" : "bg-red-500/5"}>
                          <TableCell className="whitespace-nowrap">{e.entry_date}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {e.category || <span className="text-muted-foreground">—</span>}
                              {isAuto && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs cursor-pointer"
                                  onClick={() => openSource(e)}
                                  title="Forrás megnyitása"
                                >
                                  Auto
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {e.description}
                            {e.reference_number && (
                              <span className="text-xs text-muted-foreground"> · {e.reference_number}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-green-600 dark:text-green-400 whitespace-nowrap">
                            {isIncome ? fmtHUF(Number(e.amount)) : ""}
                          </TableCell>
                          <TableCell className="text-right text-red-600 dark:text-red-400 whitespace-nowrap">
                            {!isIncome ? fmtHUF(Number(e.amount)) : ""}
                          </TableCell>
                          <TableCell className="text-right font-medium whitespace-nowrap">
                            {fmtHUF(runningById.get(e.id) ?? 0)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Dialog open={regDialogOpen} onOpenChange={setRegDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingReg ? "Pénztár szerkesztése" : "Új pénztár"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Név *</Label>
              <Input value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} placeholder="pl. Fő pénztár" />
            </div>
            <div>
              <Label>Leírás</Label>
              <Textarea value={regForm.description} onChange={(e) => setRegForm({ ...regForm, description: e.target.value })} />
            </div>
            <div>
              <Label>Nyitóegyenleg (Ft)</Label>
              <Input
                type="number"
                value={regForm.opening_balance}
                onChange={(e) => setRegForm({ ...regForm, opening_balance: e.target.value })}
                disabled={!!editingReg}
              />
              {editingReg && (
                <p className="text-xs text-muted-foreground mt-1">A nyitóegyenleg utólag nem módosítható.</p>
              )}
            </div>
            {editingReg && (
              <div className="flex items-center gap-2">
                <input
                  id="is_active"
                  type="checkbox"
                  checked={regForm.is_active}
                  onChange={(e) => setRegForm({ ...regForm, is_active: e.target.checked })}
                />
                <Label htmlFor="is_active">Aktív</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRegDialogOpen(false)}>Mégse</Button>
            <Button onClick={saveRegister}>Mentés</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Új pénztári tétel</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Pénztár</Label>
              <Select
                value={entryForm.cash_register_id}
                onValueChange={(v) => setEntryForm({ ...entryForm, cash_register_id: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {registers.filter((r) => r.is_active).map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={entryForm.entry_type === "bevetel" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setEntryForm({ ...entryForm, entry_type: "bevetel" })}
              >
                Bevétel
              </Button>
              <Button
                type="button"
                variant={entryForm.entry_type === "kiadas" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setEntryForm({ ...entryForm, entry_type: "kiadas" })}
              >
                Kiadás
              </Button>
            </div>
            <div>
              <Label>Összeg (Ft) *</Label>
              <Input
                type="number"
                value={entryForm.amount}
                onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })}
              />
            </div>
            <div>
              <Label>Dátum</Label>
              <Input
                type="date"
                value={entryForm.entry_date}
                onChange={(e) => setEntryForm({ ...entryForm, entry_date: e.target.value })}
              />
            </div>
            {entryForm.entry_type === "bevetel" && (
              <div>
                <Label>Fizetési mód</Label>
                <Select
                  value={entryForm.payment_method}
                  onValueChange={(v) => setEntryForm({ ...entryForm, payment_method: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="készpénz">Készpénz</SelectItem>
                    <SelectItem value="átutalás">Átutalás</SelectItem>
                    <SelectItem value="bankkártya">Bankkártya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Jogcím</Label>
              <Select
                value={entryForm.category || "__none__"}
                onValueChange={(v) => setEntryForm({ ...entryForm, category: v === "__none__" ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="Válassz vagy gépelj alatta" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nincs —</SelectItem>
                  {COMMON_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="mt-2"
                placeholder="vagy egyedi jogcím"
                value={COMMON_CATEGORIES.includes(entryForm.category) ? "" : entryForm.category}
                onChange={(e) => setEntryForm({ ...entryForm, category: e.target.value })}
              />
            </div>
            <div>
              <Label>Leírás</Label>
              <Textarea
                value={entryForm.description}
                onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Bizonylatszám</Label>
              <Input
                value={entryForm.reference_number}
                onChange={(e) => setEntryForm({ ...entryForm, reference_number: e.target.value })}
                placeholder="opcionális (kézi most)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEntryDialogOpen(false)}>Mégse</Button>
            <Button onClick={saveEntry}>Mentés</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CashRegisterPage;
