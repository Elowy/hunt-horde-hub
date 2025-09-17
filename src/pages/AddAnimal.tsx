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
    weight: "",
    location: "",
    gpsLatitude: "",
    gpsLongitude: "",
    huntDate: "",
    hunter: "",
    status: "processing",
    notes: ""
  });

  const animalSubtypes = {
    deer: ["White-tailed", "Mule", "Blacktail", "Roe", "Red"],
    elk: ["Rocky Mountain", "Roosevelt", "Tule", "Manitoban"],
    moose: ["Alaska-Yukon", "Canada", "Shiras", "Eastern"],
    bear: ["Black Bear", "Brown Bear", "Grizzly", "Polar"],
    "wild-boar": ["European", "Feral Hog", "Russian", "Hybrid"],
    duck: ["Mallard", "Teal", "Canvasback", "Wood Duck", "Pintail"],
    pheasant: ["Ring-necked", "Golden", "Silver", "Reeves"],
    other: ["Custom"]
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
      weight: "",
      location: "",
      gpsLatitude: "",
      gpsLongitude: "",
      huntDate: "",
      hunter: "",
      status: "processing",
      notes: ""
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
                      <SelectItem value="deer">Deer</SelectItem>
                      <SelectItem value="elk">Elk</SelectItem>
                      <SelectItem value="moose">Moose</SelectItem>
                      <SelectItem value="bear">Bear</SelectItem>
                      <SelectItem value="wild-boar">Wild Boar</SelectItem>
                      <SelectItem value="duck">Duck</SelectItem>
                      <SelectItem value="pheasant">Pheasant</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
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