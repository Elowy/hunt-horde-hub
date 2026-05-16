import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { FileCheck, Download, Loader2, RotateCcw, AlertTriangle, Lock } from "lucide-react";
import { toast } from "sonner";
import { generateCashReportPdf } from "@/lib/generateCashReportPdf";

interface Props {
  societyId: string;
  registerId: string;
  registerCode: string;
  openingBalance: number;
  closingCycle: "napi" | "heti" | "havi";
  isSuperAdmin: boolean;
  onClosed?: () => void;
}

interface Closing {
  id: string;
  closing_number: string;
  period_start: string;
  period_end: string;
  opening_balance: number;
  total_income: number;
  total_expense: number;
  closing_balance: number;
  counted_cash: number | null;
  difference: number | null;
  difference_note: string | null;
  status: "lezart" | "ujranyitott";
  pdf_path: string | null;
  closed_at: string;
  version: number;
  reopen_reason: string | null;
}

const DENOMS = [20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5];
const fmtHUF = (n: number) =>
  new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 0 }).format(Math.round(n)) + " Ft";

function computePeriod(cycle: "napi" | "heti" | "havi", lastClosedEnd: string | null): { start: string; end: string } {
  const today = new Date();
  const start = lastClosedEnd
    ? new Date(new Date(lastClosedEnd).getTime() + 24 * 3600 * 1000)
    : new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let end = new Date(today);
  if (cycle === "heti") {
    // ISO hét vége: vasárnap (de a "mai" napig zárunk legfeljebb)
    const day = today.getDay() || 7;
    const sunday = new Date(today);
    sunday.setDate(today.getDate() + (7 - day));
    end = sunday < today ? today : sunday;
    end = end > today ? today : end;
  } else if (cycle === "havi") {
    const eom = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    end = eom < today ? eom : today;
  }
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

export default function CashClosingsPanel({
  societyId, registerId, registerCode, openingBalance, closingCycle, isSuperAdmin, onClosed,
}: Props) {
  const [closings, setClosings] = useState<Closing[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [period, setPeriod] = useState({ start: "", end: "" });
  const [draftCount, setDraftCount] = useState(0);
  const [computed, setComputed] = useState({ opening: 0, income: 0, expense: 0, closing: 0 });
  const [denomCounts, setDenomCounts] = useState<Record<number, string>>({});
  const [diffNote, setDiffNote] = useState("");

  const [reopenTarget, setReopenTarget] = useState<Closing | null>(null);
  const [reopenReason, setReopenReason] = useState("");

  useEffect(() => { loadClosings(); }, [registerId]);

  const loadClosings = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).from("cash_closings")
      .select("*").eq("cash_register_id", registerId)
      .order("closing_seq_number", { ascending: false });
    setLoading(false);
    if (error) { toast.error("Zárások betöltése sikertelen"); return; }
    setClosings((data || []) as Closing[]);
  };

  const lastClosedEnd = useMemo(() => {
    const lz = closings.filter((c) => c.status === "lezart");
    if (lz.length === 0) return null;
    return lz.reduce((m, c) => (c.period_end > m ? c.period_end : m), "0000-00-00");
  }, [closings]);

  const openCloseDialog = async () => {
    const p = computePeriod(closingCycle, lastClosedEnd);
    setPeriod(p);
    setDenomCounts({});
    setDiffNote("");

    // Draft check + összegek számítása az időszakra
    const { data: entries, error } = await supabase.from("cash_entries")
      .select("entry_type, amount, status, event_date")
      .eq("cash_register_id", registerId)
      .gte("event_date", p.start).lte("event_date", p.end);
    if (error) { toast.error("Tételek lekérése sikertelen"); return; }

    const drafts = (entries || []).filter((e: any) => e.status === "piszkozat").length;
    setDraftCount(drafts);

    // Nyitó: utolsó lezárt záró + 0, ha nincs zárás: register opening_balance
    let opening = openingBalance;
    if (lastClosedEnd) {
      const last = closings.find((c) => c.period_end === lastClosedEnd && c.status === "lezart");
      if (last) opening = Number(last.closing_balance);
    }

    let income = 0, expense = 0;
    (entries || []).forEach((e: any) => {
      if (["veglegesitett", "stornozott", "helyesbitett"].includes(e.status)) {
        if (e.entry_type === "bevetel") income += Number(e.amount);
        else expense += Number(e.amount);
      }
    });
    const closingBal = opening + income - expense;
    setComputed({ opening, income, expense, closing: closingBal });
    setDialogOpen(true);
  };

  const countedCash = useMemo(() => {
    return DENOMS.reduce((s, d) => s + d * (Number(denomCounts[d]) || 0), 0);
  }, [denomCounts]);

  const difference = countedCash - computed.closing;
  const hasDenom = Object.values(denomCounts).some((v) => Number(v) > 0);

  const submitClose = async () => {
    if (draftCount > 0) {
      toast.error(`Még ${draftCount} piszkozat van. Zárás előtt véglegesítsd vagy töröld őket.`);
      return;
    }
    if (period.start > period.end) {
      toast.error("Érvénytelen időszak."); return;
    }
    if (hasDenom && difference !== 0 && !diffNote.trim()) {
      toast.error("Eltérés esetén kötelező a megjegyzés."); return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setSubmitting(true);
    const insertPayload: any = {
      cash_register_id: registerId,
      hunter_society_id: societyId,
      period_start: period.start,
      period_end: period.end,
      opening_balance: computed.opening,
      total_income: computed.income,
      total_expense: computed.expense,
      closing_balance: computed.closing,
      counted_cash: hasDenom ? countedCash : null,
      difference: hasDenom ? difference : null,
      difference_note: hasDenom && difference !== 0 ? diffNote.trim() : null,
      closed_by: user.id,
      // a closing_number / seq_number a triggertől jön
      closing_seq_year: 0,
      closing_seq_number: 0,
      closing_number: "",
    };

    const { data: newClosing, error } = await (supabase as any).from("cash_closings")
      .insert(insertPayload).select().maybeSingle();
    if (error) {
      setSubmitting(false);
      toast.error("Zárás sikertelen: " + error.message); return;
    }

    // Címletjegyzék (ha van)
    if (hasDenom) {
      const rows = DENOMS
        .map((d) => ({ closing_id: newClosing.id, denomination: d, count: Number(denomCounts[d]) || 0 }))
        .filter((r) => r.count > 0);
      if (rows.length > 0) {
        await (supabase as any).from("cash_denominations").insert(rows);
      }
    }

    toast.success(`Zárás kész: ${newClosing.closing_number}. PDF generálás folyamatban…`);

    // PDF generálás
    const { data: pdfRes, error: pdfErr } = await supabase.functions.invoke("penztarjelentes-pdf", {
      body: { closing_id: newClosing.id },
    });
    setSubmitting(false);
    if (pdfErr) {
      toast.warning("Zárás létrejött, de a PDF generálás hibára futott: " + pdfErr.message);
    } else if (pdfRes?.url) {
      toast.success("Pénztárjelentés elérhető.");
      window.open(pdfRes.url, "_blank");
    }
    setDialogOpen(false);
    await loadClosings();
    onClosed?.();
  };

  const downloadPdf = async (c: Closing) => {
    const { data: res, error } = await supabase.functions.invoke("penztarjelentes-pdf", {
      body: { closing_id: c.id },
    });
    if (error || !res?.url) { toast.error("PDF letöltés sikertelen"); return; }
    window.open(res.url, "_blank");
  };

  const submitReopen = async () => {
    if (!reopenTarget) return;
    if (reopenReason.trim().length < 5) { toast.error("Az indoklás kötelező (min. 5 karakter)."); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await (supabase as any).from("cash_closings").update({
      status: "ujranyitott",
      reopen_reason: reopenReason.trim(),
      reopened_at: new Date().toISOString(),
      reopened_by: user.id,
      version: reopenTarget.version + 1,
    }).eq("id", reopenTarget.id);
    if (error) { toast.error("Újranyitás sikertelen: " + error.message); return; }
    toast.success("Az időszak újranyitva.");
    setReopenTarget(null);
    setReopenReason("");
    await loadClosings();
    onClosed?.();
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" /> Időszaki zárások ({registerCode})
          </CardTitle>
          <Button size="sm" onClick={openCloseDialog}>
            <FileCheck className="h-4 w-4 mr-2" /> Új zárás
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-6 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
          ) : closings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Még nincs zárás ehhez a pénztárhoz.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sorszám</TableHead>
                  <TableHead>Időszak</TableHead>
                  <TableHead className="text-right">Záró</TableHead>
                  <TableHead className="text-right">Eltérés</TableHead>
                  <TableHead>Státusz</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closings.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.closing_number}</TableCell>
                    <TableCell className="text-xs">{c.period_start}{c.period_start !== c.period_end ? ` – ${c.period_end}` : ""}</TableCell>
                    <TableCell className="text-right">{fmtHUF(Number(c.closing_balance))}</TableCell>
                    <TableCell className={`text-right ${c.difference && Number(c.difference) !== 0 ? "text-destructive font-semibold" : ""}`}>
                      {c.difference != null ? fmtHUF(Number(c.difference)) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.status === "lezart" ? "default" : "outline"}>
                        {c.status === "lezart" ? "Lezárt" : `Újranyitott (v${c.version})`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => downloadPdf(c)} title="PDF">
                          <Download className="h-4 w-4" />
                        </Button>
                        {isSuperAdmin && c.status === "lezart" && (
                          <Button size="sm" variant="ghost" onClick={() => setReopenTarget(c)} title="Újranyitás">
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Close dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Időszak zárása</DialogTitle>
            <DialogDescription>
              Pénzkezelési szabályzat ciklusa: <strong>{closingCycle}</strong>.
              A zárás után a megadott időszakba <strong>nem rögzíthető</strong> új bizonylat (DB-trigger tiltja).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Időszak kezdete</Label>
                <Input type="date" value={period.start} onChange={(e) => setPeriod({ ...period, start: e.target.value })} />
              </div>
              <div>
                <Label>Időszak vége</Label>
                <Input type="date" value={period.end} onChange={(e) => setPeriod({ ...period, end: e.target.value })} />
              </div>
            </div>

            {draftCount > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-md border border-destructive bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{draftCount} piszkozat bizonylat van az időszakban. Zárás előtt véglegesítsd vagy töröld őket.</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-2 rounded border">
                <div className="text-muted-foreground">Nyitó egyenleg</div>
                <div className="font-semibold">{fmtHUF(computed.opening)}</div>
              </div>
              <div className="p-2 rounded border">
                <div className="text-muted-foreground">Záró (könyv szerinti)</div>
                <div className="font-semibold">{fmtHUF(computed.closing)}</div>
              </div>
              <div className="p-2 rounded border">
                <div className="text-muted-foreground">Bevétel</div>
                <div className="font-semibold text-green-700 dark:text-green-400">{fmtHUF(computed.income)}</div>
              </div>
              <div className="p-2 rounded border">
                <div className="text-muted-foreground">Kiadás</div>
                <div className="font-semibold text-red-700 dark:text-red-400">{fmtHUF(computed.expense)}</div>
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold">Címletjegyzék (rovancs)</Label>
              <p className="text-xs text-muted-foreground">Opcionális. Ha kitöltöd, megjelenik a pénztárjelentésen és az eltérést mutatja.</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                {DENOMS.map((d) => (
                  <div key={d}>
                    <Label className="text-xs">{d.toLocaleString("hu-HU")} Ft</Label>
                    <Input
                      type="number" min={0}
                      value={denomCounts[d] ?? ""}
                      onChange={(e) => setDenomCounts({ ...denomCounts, [d]: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>

            {hasDenom && (
              <div className="grid grid-cols-2 gap-3 text-sm p-3 rounded border">
                <div>
                  <div className="text-muted-foreground">Tényleges (rovancs)</div>
                  <div className="font-semibold">{fmtHUF(countedCash)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Eltérés</div>
                  <div className={`font-semibold ${difference !== 0 ? "text-destructive" : "text-green-700"}`}>
                    {fmtHUF(difference)}
                  </div>
                </div>
              </div>
            )}

            {hasDenom && difference !== 0 && (
              <div>
                <Label>Eltérés magyarázata *</Label>
                <Textarea value={diffNote} onChange={(e) => setDiffNote(e.target.value)}
                  placeholder="pl. apróhiba a visszaadásnál, számolási hiba, stb." />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={submitting}>Mégse</Button>
            <Button onClick={submitClose} disabled={submitting || draftCount > 0}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileCheck className="h-4 w-4 mr-2" />}
              Zárás véglegesítése
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen dialog */}
      <Dialog open={!!reopenTarget} onOpenChange={(o) => { if (!o) { setReopenTarget(null); setReopenReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Időszak újranyitása</DialogTitle>
            <DialogDescription>
              <strong>Kivételes művelet.</strong> A korábbi pénztárjelentés megmarad, új verzió készülhet.
              Az audit-naplózás a következő modulban (M5) készül el.
            </DialogDescription>
          </DialogHeader>
          {reopenTarget && (
            <div className="space-y-3 text-sm">
              <div>Zárás: <span className="font-mono">{reopenTarget.closing_number}</span></div>
              <div>Időszak: {reopenTarget.period_start} – {reopenTarget.period_end}</div>
              <div>
                <Label>Indoklás *</Label>
                <Textarea value={reopenReason} onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="Miért szükséges az újranyitás?" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setReopenTarget(null); setReopenReason(""); }}>Mégse</Button>
            <Button variant="destructive" onClick={submitReopen}>Újranyitás</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
