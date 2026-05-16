// NAPI PÉNZTÁRJELENTÉS PDF generátor (B.13-25 stílus) — frontend, jsPDF
// TODO: 2. fázis - jogszabályi megfelelőség (hiteles archiválás, M6 modul)
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { notoSansRegularBase64 } from "@/lib/pdfFont";

// Magyar ékezetes Unicode font (NotoSans Regular) — beágyazva a bundle-be.
// Bold variánst NEM ágyazunk be a méret miatt; a "bold" stílusra ugyanezt a
// fontot regisztráljuk a jsPDF API kompatibilitása érdekében (a megjelenés
// regular marad, de a magyar karakterek mindenhol helyesek lesznek).
let fontRegistered = false;
function ensureHungarianFont(doc: jsPDF) {
  if (!fontRegistered) {
    // VFS-be egyszer elég berakni, de jsPDF instance-onként új addFont kell
  }
  doc.addFileToVFS("NotoSans.ttf", notoSansRegularBase64);
  doc.addFont("NotoSans.ttf", "DejaVu", "normal");
  doc.addFont("NotoSans.ttf", "DejaVu", "bold");
  doc.setFont("DejaVu", "normal");
  fontRegistered = true;
}

const fmtHUF = (n: number) =>
  new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 0 }).format(Math.round(n));
const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("hu-HU") : "";
const fmtDateTime = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString("hu-HU") : "";

interface Closing {
  id: string;
  closing_number: string;
  cash_register_id: string;
  hunter_society_id: string;
  period_start: string;
  period_end: string;
  opening_balance: number | string;
  total_income: number | string;
  total_expense: number | string;
  closing_balance: number | string;
  counted_cash: number | string | null;
  difference: number | string | null;
  difference_note: string | null;
  closed_at: string;
  closed_by: string;
  version: number;
  pdf_path: string | null;
}

