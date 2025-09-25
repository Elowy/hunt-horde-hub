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
      title: "Animal Added Successfully",
      description: `${formData.type} (ID: ${formData.animalId}) has been added to storage.`,
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
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-white">Add New Animal</h1>
        </div>

        <Card className="max-w-2xl mx-auto bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-hunt-dark">
              <PlusCircle className="w-6 h-6 mr-2" />
              Animal Information
            </CardTitle>
            <CardDescription>
              Enter the details of the animal being added to storage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="animalId">Animal ID *</Label>
                  <Input
                    id="animalId"
                    value={formData.animalId}
                    onChange={(e) => handleInputChange("animalId", e.target.value)}
                    placeholder="Enter unique animal identifier"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Animal Type *</Label>
                  <Select value={formData.type} onValueChange={(value) => handleInputChange("type", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select animal type" />
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
                  <Label htmlFor="subtype">Animal Subtype</Label>
                  <Select 
                    value={formData.subtype} 
                    onValueChange={(value) => handleInputChange("subtype", value)}
                    disabled={!formData.type}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.type ? "Select subtype" : "Select animal type first"} />
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
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    value={formData.age}
                    onChange={(e) => handleInputChange("age", e.target.value)}
                    placeholder="e.g., 3 years or Adult"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="class">Class</Label>
                  <Select value={formData.class} onValueChange={(value) => handleInputChange("class", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trophy">Trophy</SelectItem>
                      <SelectItem value="medal">Medal</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="young">Young</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (lbs)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={formData.weight}
                    onChange={(e) => handleInputChange("weight", e.target.value)}
                    placeholder="e.g., 180"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                    placeholder="e.g., North Ridge"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="village">Village</Label>
                  <Input
                    id="village"
                    value={formData.village}
                    onChange={(e) => handleInputChange("village", e.target.value)}
                    placeholder="e.g., Riverside Village"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gpsLatitude">GPS Latitude</Label>
                  <Input
                    id="gpsLatitude"
                    type="number"
                    step="any"
                    value={formData.gpsLatitude}
                    onChange={(e) => handleInputChange("gpsLatitude", e.target.value)}
                    placeholder="e.g., 40.7128"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gpsLongitude">GPS Longitude</Label>
                  <Input
                    id="gpsLongitude"
                    type="number"
                    step="any"
                    value={formData.gpsLongitude}
                    onChange={(e) => handleInputChange("gpsLongitude", e.target.value)}
                    placeholder="e.g., -74.0060"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="huntDate">Hunt Date *</Label>
                  <Input
                    id="huntDate"
                    type="date"
                    value={formData.huntDate}
                    onChange={(e) => handleInputChange("huntDate", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hunter">Hunter Name *</Label>
                  <Input
                    id="hunter"
                    value={formData.hunter}
                    onChange={(e) => handleInputChange("hunter", e.target.value)}
                    placeholder="e.g., John Smith"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hunterType">Hunter Type</Label>
                  <Select value={formData.hunterType} onValueChange={(value) => handleInputChange("hunterType", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select hunter type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local Hunter</SelectItem>
                      <SelectItem value="tourist">Tourist</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="guide">Guide</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sample and Medical Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-hunt-dark border-b pb-2">Sample & Medical Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sampleId">Sample ID</Label>
                    <Input
                      id="sampleId"
                      value={formData.sampleId}
                      onChange={(e) => handleInputChange("sampleId", e.target.value)}
                      placeholder="e.g., SMP-2024-001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sampleReturnId">Sample Return ID</Label>
                    <Input
                      id="sampleReturnId"
                      value={formData.sampleReturnId}
                      onChange={(e) => handleInputChange("sampleReturnId", e.target.value)}
                      placeholder="e.g., RTN-2024-001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="animalDoctor">Animal Doctor</Label>
                    <Input
                      id="animalDoctor"
                      value={formData.animalDoctor}
                      onChange={(e) => handleInputChange("animalDoctor", e.target.value)}
                      placeholder="e.g., Dr. Smith"
                    />
                  </div>
                </div>
              </div>

              {/* Wild Boar Specific Fees */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-hunt-dark border-b pb-2">Wild Boar Fees (if applicable)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="refoundFeeWildBoar">Refund Fee</Label>
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
                    <Label htmlFor="shootFeeWildBoar">Shoot Fee</Label>
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
                    <Label htmlFor="sampleCollectionFeeWildBoar">Sample Collection Fee</Label>
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
                <h3 className="text-lg font-semibold text-hunt-dark border-b pb-2">Commercial Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shoppingId">Shopping ID</Label>
                    <Input
                      id="shoppingId"
                      value={formData.shoppingId}
                      onChange={(e) => handleInputChange("shoppingId", e.target.value)}
                      placeholder="e.g., SHP-2024-001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="usage">Usage</Label>
                    <Select value={formData.usage} onValueChange={(value) => handleInputChange("usage", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select usage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="trophy">Trophy</SelectItem>
                        <SelectItem value="meat">Meat Processing</SelectItem>
                        <SelectItem value="research">Research</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priceWithVat">Price With VAT</Label>
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
                    <Label htmlFor="priceWithoutVat">Price Without VAT</Label>
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
                    <Label htmlFor="invoiceNo">Invoice Number</Label>
                    <Input
                      id="invoiceNo"
                      value={formData.invoiceNo}
                      onChange={(e) => handleInputChange("invoiceNo", e.target.value)}
                      placeholder="e.g., INV-2024-001"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Processing Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="picked-up">Picked Up</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Any additional information about the animal..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Comment</Label>
                <Textarea
                  id="comment"
                  value={formData.comment}
                  onChange={(e) => handleInputChange("comment", e.target.value)}
                  placeholder="Additional comments or special instructions..."
                  rows={3}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1" variant="hunting">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Add Animal
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/dashboard")}
                  className="flex-1"
                >
                  Cancel
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