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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertTriangle, ArrowLeft, Download, Loader2, Plus, Pencil, Trash2, Wallet, Settings, FileCheck, Eye } from "lucide-react";
import { toast } from "sonner";
import { numberToHungarianWords } from "@/lib/numberToHungarianWords";

interface CashRegister {
  id: string;
  hunter_society_id: string;
  name: string;
  description: string | null;
  opening_balance: number;
  currency: string;
  is_active: boolean;
  register_code: string;
}

interface SequenceGap {
  cash_register_id: string;
  document_type: string;
  seq_year: number;
  seq_number: number;
  next_number: number;
}

interface CashCategory {
  id: string;
  code: string;
  name: string;
  direction: "bevetel" | "kiadas" | "mindketto";
  is_active: boolean;
}

interface CashEntry {
  id: string;
  cash_register_id: string;
  entry_type: "bevetel" | "kiadas";
  amount: number;
  entry_date: string;
  event_date: string | null;
  category: string | null;
  description: string | null;
  reference_number: string | null;
  source_type: string | null;
  source_id: string | null;
  document_type: string;
  status: "piszkozat" | "veglegesitett" | "rontott" | "stornozott" | "helyesbitett";
  amount_in_words: string | null;
  partner_name: string | null;
  partner_tax_id: string | null;
  ordered_by: string | null;
  related_document_ref: string | null;
  booking_ref: string | null;
  issued_at: string | null;
  created_at: string;
  document_number: string | null;
  seq_year: number | null;
  seq_number: number | null;
}

const fmtHUF = (n: number) =>
  new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 0 }).format(Math.round(n)) + " Ft";

const STATUS_LABEL: Record<CashEntry["status"], string> = {
  piszkozat: "Piszkozat",
  veglegesitett: "Véglegesített",
  rontott: "Rontott",
  stornozott: "Stornózott",
  helyesbitett: "Helyesbített",
};

const emptyEntryForm = (regId: string) => ({
  id: null as string | null,
  cash_register_id: regId,
  entry_type: "bevetel" as "bevetel" | "kiadas",
  amount: "",
  event_date: new Date().toISOString().slice(0, 10),
  category: "",
  description: "",
  reference_number: "",
  partner_name: "",
  partner_tax_id: "",
  ordered_by: "",
  related_document_ref: "",
  booking_ref: "",
});

const CashRegisterPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [selectedRegId, setSelectedRegId] = useState<string | null>(null);
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [categories, setCategories] = useState<CashCategory[]>([]);

  // Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Register dialog
  const [regDialogOpen, setRegDialogOpen] = useState(false);
  const [editingReg, setEditingReg] = useState<CashRegister | null>(null);
  const [regForm, setRegForm] = useState({ name: "", description: "", opening_balance: "0", is_active: true, register_code: "" });
  const [regCodeLocked, setRegCodeLocked] = useState(false);
  const [gaps, setGaps] = useState<SequenceGap[]>([]);

  // Entry dialog
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [entryForm, setEntryForm] = useState(emptyEntryForm(""));
  const [confirmFinalizeOpen, setConfirmFinalizeOpen] = useState(false);
  const [viewEntry, setViewEntry] = useState<CashEntry | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      const { data: profile } = await supabase
        .from("profiles").select("id, user_type").eq("id", user.id).maybeSingle();
      if (!profile || profile.user_type !== "hunter_society") {
        toast.error("Csak vadásztársaság fiók férhet hozzá.");
        navigate("/dashboard");
        return;
      }
      setSocietyId(profile.id);
      await loadRegisters(profile.id);
      await loadCategories(profile.id);
      setLoading(false);
    })();
  }, []);

  const loadRegisters = async (sid: string) => {
    const { data, error } = await supabase
      .from("cash_registers").select("*")
      .eq("hunter_society_id", sid).order("created_at", { ascending: true });
    if (error) { toast.error("Pénztárak betöltése sikertelen"); return; }
    const list = (data || []) as CashRegister[];
    setRegisters(list);
    if (list.length > 0 && !selectedRegId) {
      const firstActive = list.find((r) => r.is_active) || list[0];
      setSelectedRegId(firstActive.id);
    }
  };
  const loadCategories = async (sid: string) => {
    const { data } = await supabase
      .from("cash_categories").select("id, code, name, direction, is_active")
      .eq("hunter_society_id", sid).eq("is_active", true).order("name", { ascending: true });
    setCategories((data || []) as CashCategory[]);
  };

  useEffect(() => {
    if (!selectedRegId) { setEntries([]); return; }
    loadEntries(selectedRegId);
  }, [selectedRegId]);

  const loadEntries = async (regId: string) => {
    const { data, error } = await supabase
      .from("cash_entries").select("*")
      .eq("cash_register_id", regId)
      .order("event_date", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true });
    if (error) { toast.error("Tételek betöltése sikertelen"); return; }
    setEntries((data || []) as any as CashEntry[]);
  };

  const selectedReg = registers.find((r) => r.id === selectedRegId) || null;

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const d = e.event_date || e.entry_date;
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      if (categoryFilter && (e.category || "") !== categoryFilter) return false;
      if (statusFilter && e.status !== statusFilter) return false;
      return true;
    });
  }, [entries, fromDate, toDate, categoryFilter, statusFilter]);

  // Running balance: count only véglegesített entries (piszkozat doesn't move money yet)
  const runningById = useMemo(() => {
    const map = new Map<string, number>();
    let bal = Number(selectedReg?.opening_balance || 0);
    for (const e of entries) {
      if (e.status === "veglegesitett") {
        bal += e.entry_type === "bevetel" ? Number(e.amount) : -Number(e.amount);
      }
      map.set(e.id, bal);
    }
    return map;
  }, [entries, selectedReg]);

  const finalized = entries.filter((e) => e.status === "veglegesitett");
  const totalIncome = finalized.reduce((s, e) => s + (e.entry_type === "bevetel" ? Number(e.amount) : 0), 0);
  const totalExpense = finalized.reduce((s, e) => s + (e.entry_type === "kiadas" ? Number(e.amount) : 0), 0);
  const currentBalance = Number(selectedReg?.opening_balance || 0) + totalIncome - totalExpense;
  const draftCount = entries.filter((e) => e.status === "piszkozat").length;

  const openNewReg = () => {
    setEditingReg(null);
    // Suggest next register code (KP01, KP02, ...)
    const usedCodes = new Set(registers.map((r) => r.register_code));
    let suggested = "";
    for (let i = 1; i <= 99; i++) {
      const c = "KP" + String(i).padStart(2, "0");
      if (!usedCodes.has(c)) { suggested = c; break; }
    }
    setRegForm({ name: "", description: "", opening_balance: "0", is_active: true, register_code: suggested });
    setRegCodeLocked(false);
    setRegDialogOpen(true);
  };
  const openEditReg = async (r: CashRegister) => {
    setEditingReg(r);
    setRegForm({ name: r.name, description: r.description || "",
      opening_balance: String(r.opening_balance), is_active: r.is_active, register_code: r.register_code });
    // Lock code if register already has any entries
    const { count } = await supabase.from("cash_entries").select("*", { count: "exact", head: true })
      .eq("cash_register_id", r.id);
    setRegCodeLocked((count || 0) > 0);
    setRegDialogOpen(true);
  };
  const saveRegister = async () => {
    if (!societyId) return;
    if (!regForm.name.trim()) { toast.error("A név kötelező"); return; }
    if (!regForm.register_code.trim()) { toast.error("A pénztárkód kötelező (pl. KP01)"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = {
      name: regForm.name.trim(),
      description: regForm.description.trim() || null,
      opening_balance: Number(regForm.opening_balance) || 0,
      is_active: regForm.is_active,
      register_code: regForm.register_code.trim().toUpperCase(),
    };
    if (editingReg) {
      const updatePayload = regCodeLocked
        ? { ...payload, register_code: editingReg.register_code }
        : payload;
      const { error } = await supabase.from("cash_registers").update(updatePayload).eq("id", editingReg.id);
      if (error) { toast.error("Mentés sikertelen: " + error.message); return; }
      toast.success("Pénztár frissítve");
    } else {
      const { data, error } = await supabase
        .from("cash_registers")
        .insert({ ...payload, hunter_society_id: societyId, created_by: user.id })
        .select().maybeSingle();
      if (error) { toast.error("Mentés sikertelen: " + error.message); return; }
      toast.success("Pénztár létrehozva");
      if (data) setSelectedRegId((data as CashRegister).id);
    }
    setRegDialogOpen(false);
    await loadRegisters(societyId);
  };

  const openNewEntry = () => {
    if (!selectedRegId) { toast.error("Először válassz egy pénztárat"); return; }
    if (categories.length === 0) {
      toast.error("Hozz létre legalább egy jogcímet a Pénzkezelési szabályzat oldalon.");
      return;
    }
    setEntryForm(emptyEntryForm(selectedRegId));
    setEntryDialogOpen(true);
  };
  const openEditDraft = (e: CashEntry) => {
    if (e.status !== "piszkozat") return;
    setEntryForm({
      id: e.id,
      cash_register_id: e.cash_register_id,
      entry_type: e.entry_type,
      amount: String(e.amount || ""),
      event_date: e.event_date || new Date().toISOString().slice(0, 10),
      category: e.category || "",
      description: e.description || "",
      reference_number: e.reference_number || "",
      partner_name: e.partner_name || "",
      partner_tax_id: e.partner_tax_id || "",
      ordered_by: e.ordered_by || "",
      related_document_ref: e.related_document_ref || "",
      booking_ref: e.booking_ref || "",
    });
    setEntryDialogOpen(true);
  };

  const buildPayload = (status: "piszkozat" | "veglegesitett", userId: string) => {
    const amt = Number(entryForm.amount);
    const words = amt > 0 ? numberToHungarianWords(amt) : "";
    return {
      cash_register_id: entryForm.cash_register_id,
      hunter_society_id: societyId!,
      entry_type: entryForm.entry_type,
      document_type: entryForm.entry_type === "bevetel" ? "BPB" : "KPB",
      status,
      amount: amt,
      entry_date: entryForm.event_date,
      event_date: entryForm.event_date,
      category: entryForm.category || null,
      description: entryForm.description || null,
      reference_number: entryForm.reference_number || null,
      partner_name: entryForm.partner_name || null,
      partner_tax_id: entryForm.partner_tax_id || null,
      ordered_by: entryForm.ordered_by || null,
      related_document_ref: entryForm.related_document_ref || null,
      booking_ref: entryForm.booking_ref || null,
      amount_in_words: words || null,
      source_type: "manual" as string,
      created_by: userId,
    };
  };

  const validateForFinalize = (): string | null => {
    const amt = Number(entryForm.amount);
    if (!amt || amt <= 0) return "Az összegnek pozitív számnak kell lennie";
    if (!entryForm.event_date) return "A gazdasági esemény dátuma kötelező";
    if (entryForm.event_date > new Date().toISOString().slice(0, 10))
      return "A gazdasági esemény dátuma nem lehet jövőbeli";
    if (!entryForm.category) return "A jogcím kötelező";
    if (!entryForm.partner_name.trim()) return "A befizető/átvevő neve kötelező";
    return null;
  };

  const saveDraft = async () => {
    if (!societyId) return;
    if (!entryForm.cash_register_id) { toast.error("Pénztár kötelező"); return; }
    const amt = Number(entryForm.amount);
    if (amt && amt < 0) { toast.error("Az összeg nem lehet negatív"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = buildPayload("piszkozat", user.id);
    let error;
    if (entryForm.id) {
      ({ error } = await supabase.from("cash_entries").update(payload).eq("id", entryForm.id));
    } else {
      ({ error } = await supabase.from("cash_entries").insert(payload));
    }
    if (error) { toast.error("Mentés sikertelen: " + error.message); return; }
    toast.success("Piszkozat mentve");
    setEntryDialogOpen(false);
    await loadEntries(entryForm.cash_register_id);
  };

  const requestFinalize = () => {
    const err = validateForFinalize();
    if (err) { toast.error(err); return; }
    setConfirmFinalizeOpen(true);
  };
  const finalizeEntry = async () => {
    if (!societyId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = buildPayload("veglegesitett", user.id);
    let error;
    if (entryForm.id) {
      ({ error } = await supabase.from("cash_entries").update(payload).eq("id", entryForm.id));
    } else {
      ({ error } = await supabase.from("cash_entries").insert(payload));
    }
    if (error) { toast.error("Véglegesítés sikertelen: " + error.message); return; }
    toast.success("Bizonylat véglegesítve. Tartalma a továbbiakban nem módosítható.");
    setConfirmFinalizeOpen(false);
    setEntryDialogOpen(false);
    await loadEntries(entryForm.cash_register_id);
  };

  const deleteDraft = async (e: CashEntry) => {
    if (e.status !== "piszkozat") return;
    if (!confirm("Biztosan törlöd ezt a piszkozatot?")) return;
    const { error } = await supabase.from("cash_entries").delete().eq("id", e.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Piszkozat törölve");
    if (selectedRegId) await loadEntries(selectedRegId);
  };

  const exportCSV = () => {
    if (!selectedReg) return;
    const rows = [["Esemény dátuma", "Típus", "Bizonylattípus", "Státusz", "Jogcím", "Partner",
      "Leírás", "Bizonylat", "Bevétel", "Kiadás", "Egyenleg"]];
    const sorted = [...filteredEntries];
    for (const e of sorted) {
      rows.push([
        e.event_date || e.entry_date,
        e.entry_type === "bevetel" ? "Bevétel" : "Kiadás",
        e.document_type,
        STATUS_LABEL[e.status],
        e.category || "",
        e.partner_name || "",
        (e.description || "").replace(/[\r\n;]/g, " "),
        e.reference_number || "",
        e.entry_type === "bevetel" ? String(e.amount) : "",
        e.entry_type === "kiadas" ? String(e.amount) : "",
        String(runningById.get(e.id) ?? ""),
      ]);
    }
    const csv = "\uFEFF" + rows.map((r) =>
      r.map((c) => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(";")
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `penztarkonyv_${selectedReg.name}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const availableCategories = useMemo(() => {
    return categories.filter((c) =>
      c.direction === "mindketto" || c.direction === entryForm.entry_type
    );
  }, [categories, entryForm.entry_type]);

  const liveWords = useMemo(() => {
    const n = Number(entryForm.amount);
    if (!n || n <= 0) return "";
    return numberToHungarianWords(n);
  }, [entryForm.amount]);

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
            <Button variant="outline" onClick={() => navigate("/cash-policy")}>
              <Settings className="h-4 w-4 mr-2" /> Szabályzat & jogcímek
            </Button>
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
                  <SelectTrigger className="w-[280px]"><SelectValue placeholder="Válassz pénztárat" /></SelectTrigger>
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
                    <Plus className="h-4 w-4 mr-2" /> Új bizonylat
                  </Button>
                  <Button variant="outline" onClick={exportCSV}>
                    <Download className="h-4 w-4 mr-2" /> Export CSV
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Nyitóegyenleg</CardTitle></CardHeader>
                <CardContent className="text-xl font-semibold">{fmtHUF(Number(selectedReg?.opening_balance || 0))}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Bevétel (véglegesített)</CardTitle></CardHeader>
                <CardContent className="text-xl font-semibold text-green-600 dark:text-green-400">{fmtHUF(totalIncome)}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Kiadás (véglegesített)</CardTitle></CardHeader>
                <CardContent className="text-xl font-semibold text-red-600 dark:text-red-400">{fmtHUF(totalExpense)}</CardContent>
              </Card>
              <Card className={currentBalance < 0 ? "border-destructive" : ""}>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Aktuális egyenleg</CardTitle></CardHeader>
                <CardContent className={`text-xl font-semibold ${currentBalance < 0 ? "text-destructive" : ""}`}>{fmtHUF(currentBalance)}</CardContent>
              </Card>
            </div>

            {draftCount > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-md border border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 text-sm">
                <FileCheck className="h-4 w-4 shrink-0" />
                <span>{draftCount} piszkozat vár véglegesítésre. A piszkozatok nem számítanak bele az egyenlegbe.</span>
              </div>
            )}
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
                    <SelectTrigger className="w-[200px]"><SelectValue placeholder="Mind" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Mind</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Státusz</Label>
                  <Select value={statusFilter || "__all__"} onValueChange={(v) => setStatusFilter(v === "__all__" ? "" : v)}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Mind" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Mind</SelectItem>
                      <SelectItem value="piszkozat">Piszkozat</SelectItem>
                      <SelectItem value="veglegesitett">Véglegesített</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setFromDate(""); setToDate(""); setCategoryFilter(""); setStatusFilter(""); }}>
                  Szűrők törlése
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Státusz</TableHead>
                      <TableHead>Típus</TableHead>
                      <TableHead>Dátum</TableHead>
                      <TableHead>Jogcím</TableHead>
                      <TableHead>Partner</TableHead>
                      <TableHead className="text-right">Bevétel</TableHead>
                      <TableHead className="text-right">Kiadás</TableHead>
                      <TableHead className="text-right">Egyenleg</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          Nincs megjeleníthető bizonylat
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredEntries.map((e) => {
                      const isIncome = e.entry_type === "bevetel";
                      const isDraft = e.status === "piszkozat";
                      const isFinal = e.status === "veglegesitett";
                      return (
                        <TableRow key={e.id} className={isDraft ? "opacity-80" : ""}>
                          <TableCell>
                            <Badge
                              variant={isFinal ? "default" : isDraft ? "secondary" : "outline"}
                              className={
                                isDraft ? "bg-yellow-500/20 text-yellow-800 dark:text-yellow-200 border-yellow-500/40"
                                  : isFinal ? "bg-green-500/20 text-green-800 dark:text-green-200 border-green-500/40"
                                  : ""
                              }
                            >
                              {STATUS_LABEL[e.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono">{e.document_type}</TableCell>
                          <TableCell className="whitespace-nowrap">{e.event_date || e.entry_date}</TableCell>
                          <TableCell>
                            {e.category || <span className="text-muted-foreground">—</span>}
                            {e.source_type && e.source_type !== "manual" && (
                              <Badge variant="outline" className="ml-2 text-xs">Auto</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{e.partner_name || <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="text-right text-green-600 dark:text-green-400 whitespace-nowrap">
                            {isIncome ? fmtHUF(Number(e.amount)) : ""}
                          </TableCell>
                          <TableCell className="text-right text-red-600 dark:text-red-400 whitespace-nowrap">
                            {!isIncome ? fmtHUF(Number(e.amount)) : ""}
                          </TableCell>
                          <TableCell className="text-right font-medium whitespace-nowrap">
                            {isFinal ? fmtHUF(runningById.get(e.id) ?? 0) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            {isDraft ? (
                              <>
                                <Button size="sm" variant="ghost" onClick={() => openEditDraft(e)} title="Szerkesztés">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => deleteDraft(e)} title="Törlés">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Button size="sm" variant="ghost" onClick={() => setViewEntry(e)} title="Megtekintés">
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
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

      {/* Register dialog */}
      <Dialog open={regDialogOpen} onOpenChange={setRegDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingReg ? "Pénztár szerkesztése" : "Új pénztár"}</DialogTitle></DialogHeader>
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
                type="number" value={regForm.opening_balance}
                onChange={(e) => setRegForm({ ...regForm, opening_balance: e.target.value })}
                disabled={!!editingReg}
              />
              {editingReg && <p className="text-xs text-muted-foreground mt-1">A nyitóegyenleg utólag nem módosítható.</p>}
            </div>
            {editingReg && (
              <div className="flex items-center gap-2">
                <input id="is_active" type="checkbox" checked={regForm.is_active}
                  onChange={(e) => setRegForm({ ...regForm, is_active: e.target.checked })} />
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

      {/* Entry dialog */}
      <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {entryForm.id ? "Piszkozat szerkesztése" : "Új pénztári bizonylat"}
            </DialogTitle>
            <DialogDescription>
              A véglegesítés után a bizonylat tartalma nem módosítható (Sztv. 165./168. §).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button type="button" variant={entryForm.entry_type === "bevetel" ? "default" : "outline"}
                className="flex-1" onClick={() => setEntryForm({ ...entryForm, entry_type: "bevetel" })}>
                Bevétel (BPB)
              </Button>
              <Button type="button" variant={entryForm.entry_type === "kiadas" ? "default" : "outline"}
                className="flex-1" onClick={() => setEntryForm({ ...entryForm, entry_type: "kiadas" })}>
                Kiadás (KPB)
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Összeg (Ft) *</Label>
                <Input type="number" value={entryForm.amount}
                  onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })} />
              </div>
              <div>
                <Label>Esemény dátuma *</Label>
                <Input type="date" value={entryForm.event_date}
                  onChange={(e) => setEntryForm({ ...entryForm, event_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Összeg betűvel</Label>
              <Input value={liveWords} readOnly className="bg-muted" />
              <p className="text-xs text-muted-foreground mt-1">Automatikus generálás az összegből (Sztv. 167. §).</p>
            </div>
            <div>
              <Label>Jogcím *</Label>
              <Select value={entryForm.category || "__none__"}
                onValueChange={(v) => setEntryForm({ ...entryForm, category: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Válassz a jogcímtárból" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Válassz —</SelectItem>
                  {availableCategories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.code} — {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableCategories.length === 0 && (
                <p className="text-xs text-destructive mt-1">
                  Nincs ehhez az irányhoz aktív jogcím. Vegyél fel egyet a Pénzkezelési szabályzat oldalon.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Befizető / Átvevő neve *</Label>
                <Input value={entryForm.partner_name}
                  onChange={(e) => setEntryForm({ ...entryForm, partner_name: e.target.value })} />
              </div>
              <div>
                <Label>Partner adószáma</Label>
                <Input value={entryForm.partner_tax_id}
                  onChange={(e) => setEntryForm({ ...entryForm, partner_tax_id: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Utalványozó / Elrendelő</Label>
                <Input value={entryForm.ordered_by}
                  onChange={(e) => setEntryForm({ ...entryForm, ordered_by: e.target.value })} />
              </div>
              <div>
                <Label>Kapcsolódó alapbizonylat</Label>
                <Input value={entryForm.related_document_ref}
                  onChange={(e) => setEntryForm({ ...entryForm, related_document_ref: e.target.value })}
                  placeholder="pl. számla sorszáma" />
              </div>
            </div>
            <div>
              <Label>Leírás</Label>
              <Textarea value={entryForm.description}
                onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bizonylatszám (külső)</Label>
                <Input value={entryForm.reference_number}
                  onChange={(e) => setEntryForm({ ...entryForm, reference_number: e.target.value })}
                  placeholder="opcionális — a belső sorszám M2-ben jön" />
              </div>
              <div>
                <Label>Kontírozás / főkönyvi hivatkozás</Label>
                <Input value={entryForm.booking_ref}
                  onChange={(e) => setEntryForm({ ...entryForm, booking_ref: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setEntryDialogOpen(false)}>Mégse</Button>
            <Button variant="outline" onClick={saveDraft}>Piszkozat mentése</Button>
            <Button onClick={requestFinalize}><FileCheck className="h-4 w-4 mr-2" />Véglegesítés</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm finalize */}
      <Dialog open={confirmFinalizeOpen} onOpenChange={setConfirmFinalizeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bizonylat véglegesítése</DialogTitle>
            <DialogDescription>
              A véglegesített bizonylat <strong>NEM módosítható</strong> és <strong>NEM törölhető</strong>.
              Csak stornóval javítható (Sztv. 165./168. §). Folytatod?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmFinalizeOpen(false)}>Mégse</Button>
            <Button onClick={finalizeEntry}>Igen, véglegesítem</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View finalized entry */}
      <Dialog open={!!viewEntry} onOpenChange={(o) => !o && setViewEntry(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Bizonylat megtekintése</DialogTitle>
            <DialogDescription>Csak olvasható — véglegesített bizonylat.</DialogDescription>
          </DialogHeader>
          {viewEntry && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Bizonylattípus</span><span className="font-mono">{viewEntry.document_type}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Státusz</span><span>{STATUS_LABEL[viewEntry.status]}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Esemény dátuma</span><span>{viewEntry.event_date}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Kiállítva</span><span>{viewEntry.issued_at ? new Date(viewEntry.issued_at).toLocaleString("hu-HU") : "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Összeg</span><span className="font-semibold">{fmtHUF(Number(viewEntry.amount))}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Összeg betűvel</span><span className="italic">{viewEntry.amount_in_words}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Jogcím</span><span>{viewEntry.category}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Partner</span><span>{viewEntry.partner_name}</span></div>
              {viewEntry.partner_tax_id && <div className="flex justify-between"><span className="text-muted-foreground">Adószám</span><span>{viewEntry.partner_tax_id}</span></div>}
              {viewEntry.ordered_by && <div className="flex justify-between"><span className="text-muted-foreground">Utalványozó</span><span>{viewEntry.ordered_by}</span></div>}
              {viewEntry.related_document_ref && <div className="flex justify-between"><span className="text-muted-foreground">Alapbizonylat</span><span>{viewEntry.related_document_ref}</span></div>}
              {viewEntry.booking_ref && <div className="flex justify-between"><span className="text-muted-foreground">Kontírozás</span><span>{viewEntry.booking_ref}</span></div>}
              {viewEntry.description && <div><span className="text-muted-foreground">Leírás:</span><p className="mt-1">{viewEntry.description}</p></div>}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewEntry(null)}>Bezár</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CashRegisterPage;
