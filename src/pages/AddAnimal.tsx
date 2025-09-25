import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, PlusCircle } from "lucide-react";

const AddAnimal = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    animalId: "",
    type: "",
    subtype: "",
    gender: "",
    age: "",
    class: "",
    weight: "",
    location: "",
    village: "",
    gpsLatitude: "",
    gpsLongitude: "",
    huntDate: "",
    hunter: "",
    hunterType: "",
    status: "processing",
    notes: "",
    comment: "",
    sampleId: "",
    sampleReturnId: "",
    animalDoctor: "",
    refoundFeeWildBoar: "",
    shootFeeWildBoar: "",
    sampleCollectionFeeWildBoar: "",
    shoppingId: "",
    usage: "",
    priceWithVat: "",
    priceWithoutVat: "",
    invoiceNo: ""
  });

  const animalSubtypes = {
    "vaddiszno": ["Kan", "Koca", "Süldő", "Malac"],
    "gim-szarvas": ["Bika", "Tehén", "Ünő", "Borjú"],
    "dam-szarvas": ["Bika", "Tehén", "Ünő", "Borjú"],
    "oz": ["Bak", "Suta", "Gida"],
    "muflon": ["Kos", "Jerke", "Bárány"]
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      // Reset subtype when type changes
      if (field === "type") {
        newData.subtype = "";
      }
      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Here you would integrate with Supabase to save the animal data
    console.log("Animal data to save:", formData);
    
    toast({
      title: "Állat Sikeresen Hozzáadva",
      description: `${formData.type} (ID: ${formData.animalId}) hozzáadva a tárolóhoz.`,
    });
    
    // Reset form
    setFormData({
      animalId: "",
      type: "",
      subtype: "",
      gender: "",
      age: "",
      class: "",
      weight: "",
      location: "",
      village: "",
      gpsLatitude: "",
      gpsLongitude: "",
      huntDate: "",
      hunter: "",
      hunterType: "",
      status: "processing",
      notes: "",
      comment: "",
      sampleId: "",
      sampleReturnId: "",
      animalDoctor: "",
      refoundFeeWildBoar: "",
      shootFeeWildBoar: "",
      sampleCollectionFeeWildBoar: "",
      shoppingId: "",
      usage: "",
      priceWithVat: "",
      priceWithoutVat: "",
      invoiceNo: ""
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-hunt-dark via-hunt-primary to-hunt-secondary">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="text-white hover:bg-white/10 mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Vissza az Irányítópulthoz
          </Button>
          <h1 className="text-3xl font-bold text-white">Új Állat Hozzáadása</h1>
        </div>

        <Card className="max-w-2xl mx-auto bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-hunt-dark">
              <PlusCircle className="w-6 h-6 mr-2" />
              Állat Információk
            </CardTitle>
            <CardDescription>
              Adja meg a tárolóba kerülő állat adatait
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="animalId">Állat ID *</Label>
                  <Input
                    id="animalId"
                    value={formData.animalId}
                    onChange={(e) => handleInputChange("animalId", e.target.value)}
                    placeholder="Adja meg az egyedi állatazonosítót"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Állat Típusa *</Label>
                  <Select value={formData.type} onValueChange={(value) => handleInputChange("type", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Válasszon állattípust" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vaddiszno">Vaddisznó</SelectItem>
                      <SelectItem value="gim-szarvas">Gím Szarvas</SelectItem>
                      <SelectItem value="dam-szarvas">Dám Szarvas</SelectItem>
                      <SelectItem value="oz">Őz</SelectItem>
                      <SelectItem value="muflon">Muflon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subtype">Állat Altípusa</Label>
                  <Select 
                    value={formData.subtype} 
                    onValueChange={(value) => handleInputChange("subtype", value)}
                    disabled={!formData.type}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.type ? "Válasszon altípust" : "Először válasszon állattípust"} />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.type && animalSubtypes[formData.type as keyof typeof animalSubtypes]?.map((subtype) => (
                        <SelectItem key={subtype} value={subtype.toLowerCase().replace(/\s+/g, '-')}>
                          {subtype}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Nem</Label>
                  <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Válasszon nemet" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Hím</SelectItem>
                      <SelectItem value="female">Nőstény</SelectItem>
                      <SelectItem value="unknown">Ismeretlen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Kor</Label>
                  <Input
                    id="age"
                    value={formData.age}
                    onChange={(e) => handleInputChange("age", e.target.value)}
                    placeholder="pl. 3 év vagy felnőtt"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="class">Osztály</Label>
                  <Select value={formData.class} onValueChange={(value) => handleInputChange("class", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Válasszon osztályt" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-osztaly">1. osztály</SelectItem>
                      <SelectItem value="2-osztaly">2. osztály</SelectItem>
                      <SelectItem value="3-osztaly">3. osztály</SelectItem>
                      <SelectItem value="kobzott">Kobzott</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight">Súly (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={formData.weight}
                    onChange={(e) => handleInputChange("weight", e.target.value)}
                    placeholder="pl. 80"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Helyszín *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                    placeholder="pl. Északi gerinc"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="village">Település</Label>
                  <Input
                    id="village"
                    value={formData.village}
                    onChange={(e) => handleInputChange("village", e.target.value)}
                    placeholder="pl. Folyóparti falu"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gpsLatitude">GPS Szélesség</Label>
                  <Input
                    id="gpsLatitude"
                    type="number"
                    step="any"
                    value={formData.gpsLatitude}
                    onChange={(e) => handleInputChange("gpsLatitude", e.target.value)}
                    placeholder="pl. 47.4979"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gpsLongitude">GPS Hosszúság</Label>
                  <Input
                    id="gpsLongitude"
                    type="number"
                    step="any"
                    value={formData.gpsLongitude}
                    onChange={(e) => handleInputChange("gpsLongitude", e.target.value)}
                    placeholder="pl. 19.0402"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="huntDate">Elejtés Dátuma *</Label>
                  <Input
                    id="huntDate"
                    type="date"
                    value={formData.huntDate}
                    onChange={(e) => handleInputChange("huntDate", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hunter">Vadász Neve *</Label>
                  <Input
                    id="hunter"
                    value={formData.hunter}
                    onChange={(e) => handleInputChange("hunter", e.target.value)}
                    placeholder="pl. Kovács János"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hunterType">Vadász Típusa</Label>
                  <Select value={formData.hunterType} onValueChange={(value) => handleInputChange("hunterType", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Válasszon vadász típust" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Helyi Vadász</SelectItem>
                      <SelectItem value="tourist">Turista</SelectItem>
                      <SelectItem value="professional">Profi</SelectItem>
                      <SelectItem value="guide">Vadászvezető</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sample and Medical Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-hunt-dark border-b pb-2">Minta & Orvosi Információ</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sampleId">Minta ID</Label>
                    <Input
                      id="sampleId"
                      value={formData.sampleId}
                      onChange={(e) => handleInputChange("sampleId", e.target.value)}
                      placeholder="pl. MTA-2024-001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sampleReturnId">Minta Visszaadás ID</Label>
                    <Input
                      id="sampleReturnId"
                      value={formData.sampleReturnId}
                      onChange={(e) => handleInputChange("sampleReturnId", e.target.value)}
                      placeholder="pl. VSZ-2024-001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="animalDoctor">Állatorvos</Label>
                    <Input
                      id="animalDoctor"
                      value={formData.animalDoctor}
                      onChange={(e) => handleInputChange("animalDoctor", e.target.value)}
                      placeholder="pl. Dr. Nagy István"
                    />
                  </div>
                </div>
              </div>

              {/* Wild Boar Specific Fees */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-hunt-dark border-b pb-2">Vaddisznó díjak (ha van)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="refoundFeeWildBoar">Visszatérítési Díj</Label>
                    <Input
                      id="refoundFeeWildBoar"
                      type="number"
                      step="0.01"
                      value={formData.refoundFeeWildBoar}
                      onChange={(e) => handleInputChange("refoundFeeWildBoar", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shootFeeWildBoar">Elejtési Díj</Label>
                    <Input
                      id="shootFeeWildBoar"
                      type="number"
                      step="0.01"
                      value={formData.shootFeeWildBoar}
                      onChange={(e) => handleInputChange("shootFeeWildBoar", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sampleCollectionFeeWildBoar">Mintavételi Díj</Label>
                    <Input
                      id="sampleCollectionFeeWildBoar"
                      type="number"
                      step="0.01"
                      value={formData.sampleCollectionFeeWildBoar}
                      onChange={(e) => handleInputChange("sampleCollectionFeeWildBoar", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* Commercial Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-hunt-dark border-b pb-2">Kereskedelmi Információk</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shoppingId">Vásárlási ID</Label>
                    <Input
                      id="shoppingId"
                      value={formData.shoppingId}
                      onChange={(e) => handleInputChange("shoppingId", e.target.value)}
                      placeholder="pl. VAS-2024-001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="usage">Felhasználás</Label>
                    <Select value={formData.usage} onValueChange={(value) => handleInputChange("usage", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Válasszon felhasználást" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">Személyes</SelectItem>
                        <SelectItem value="commercial">Kereskedelmi</SelectItem>
                        <SelectItem value="trophy">Trófea</SelectItem>
                        <SelectItem value="meat">Húsfeldolgozás</SelectItem>
                        <SelectItem value="research">Kutatás</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priceWithVat">Ár ÁFA-val</Label>
                    <Input
                      id="priceWithVat"
                      type="number"
                      step="0.01"
                      value={formData.priceWithVat}
                      onChange={(e) => handleInputChange("priceWithVat", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priceWithoutVat">Ár ÁFA nélkül</Label>
                    <Input
                      id="priceWithoutVat"
                      type="number"
                      step="0.01"
                      value={formData.priceWithoutVat}
                      onChange={(e) => handleInputChange("priceWithoutVat", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="invoiceNo">Számla Szám</Label>
                    <Input
                      id="invoiceNo"
                      value={formData.invoiceNo}
                      onChange={(e) => handleInputChange("invoiceNo", e.target.value)}
                      placeholder="pl. SZA-2024-001"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Feldolgozási Állapot</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="processing">Feldolgozás alatt</SelectItem>
                    <SelectItem value="ready">Kész</SelectItem>
                    <SelectItem value="picked-up">Átvéve</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">További Megjegyzések</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="További információk az állatról..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Megjegyzés</Label>
                <Textarea
                  id="comment"
                  value={formData.comment}
                  onChange={(e) => handleInputChange("comment", e.target.value)}
                  placeholder="További megjegyzések vagy speciális utasítások..."
                  rows={3}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1" variant="hunting">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Állat Hozzáadása
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/dashboard")}
                  className="flex-1"
                >
                  Mégse
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AddAnimal;