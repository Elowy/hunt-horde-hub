import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, Loader2, Plus, RefreshCw } from "lucide-react";
import { CreateInvoiceDialog } from "@/components/CreateInvoiceDialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { hu } from "date-fns/locale";

interface InvoiceRow {
  id: string;
  szamlazz_invoice_number: string | null;
  buyer_name: string;
  source_type: string;
  net_amount: number | null;
  vat_amount: number | null;
  gross_amount: number;
  currency: string;
  status: string;
  error_message: string | null;
  created_at: string;
  szamlazz_url: string | null;
}

const statusVariant = (s: string): "default" | "secondary" | "destructive" => {
  if (s === "issued") return "default";
  if (s === "failed") return "destructive";
  return "secondary";
};

const statusLabel = (s: string) => {
  if (s === "issued") return "Kiállítva";
  if (s === "failed") return "Hibás";
  return "Folyamatban";
};

export default function Invoices() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast.error(error.message);
    } else {
      setRows((data ?? []) as InvoiceRow[]);
    }
    setLoading(false);
  };

  const downloadPdf = async (id: string) => {
    setDownloadingId(id);
    try {
      const { data, error } = await supabase.functions.invoke("szamlazz-get-pdf", {
        body: { invoice_id: id },
      });
      if (error) throw error;
      const url = (data as any)?.url;
      if (!url) throw new Error("Nincs URL");
      window.open(url, "_blank");
    } catch (e: any) {
      toast.error(e.message || "Letöltési hiba");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-gradient-to-r from-forest-deep to-forest-light text-white shadow-md">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Számlák</h1>
            <p className="text-white/80 text-sm">Számlázz.hu integráció</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} variant="secondary">
            <Plus className="h-4 w-4 mr-1" /> Új számla
          </Button>
        </div>
      </div>

      <div className="container py-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Kiállított számlák</CardTitle>
            <Button variant="ghost" size="icon" onClick={load}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Még nincs kiállított számla.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dátum</TableHead>
                      <TableHead>Számlaszám</TableHead>
                      <TableHead>Vevő</TableHead>
                      <TableHead>Forrás</TableHead>
                      <TableHead className="text-right">Bruttó</TableHead>
                      <TableHead>Státusz</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">
                          {format(new Date(r.created_at), "yyyy.MM.dd HH:mm", { locale: hu })}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.szamlazz_invoice_number ?? "—"}</TableCell>
                        <TableCell>{r.buyer_name}</TableCell>
                        <TableCell className="text-xs">{r.source_type}</TableCell>
                        <TableCell className="text-right">
                          {Number(r.gross_amount).toLocaleString("hu-HU")} {r.currency}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge>
                          {r.status === "failed" && r.error_message && (
                            <p className="text-[10px] text-destructive mt-1 max-w-[200px] truncate" title={r.error_message}>
                              {r.error_message}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {r.status === "issued" && r.szamlazz_url && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => downloadPdf(r.id)}
                              disabled={downloadingId === r.id}
                            >
                              {downloadingId === r.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateInvoiceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        sourceType="manual"
        onCreated={() => load()}
      />
    </div>
  );
}
