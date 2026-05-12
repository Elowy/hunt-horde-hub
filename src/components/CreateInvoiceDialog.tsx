import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export interface InvoiceBuyer {
  name: string;
  email?: string;
  tax_number?: string;
  zip: string;
  city: string;
  address: string;
}

export interface InvoiceItem {
  name: string;
  quantity: number;
  unit: string;
  net_unit_price: number;
  vat_rate: string;
}

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceType: string;
  sourceId?: string;
  prefilledBuyer?: Partial<InvoiceBuyer>;
  prefilledItems?: InvoiceItem[];
  onCreated?: (invoice: any) => void;
}

const VAT_OPTIONS = ["27", "18", "5", "0", "AAM", "TAM"];

const emptyBuyer: InvoiceBuyer = { name: "", zip: "", city: "", address: "" };
const emptyItem: InvoiceItem = { name: "", quantity: 1, unit: "db", net_unit_price: 0, vat_rate: "27" };

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  sourceType,
  sourceId,
  prefilledBuyer,
  prefilledItems,
  onCreated,
}: CreateInvoiceDialogProps) {
  const [buyer, setBuyer] = useState<InvoiceBuyer>({ ...emptyBuyer, ...prefilledBuyer });
  const [items, setItems] = useState<InvoiceItem[]>(prefilledItems?.length ? prefilledItems : [emptyItem]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setBuyer({ ...emptyBuyer, ...prefilledBuyer });
      setItems(prefilledItems?.length ? prefilledItems : [{ ...emptyItem }]);
      setComment("");
    }
  }, [open]);

  const totals = useMemo(() => {
    let net = 0;
    let vat = 0;
    for (const it of items) {
      const n = round2((it.quantity || 0) * (it.net_unit_price || 0));
      const rate = parseFloat(it.vat_rate);
      const v = isFinite(rate) ? round2(n * (rate / 100)) : 0;
      net += n;
      vat += v;
    }
    return { net: round2(net), vat: round2(vat), gross: round2(net + vat) };
  }, [items]);

  const updateItem = (idx: number, patch: Partial<InvoiceItem>) => {
    setItems((xs) => xs.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  };

  const submit = async () => {
    if (!buyer.name || !buyer.zip || !buyer.city || !buyer.address) {
      toast.error("Add meg a vevő összes kötelező adatát.");
      return;
    }
    if (items.some((it) => !it.name || it.quantity <= 0)) {
      toast.error("Minden tételhez kell név és pozitív mennyiség.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("szamlazz-create-invoice", {
        body: {
          source_type: sourceType,
          source_id: sourceId,
          buyer,
          items,
          comment: comment || undefined,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Számla kiállítva: ${(data as any).invoice?.szamlazz_invoice_number ?? ""}`);
      onCreated?.((data as any).invoice);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Nem sikerült kiállítani a számlát");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Új számla kiállítása</DialogTitle>
          <DialogDescription>Számlázz.hu Számla Agent integráción keresztül.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Vevő</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Név *</Label>
                <Input value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} />
              </div>
              <div>
                <Label>Adószám</Label>
                <Input value={buyer.tax_number ?? ""} onChange={(e) => setBuyer({ ...buyer, tax_number: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={buyer.email ?? ""} onChange={(e) => setBuyer({ ...buyer, email: e.target.value })} />
              </div>
              <div>
                <Label>Irányítószám *</Label>
                <Input value={buyer.zip} onChange={(e) => setBuyer({ ...buyer, zip: e.target.value })} />
              </div>
              <div>
                <Label>Település *</Label>
                <Input value={buyer.city} onChange={(e) => setBuyer({ ...buyer, city: e.target.value })} />
              </div>
              <div>
                <Label>Cím *</Label>
                <Input value={buyer.address} onChange={(e) => setBuyer({ ...buyer, address: e.target.value })} />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Tételek</h3>
              <Button size="sm" variant="outline" onClick={() => setItems([...items, { ...emptyItem }])}>
                <Plus className="h-4 w-4 mr-1" /> Tétel
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end border rounded p-2">
                  <div className="col-span-12 md:col-span-4">
                    <Label className="text-xs">Megnevezés</Label>
                    <Input value={it.name} onChange={(e) => updateItem(idx, { name: e.target.value })} />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Label className="text-xs">Mennyiség</Label>
                    <Input type="number" step="0.01" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="col-span-4 md:col-span-1">
                    <Label className="text-xs">Egység</Label>
                    <Input value={it.unit} onChange={(e) => updateItem(idx, { unit: e.target.value })} />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Label className="text-xs">Nettó egys.ár</Label>
                    <Input type="number" step="0.01" value={it.net_unit_price} onChange={(e) => updateItem(idx, { net_unit_price: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="col-span-8 md:col-span-2">
                    <Label className="text-xs">ÁFA</Label>
                    <Select value={it.vat_rate} onValueChange={(v) => updateItem(idx, { vat_rate: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {VAT_OPTIONS.map((v) => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4 md:col-span-1 flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setItems(items.filter((_, i) => i !== idx))}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <Label>Megjegyzés</Label>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
          </section>

          <section className="flex justify-end gap-6 text-sm border-t pt-3">
            <div>Nettó: <strong>{totals.net.toLocaleString("hu-HU")} Ft</strong></div>
            <div>ÁFA: <strong>{totals.vat.toLocaleString("hu-HU")} Ft</strong></div>
            <div>Bruttó: <strong>{totals.gross.toLocaleString("hu-HU")} Ft</strong></div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Mégse</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Számla kiállítása
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