export async function generateCashReportPdf(closingId: string): Promise<void> {
  // 1) Adatok lekérése
  const { data: closing, error: cErr } = await (supabase as any)
    .from("cash_closings").select("*").eq("id", closingId).maybeSingle();
  if (cErr || !closing) throw new Error(cErr?.message || "Zárás nem található");
  const c = closing as Closing;

  const [{ data: reg }, { data: soc }, { data: entries }, { data: denoms }, { data: closer }] =
    await Promise.all([
      supabase.from("cash_registers").select("register_code, name").eq("id", c.cash_register_id).maybeSingle(),
      supabase.from("profiles").select("company_name, contact_name").eq("id", c.hunter_society_id).maybeSingle(),
      supabase.from("cash_entries")
        .select("document_number, entry_type, amount, event_date, category, partner_name, description, related_document_ref, status, seq_number")
        .eq("cash_register_id", c.cash_register_id)
        .gte("event_date", c.period_start).lte("event_date", c.period_end)
        .in("status", ["veglegesitett", "stornozott", "helyesbitett"])
        .order("event_date", { ascending: true })
        .order("seq_number", { ascending: true }),
      (supabase as any).from("cash_denominations").select("denomination, count").eq("closing_id", c.id).order("denomination", { ascending: false }),
      supabase.from("profiles").select("company_name, contact_name").eq("id", c.closed_by).maybeSingle(),
    ]);

  // 2) Dokumentum + magyar font
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  ensureHungarianFont(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 32;

  // 3) Fejléc (minden oldal tetejére)
  const drawHeader = () => {
    doc.setFont("DejaVu", "bold"); doc.setFontSize(14);
    doc.text("NAPI PÉNZTÁRJELENTÉS", pageW / 2, margin + 6, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Sorszám: ${c.closing_number}`, pageW - margin, margin + 6, { align: "right" });
    doc.setFont("DejaVu", "normal"); doc.setFontSize(9);
    const gName = (soc as any)?.company_name || (soc as any)?.contact_name || "-";
    doc.text(`Gazdálkodó: ${gName}`, margin, margin + 22);
    doc.text(`Pénztár: ${(reg as any)?.name ?? ""} (${(reg as any)?.register_code ?? ""})`, margin, margin + 34);
    doc.text(`Időszak: ${fmtDate(c.period_start)} – ${fmtDate(c.period_end)}`, margin, margin + 46);
  };

  // 4) Sorok összeállítása + futó egyenleg
  let running = Number(c.opening_balance);
  const body: any[][] = [];
  body.push(["", "", "", "", "Nyitó egyenleg", "", "", fmtHUF(running)]);
  (entries ?? []).forEach((e: any, i: number) => {
    const amt = Number(e.amount);
    const isBev = e.entry_type === "bevetel";
    if (isBev) running += amt; else running -= amt;
    const desc = [e.category, e.partner_name, e.description].filter(Boolean).join(" – ");
    const suffix = e.status === "stornozott" ? " (stornózva)" : e.status === "helyesbitett" ? " (helyesbítve)" : "";
    body.push([
      String(i + 1),
      isBev ? (e.document_number ?? "") : "",
      !isBev ? (e.document_number ?? "") : "",
      e.related_document_ref ? "1" : "",
      (desc || "-") + suffix,
      isBev ? fmtHUF(amt) : "",
      !isBev ? fmtHUF(amt) : "",
      fmtHUF(running),
    ]);
  });
  body.push([
    { content: "Forgalom összesen", colSpan: 5, styles: { fontStyle: "bold" } },
    { content: fmtHUF(Number(c.total_income)), styles: { fontStyle: "bold", halign: "right" } },
    { content: fmtHUF(Number(c.total_expense)), styles: { fontStyle: "bold", halign: "right" } },
    { content: "", styles: { fontStyle: "bold" } },
  ] as any);
  body.push([
    { content: "Záró egyenleg (könyv szerinti)", colSpan: 7, styles: { fontStyle: "bold" } },
    { content: fmtHUF(Number(c.closing_balance)), styles: { fontStyle: "bold", halign: "right" } },
  ] as any);

  // 5) Táblázat
  drawHeader();
  autoTable(doc, {
    startY: margin + 60,
    margin: { left: margin, right: margin, top: margin + 60, bottom: margin + 24 },
    head: [["Ssz.", "Bevétel biz. sz.", "Kiadás biz. sz.", "Mell.", "Szöveg", "Bevétel Ft", "Kiadás Ft", "Egyenleg"]],
    body,
    styles: { font: "DejaVu", fontSize: 8, cellPadding: 3, lineColor: [120, 120, 120], lineWidth: 0.3 },
    headStyles: { font: "DejaVu", fontStyle: "bold", fillColor: [230, 230, 230], textColor: 20, lineColor: [80, 80, 80], lineWidth: 0.5 },
    columnStyles: {
      0: { halign: "right", cellWidth: 24 },
      1: { cellWidth: 78 },
      2: { cellWidth: 78 },
      3: { halign: "right", cellWidth: 28 },
      4: { cellWidth: "auto" },
      5: { halign: "right", cellWidth: 60 },
      6: { halign: "right", cellWidth: 60 },
      7: { halign: "right", cellWidth: 66 },
    },
    didDrawPage: () => {
      drawHeader();
      // Lábléc
      doc.setFont("DejaVu", "normal"); doc.setFontSize(7);
      doc.setTextColor(80);
      const closerName = (closer as any)?.contact_name ?? (closer as any)?.company_name ?? "";
      const footer = `Készítette: ${closerName} | Zárás: ${fmtDateTime(c.closed_at)} | Verzió: ${c.version}`;
      doc.text(footer, margin, pageH - 14);
      const pg = (doc as any).internal.getNumberOfPages();
      doc.text(`${doc.getCurrentPageInfo().pageNumber} / ${pg}`, pageW - margin, pageH - 14, { align: "right" });
      doc.setTextColor(0);
    },
  });

  // 6) Címletjegyzék (ha van)
  if ((denoms ?? []).length > 0 || c.counted_cash != null) {
    let y = (doc as any).lastAutoTable.finalY + 18;
    if (y > pageH - margin - 160) { doc.addPage(); drawHeader(); y = margin + 70; }
    doc.setFont("DejaVu", "bold"); doc.setFontSize(11);
    doc.text("CÍMLETJEGYZÉK (rovancs)", margin, y);
    y += 6;
    const dBody = (denoms ?? []).map((d: any) => [
      `${Number(d.denomination).toLocaleString("hu-HU")} Ft`,
      String(d.count),
      fmtHUF(Number(d.denomination) * Number(d.count)),
    ]);
    const denomSum = (denoms ?? []).reduce((s: number, d: any) => s + Number(d.denomination) * Number(d.count), 0);
    autoTable(doc, {
      startY: y + 4,
      margin: { left: margin, right: margin },
      head: [["Címlet", "Darab", "Összeg Ft"]],
      body: dBody,
      styles: { font: "DejaVu", fontSize: 9, cellPadding: 3 },
      headStyles: { font: "DejaVu", fontStyle: "bold", fillColor: [230, 230, 230], textColor: 20 },
      columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 60, halign: "right" }, 2: { cellWidth: 100, halign: "right" } },
      tableWidth: "wrap",
    });
    let y2 = (doc as any).lastAutoTable.finalY + 14;
    doc.setFont("DejaVu", "bold"); doc.setFontSize(10);
    const counted = Number(c.counted_cash ?? denomSum);
    doc.text(`Tényleges készpénz: ${fmtHUF(counted)} Ft`, margin, y2); y2 += 14;
    doc.setFont("DejaVu", "normal");
    doc.text(`Könyv szerinti: ${fmtHUF(Number(c.closing_balance))} Ft`, margin, y2); y2 += 14;
    const diff = Number(c.difference ?? counted - Number(c.closing_balance));
    doc.setFont("DejaVu", "bold");
    if (diff === 0) doc.setTextColor(0, 100, 0); else doc.setTextColor(170, 0, 0);
    doc.text(`Eltérés: ${fmtHUF(diff)} Ft`, margin, y2);
    doc.setTextColor(0); y2 += 14;
    if (c.difference_note) {
      doc.setFont("DejaVu", "normal"); doc.setFontSize(9);
      doc.text(`Megjegyzés: ${c.difference_note}`, margin, y2, { maxWidth: pageW - 2 * margin });
    }
  }

  doc.save(`${c.closing_number}.pdf`);
}
