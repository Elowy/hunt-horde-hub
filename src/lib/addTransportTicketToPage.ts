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

export const addTransportTicketToPage = async (
  doc: jsPDF,
  animal: Animal,
  transportInfo: TransportInfo,
  securityZone: SecurityZone | null
): Promise<void> => {
  // Add title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Vadkisero jegy", 105, 20, { align: "center" });
  
  // Add section number
  doc.setFontSize(14);
  doc.text(`${new Date().getFullYear()}/${animal.animal_id}`, 105, 30, { align: "center" });
  
  // Create table-like structure
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  let yPos = 45;
  const leftCol = 20;
  const rightCol = 110;
  const lineHeight = 8;
  
  // Left column
  doc.setFont("helvetica", "bold");
  doc.text("Megye NUTS kodja:", leftCol, yPos);
  doc.setFont("helvetica", "normal");
  doc.text("-", leftCol + 50, yPos);
  
  yPos += lineHeight;
  doc.setFont("helvetica", "bold");
  doc.text("Azonosito jel szama:", leftCol, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(animal.animal_id, leftCol + 50, yPos);
  
  yPos += lineHeight;
  doc.setFont("helvetica", "bold");
  doc.text("Elejtes helye*:", leftCol, yPos);
  doc.setFont("helvetica", "normal");
  const location = securityZone?.settlements?.name || securityZone?.name || "-";
  doc.text(location, leftCol + 50, yPos);
  
  yPos += lineHeight;
  doc.setFont("helvetica", "bold");
  doc.text("Elejtes ideje:", leftCol, yPos);
  doc.setFont("helvetica", "normal");
  const coolingDate = animal.cooling_date 
    ? new Date(animal.cooling_date).toLocaleString("hu-HU")
    : "-";
  doc.text(coolingDate, leftCol + 50, yPos);
  
  yPos += lineHeight;
  doc.setFont("helvetica", "bold");
  doc.text("Vad faja, kora:", leftCol, yPos);
  doc.setFont("helvetica", "normal");
  const speciesAge = `${animal.species}, ${animal.age || "-"}`;
  doc.text(speciesAge, leftCol + 50, yPos);
  
  // Right column
  yPos = 45;
  doc.setFont("helvetica", "bold");
  doc.text("Eszlelt elvaltozasok:", rightCol, yPos);
  doc.setFont("helvetica", "normal");
  const splitNotes = doc.splitTextToSize(animal.vet_notes || "-", 70);
  doc.text(splitNotes, rightCol, yPos + lineHeight);
  
  yPos += lineHeight * (splitNotes.length + 1);
  doc.setFont("helvetica", "bold");
  doc.text("Elejtes elott tapasztalt:", rightCol, yPos);
  doc.setFont("helvetica", "normal");
  const splitPreNotes = doc.splitTextToSize(animal.notes || "-", 70);
  doc.text(splitPreNotes, rightCol, yPos + lineHeight);
  
  yPos = Math.max(yPos + lineHeight * (splitPreNotes.length + 2), 100);
  
  // Vadászatra jogosult section
  doc.setFont("helvetica", "bold");
  doc.text("Vadaszatra jogosult kodszama:", leftCol, yPos);
  doc.setFont("helvetica", "normal");
  doc.text("-", leftCol + 60, yPos);
  
  yPos += lineHeight * 2;
  
  // Vizsgálat section
  doc.setFont("helvetica", "bold");
  doc.text("A vizsgalat helye, ideje:", rightCol, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(coolingDate, rightCol, yPos + lineHeight);
  
  yPos += lineHeight * 2;
  doc.setFont("helvetica", "bold");
  doc.text("A vizsgalo nyilvantartasi szama:", leftCol, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(animal.vet_doctor_name || "-", leftCol + 60, yPos);
  
  yPos += lineHeight * 3;
  
  // Vizsgálat eredménye
  doc.setFont("helvetica", "bold");
  doc.text("Jelolni a vizsgalat eredmenyet:", leftCol, yPos);
  
  yPos += lineHeight;
  doc.setFont("helvetica", "normal");
  const isApproved = animal.vet_check && animal.vet_result !== "kifogasolt";
  
  // Checkboxes
  doc.rect(leftCol, yPos, 4, 4);
  if (isApproved) doc.text("X", leftCol + 0.5, yPos + 3);
  doc.text("Kifogasmentes", leftCol + 7, yPos + 3);
  
  doc.rect(leftCol + 50, yPos, 4, 4);
  if (!isApproved) doc.text("X", leftCol + 50.5, yPos + 3);
  doc.text("Kifogasolt", leftCol + 57, yPos + 3);
  
  yPos += lineHeight;
  doc.text("hatosagi husvizsgalatra", leftCol + 7, yPos + 3);
  doc.text("hatosagi husvizsgalatra", leftCol + 57, yPos + 3);
  
  yPos += lineHeight * 3;
  
  // Signatures
  doc.setFont("helvetica", "bold");
  doc.text("Elejto neve:", leftCol, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(animal.hunter_name || "-", leftCol, yPos + lineHeight);
  
  doc.setFont("helvetica", "bold");
  doc.text("Vizsgalo neve:", rightCol, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(animal.vet_doctor_name || "-", rightCol, yPos + lineHeight);
  
  yPos += lineHeight * 3;
  doc.setFont("helvetica", "bold");
  doc.text("Elejto alairasa:", leftCol, yPos);
  doc.text("_________________", leftCol, yPos + 5);
  
  doc.text("Vizsgalo alairasa:", rightCol, yPos);
  doc.text("_________________", rightCol, yPos + 5);
  
  yPos += lineHeight * 4;
  
  // Footer notes
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text("*A legkozelebbi telepules nevet kell megadni", leftCol, yPos);
  yPos += 5;
  doc.text("**Csak vaddiszno eseten kell megadni korcsoport szerint", leftCol, yPos);
  
  // Transport information
  yPos += lineHeight * 2;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Szallitasi informaciok:", leftCol, yPos);
  doc.setFont("helvetica", "normal");
  yPos += lineHeight;
  doc.text(`Bizonylat szam: ${transportInfo.document_number}`, leftCol + 5, yPos);
  yPos += lineHeight;
  doc.text(`Szallitas datuma: ${new Date(transportInfo.transport_date).toLocaleDateString("hu-HU")}`, leftCol + 5, yPos);
  if (transportInfo.transporter_name) {
    yPos += lineHeight;
    doc.text(`Elszallito: ${transportInfo.transporter_name}`, leftCol + 5, yPos);
  }
  if (transportInfo.vehicle_plate) {
    yPos += lineHeight;
    doc.text(`Rendszam: ${transportInfo.vehicle_plate}`, leftCol + 5, yPos);
  }
};