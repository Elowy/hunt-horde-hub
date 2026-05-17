import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle } from "lucide-react";

const EVENT_LABELS: Record<string, string> = {
  bizonylat_letrehozva:    "Bizonylat létrehozva",
  bizonylat_veglegesitett: "Bizonylat véglegesítve",
  bizonylat_stornozva:     "Stornózva",
  bizonylat_helyesbitett:  "Helyesbítve",
  bizonylat_ellentelezve:  "Ellentételezve",
  piszkozat_torolve:       "Piszkozat törölve",
  penztar_zarva:           "Pénztár zárva",
  penztar_ujranyitva:      "Pénztár újranyitva",
  penztar_letrehozva:      "Pénztár létrehozva",
};

const ROLE_LABELS: Record<string, string> = {
  owner:       "Tulajdonos",
  super_admin: "Super admin",
  admin:       "Adminisztrátor",
  editor:      "Szerkesztő",
  viewer:      "Olvasó",
};

interface AuditLog {
  id: string;
  seq: number;
  event_type: string;
  event_at: string;
  actor_role: string | null;
  document_number: string | null;
  payload: Record<string, unknown>;
  cash_register_id: string | null;
}

interface CashRegister {
  id: string;
  name: string;
}

const PAGE_SIZE = 50;

const fmtHUF = (n: number) =>
  new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 0 }).format(Math.round(n)) + " Ft";

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("hu-HU", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });

const payloadSummary = (p: Record<string, unknown>): string => {
  const parts: string[] = [];
  if (p.amount != null)     parts.push(fmtHUF(Number(p.amount)));
  if (p.category)           parts.push(String(p.category));
  if (p.partner_name)       parts.push(String(p.partner_name));
  if (p.closing_number)     parts.push(String(p.closing_number));
  if (p.reopen_reason)      parts.push(String(p.reopen_reason));
  if (p.name)               parts.push(String(p.name));
  return parts.join(" · ");
};

