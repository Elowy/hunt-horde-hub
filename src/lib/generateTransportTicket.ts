import jsPDF from "jspdf";

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
  
  // Add section number (could be dynamic)
  pdf.setFontSize(14);
  pdf.text(`${new Date().getFullYear()}/${animal.animal_id}`, 105, 30, { align: "center" });
  
  // Create table-like structure
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  
  let yPos = 45;
  const leftCol = 20;
  const rightCol = 110;
  const lineHeight = 8;
  
  // Left column - Elejtés adatai
  pdf.setFont("helvetica", "bold");
  pdf.text("Megye NUTS kodja:", leftCol, yPos);
  pdf.setFont("helvetica", "normal");
  pdf.text("-", leftCol + 50, yPos);
  
  yPos += lineHeight;
  pdf.setFont("helvetica", "bold");
  pdf.text("Azonosito jel szama:", leftCol, yPos);
  pdf.setFont("helvetica", "normal");
  pdf.text(animal.animal_id, leftCol + 50, yPos);
  
  yPos += lineHeight;
  pdf.setFont("helvetica", "bold");
  pdf.text("Elejtes helye*:", leftCol, yPos);
  pdf.setFont("helvetica", "normal");
  const location = securityZone?.settlements?.name || securityZone?.name || "-";
  pdf.text(location, leftCol + 50, yPos);
  
  yPos += lineHeight;
  pdf.setFont("helvetica", "bold");
  pdf.text("Elejtes ideje:", leftCol, yPos);
  pdf.setFont("helvetica", "normal");
  const coolingDate = animal.cooling_date 
    ? new Date(animal.cooling_date).toLocaleString("hu-HU")
    : "-";
  pdf.text(coolingDate, leftCol + 50, yPos);
  
  yPos += lineHeight;
  pdf.setFont("helvetica", "bold");
  pdf.text("Vad faja, kora:", leftCol, yPos);
  pdf.setFont("helvetica", "normal");
  const speciesAge = `${animal.species}, ${animal.age || "-"}`;
  pdf.text(speciesAge, leftCol + 50, yPos);
  
  // Right column - Vizsgálat adatai
  yPos = 45;
  pdf.setFont("helvetica", "bold");
  pdf.text("Eszlelt elvaltozasok (test, zsiger):", rightCol, yPos);
  pdf.setFont("helvetica", "normal");
  const splitNotes = pdf.splitTextToSize(animal.vet_notes || "-", 70);
  pdf.text(splitNotes, rightCol, yPos + lineHeight);
  
  yPos += lineHeight * (splitNotes.length + 1);
  pdf.setFont("helvetica", "bold");
  pdf.text("Elejtes elott tapasztalt:", rightCol, yPos);
  pdf.setFont("helvetica", "normal");
  const splitPreNotes = pdf.splitTextToSize(animal.notes || "-", 70);
  pdf.text(splitPreNotes, rightCol, yPos + lineHeight);
  
  // Add more space for next section
  yPos = Math.max(yPos + lineHeight * (splitPreNotes.length + 2), 100);
  
  // Vadászatra jogosult section
  pdf.setFont("helvetica", "bold");
  pdf.text("Vadaszatra jogosult kodszama:", leftCol, yPos);
  pdf.setFont("helvetica", "normal");
  pdf.text("-", leftCol + 60, yPos);
  
  yPos += lineHeight * 2;
  
  // Vizsgálat section
  pdf.setFont("helvetica", "bold");
  pdf.text("A vizsgalat helye, ideje:", rightCol, yPos);
  pdf.setFont("helvetica", "normal");
  pdf.text(coolingDate, rightCol, yPos + lineHeight);
  
  yPos += lineHeight * 2;
  pdf.setFont("helvetica", "bold");
  pdf.text("A vizsgalo nyilvantartasi szama:", leftCol, yPos);
  pdf.setFont("helvetica", "normal");
  pdf.text(animal.vet_doctor_name || "-", leftCol + 60, yPos);
  
  yPos += lineHeight * 3;
  
  // Vizsgálat eredménye
  pdf.setFont("helvetica", "bold");
  pdf.text("Alahuznandolag jelolni a vizsgalat eredmenye szerint:", leftCol, yPos);
  
  yPos += lineHeight;
  pdf.setFont("helvetica", "normal");
  const isApproved = animal.vet_check && animal.vet_result !== "kifogasolt";
  
  // Kifogásmentes / Kifogásolt checkboxes
  pdf.rect(leftCol, yPos, 4, 4);
  if (isApproved) pdf.text("X", leftCol + 0.5, yPos + 3);
  pdf.text("Kifogasmentes", leftCol + 7, yPos + 3);
  
  pdf.rect(leftCol + 50, yPos, 4, 4);
  if (!isApproved) pdf.text("X", leftCol + 50.5, yPos + 3);
  pdf.text("Kifogasolt", leftCol + 57, yPos + 3);
  
  yPos += lineHeight;
  pdf.text("hatosagi husvizsgalatra", leftCol + 7, yPos + 3);
  pdf.text("hatosagi husvizsgalatra", leftCol + 57, yPos + 3);
  
  yPos += lineHeight * 3;
  
  // Signatures section
  pdf.setFont("helvetica", "bold");
  pdf.text("Elejto neve:", leftCol, yPos);
  pdf.setFont("helvetica", "normal");
  pdf.text(animal.hunter_name || "-", leftCol, yPos + lineHeight);
  
  pdf.setFont("helvetica", "bold");
  pdf.text("Vizsgalo neve:", rightCol, yPos);
  pdf.setFont("helvetica", "normal");
  pdf.text(animal.vet_doctor_name || "-", rightCol, yPos + lineHeight);
  
  yPos += lineHeight * 3;
  pdf.setFont("helvetica", "bold");
  pdf.text("Elejto alairasa:", leftCol, yPos);
  pdf.text("_________________", leftCol, yPos + 5);
  
  pdf.text("Vizsgalo alairasa:", rightCol, yPos);
  pdf.text("_________________", rightCol, yPos + 5);
  
  yPos += lineHeight * 4;
  
  // Footer notes
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "italic");
  pdf.text("*A legkozelebbi telepules nevet kell megadni", leftCol, yPos);
  yPos += 5;
  pdf.text("**Csak vaddiszno eseten kell megadni korcsoport szerint: 1 ev alatti, felnott", leftCol, yPos);
  
  // Add transport information at the bottom
  yPos += lineHeight * 2;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text("Szallitasi informaciok:", leftCol, yPos);
  pdf.setFont("helvetica", "normal");
  yPos += lineHeight;
  pdf.text(`Bizonylat szam: ${transportInfo.document_number}`, leftCol + 5, yPos);
  yPos += lineHeight;
  pdf.text(`Szallitas datuma: ${new Date(transportInfo.transport_date).toLocaleDateString("hu-HU")}`, leftCol + 5, yPos);
  if (transportInfo.transporter_name) {
    yPos += lineHeight;
    pdf.text(`Elszallito: ${transportInfo.transporter_name}`, leftCol + 5, yPos);
  }
  if (transportInfo.vehicle_plate) {
    yPos += lineHeight;
    pdf.text(`Rendszam: ${transportInfo.vehicle_plate}`, leftCol + 5, yPos);
  }
  
  return pdf.output("blob");
};