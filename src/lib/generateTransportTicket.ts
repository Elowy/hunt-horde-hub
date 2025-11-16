import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Animal {
  id: string;
  animal_id: string;
  species: string;
  age: string | null;
  gender: string | null;
  weight: number | null;
  hunter_name: string | null;
  cooling_date: string | null;
  vet_doctor_name: string | null;
  vet_result: string | null;
  vet_notes: string | null;
  vet_check: boolean | null;
  notes: string | null;
  security_zone_id: string | null;
}

interface TransportInfo {
  document_number: string;
  transport_date: string;
  transporter_name: string | null;
  vehicle_plate: string | null;
}

interface SecurityZone {
  name: string;
  settlement_id: string | null;
  settlements?: {
    name: string;
  };
}

export const generateTransportTicket = async (
  animal: Animal,
  transportInfo: TransportInfo,
  securityZone: SecurityZone | null
): Promise<Blob> => {
  const pdf = new jsPDF();
  
  // Add title
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text("Vadkisero jegy", 105, 20, { align: "center" });
  
  // Add section number
  pdf.setFontSize(14);
  pdf.text(`${new Date().getFullYear()}/${animal.animal_id}`, 105, 30, { align: "center" });
  
  const location = securityZone?.settlements?.name || securityZone?.name || "-";
  const coolingDate = animal.cooling_date 
    ? new Date(animal.cooling_date).toLocaleString("hu-HU")
    : "-";
  const speciesAge = `${animal.species}, ${animal.age || "-"}`;
  
  // Main information table
  autoTable(pdf, {
    startY: 40,
    head: [['Elejtési adatok', 'Vizsgálati adatok']],
    body: [
      ['Megye NUTS kódja: -', 'Észlelt elváltozások (test, zsiger):'],
      [`Azonosító jel száma: ${animal.animal_id}`, animal.vet_notes || "-"],
      [`Elejtés helye*: ${location}`, ''],
      [`Elejtés ideje: ${coolingDate}`, 'Elejtés előtt tapasztalt:'],
      [`Vad faja, kora: ${speciesAge}`, animal.notes || "-"],
    ],
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 95 },
      1: { cellWidth: 95 },
    },
  });
  
  // Hunting permit table
  autoTable(pdf, {
    startY: (pdf as any).lastAutoTable.finalY + 5,
    body: [
      ['Vadászatra jogosult kódszáma: -'],
    ],
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
    },
  });
  
  // Examination details table
  autoTable(pdf, {
    startY: (pdf as any).lastAutoTable.finalY + 5,
    body: [
      ['A vizsgálat helye, ideje:', coolingDate],
      ['A vizsgáló nyilvántartási száma:', animal.vet_doctor_name || "-"],
    ],
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
    },
    columnStyles: {
      0: { cellWidth: 95, fontStyle: 'bold' },
      1: { cellWidth: 95 },
    },
  });
  
  // Examination result
  let yPos = (pdf as any).lastAutoTable.finalY + 10;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("Aláhúzandólag jelölni a vizsgálat eredménye szerint:", 20, yPos);
  
  yPos += 8;
  pdf.setFont("helvetica", "normal");
  const isApproved = animal.vet_check && animal.vet_result !== "kifogasolt";
  
  // Result checkboxes in a table
  autoTable(pdf, {
    startY: yPos,
    body: [
      [
        isApproved ? '☑ Kifogásmentes' : '☐ Kifogásmentes',
        !isApproved ? '☑ Kifogásolt' : '☐ Kifogásolt'
      ],
      ['hatósági húsvizsgálatra', 'hatósági húsvizsgálatra'],
    ],
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 95 },
      1: { cellWidth: 95 },
    },
  });
  
  // Signatures table
  autoTable(pdf, {
    startY: (pdf as any).lastAutoTable.finalY + 10,
    body: [
      ['Elejtő neve:', animal.hunter_name || "-", 'Vizsgáló neve:', animal.vet_doctor_name || "-"],
      ['Elejtő aláírása:', '_________________', 'Vizsgáló aláírása:', '_________________'],
    ],
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 5,
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
    },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold' },
      1: { cellWidth: 50 },
      2: { cellWidth: 45, fontStyle: 'bold' },
      3: { cellWidth: 50 },
    },
  });
  
  // Footer notes
  yPos = (pdf as any).lastAutoTable.finalY + 10;
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "italic");
  pdf.text("*A legközelebbi település nevét kell megadni", 20, yPos);
  yPos += 5;
  pdf.text("**Csak vaddisznó esetén kell megadni korcsoport szerint: 1 év alatti, felnőtt", 20, yPos);
  
  // Transport information table
  autoTable(pdf, {
    startY: yPos + 5,
    head: [['Szállítási információk']],
    body: [
      [`Bizonylat szám: ${transportInfo.document_number}`],
      [`Szállítás dátuma: ${new Date(transportInfo.transport_date).toLocaleDateString("hu-HU")}`],
      ...(transportInfo.transporter_name ? [[`Elszállító: ${transportInfo.transporter_name}`]] : []),
      ...(transportInfo.vehicle_plate ? [[`Rendszám: ${transportInfo.vehicle_plate}`]] : []),
    ],
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
  });
  
  return pdf.output("blob");
};