export default function CashAuditLog() {
  const navigate = useNavigate();

  const [ready, setReady] = useState(false);
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [chainErrors, setChainErrors] = useState<number[]>([]);
  const [chainLoading, setChainLoading] = useState(true);
  const [chainAvailable, setChainAvailable] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const [selectedRegId, setSelectedRegId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [eventType, setEventType] = useState("all");

  // Auth guard: DB RLS is the single source of truth.
  // If we can read at least 1 row from cash_audit_log, the user is admin+.
  // Non-admin users get empty data (not an error) due to RLS USING policy.
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const { data, error } = await supabase
        .from("cash_audit_log")
        .select("id")
        .limit(1);

      if (error) {
        toast.error("Ehhez az oldalhoz adminisztrátori jogosultság szükséges.");
        navigate("/dashboard");
        return;
      }

      const { data: regs } = await supabase
        .from("cash_registers")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      setRegisters(regs || []);
      setReady(true);
    })();
  }, [navigate]);

  // Reload chain check + logs whenever a filter changes.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    (async () => {
      // Chain check — cash_audit_chain_check is a view, not in generated types
      setChainLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let chainQ = (supabase as any)
        .from("cash_audit_chain_check")
        .select("seq")
        .eq("chain_ok", false)
        .limit(10);
      if (selectedRegId !== "all") chainQ = chainQ.eq("cash_register_id", selectedRegId);
      const { data: chainData, error: chainErr } = await chainQ;
      if (!cancelled) {
        setChainAvailable(!chainErr);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setChainErrors(chainErr ? [] : (chainData || []).map((r: any) => Number(r.seq)));
        setChainLoading(false);
      }

      // Logs — reset to first page
      let logsQ = supabase
        .from("cash_audit_log")
        .select("id, seq, event_type, event_at, actor_role, document_number, payload, cash_register_id")
        .order("seq", { ascending: false })
        .range(0, PAGE_SIZE - 1);
      if (selectedRegId !== "all") logsQ = logsQ.eq("cash_register_id", selectedRegId);
      if (dateFrom)               logsQ = logsQ.gte("event_at", dateFrom);
      if (dateTo)                 logsQ = logsQ.lte("event_at", dateTo + "T23:59:59");
      if (eventType !== "all")    logsQ = logsQ.eq("event_type", eventType);

      const { data: logsData, error: logsErr } = await logsQ;
      if (cancelled) return;
      if (logsErr) { toast.error("Napló betöltése sikertelen"); return; }
      const rows = (logsData || []) as AuditLog[];
      setLogs(rows);
      setHasMore(rows.length === PAGE_SIZE);
      setOffset(rows.length);
    })();

    return () => { cancelled = true; };
  }, [ready, selectedRegId, dateFrom, dateTo, eventType]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    let q = supabase
      .from("cash_audit_log")
      .select("id, seq, event_type, event_at, actor_role, document_number, payload, cash_register_id")
      .order("seq", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (selectedRegId !== "all") q = q.eq("cash_register_id", selectedRegId);
    if (dateFrom)               q = q.gte("event_at", dateFrom);
    if (dateTo)                 q = q.lte("event_at", dateTo + "T23:59:59");
    if (eventType !== "all")    q = q.eq("event_type", eventType);
    const { data, error } = await q;
    if (!error) {
      const rows = (data || []) as AuditLog[];
      setLogs(prev => [...prev, ...rows]);
      setHasMore(rows.length === PAGE_SIZE);
      setOffset(prev => prev + rows.length);
    }
    setLoadingMore(false);
  }, [offset, selectedRegId, dateFrom, dateTo, eventType]);

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setEventType("all");
    setSelectedRegId("all");
  };

  const hasFilters = !!(dateFrom || dateTo || eventType !== "all" || selectedRegId !== "all");
  const isRegFiltered = selectedRegId !== "all";

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4 max-w-6xl">
      <h1 className="text-2xl font-bold">Pénztár napló</h1>

      {/* Integrity banner — shown once chain check resolves */}
      {!chainLoading && chainAvailable && (
        chainErrors.length === 0 ? (
          <Alert className="border-green-500 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700 dark:text-green-400">
              ✓ {isRegFiltered
                ? "A kiválasztott pénztár naplója sértetlen — a hash-lánc ellenőrizve."
                : "A napló sértetlen — a hash-lánc ellenőrizve."}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              ⚠ Lánchiba észlelve! A napló integritása sérülhetett, fordulj rendszergazdához.{" "}
              Érintett sorok (seq): {chainErrors.join(", ")}.
            </AlertDescription>
          </Alert>
        )
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Dátumtól</p>
          <Input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="w-36"
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Dátumig</p>
          <Input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="w-36"
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Esemény</p>
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Minden esemény</SelectItem>
              {Object.entries(EVENT_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {registers.length > 1 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Pénztár</p>
            <Select value={selectedRegId} onValueChange={setSelectedRegId}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Összes pénztár</SelectItem>
                {registers.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Szűrők törlése
          </Button>
        )}
      </div>

      {/* Log table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Időpont</TableHead>
              <TableHead>Esemény</TableHead>
              <TableHead className="w-32">Ki</TableHead>
              <TableHead className="w-36">Dok.szám</TableHead>
              <TableHead>Összefoglaló</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nincs megjeleníthető esemény.
                </TableCell>
              </TableRow>
            ) : (
              logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {fmtDateTime(log.event_at)}
                  </TableCell>
                  <TableCell>
                    {EVENT_LABELS[log.event_type] ?? log.event_type}
                  </TableCell>
                  <TableCell className="text-sm">
                    {ROLE_LABELS[log.actor_role ?? ""] ?? (log.actor_role ?? "—")}
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {log.document_number ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {payloadSummary(log.payload)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Betöltés..." : "Továbbiak betöltése"}
          </Button>
        </div>
      )}
    </div>
  );
}
