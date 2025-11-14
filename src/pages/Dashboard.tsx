import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, Eye, Edit, Trash2, MapPin, LogOut, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { StorageLocationDialog } from "@/components/StorageLocationDialog";

interface StorageLocation {
  id: string;
  name: string;
  address: string | null;
  capacity: number | null;
  is_default: boolean;
}

interface Animal {
  id: string;
  animal_id: string;
  species: string;
  weight: number | null;
  cooling_date: string | null;
  storage_location_id: string;
  hunter_name: string | null;
  class: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLocation, setFilterLocation] = useState("all");
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
    }
  };

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [locationsResult, animalsResult] = await Promise.all([
        supabase
          .from("storage_locations")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("animals")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (locationsResult.error) throw locationsResult.error;
      if (animalsResult.error) throw animalsResult.error;

      setLocations(locationsResult.data || []);
      setAnimals(animalsResult.data || []);
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleSetDefaultLocation = async (locationId: string) => {
    try {
      const { error } = await supabase
        .from("storage_locations")
        .update({ is_default: true })
        .eq("id", locationId);

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "Alapértelmezett helyszín beállítva!",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredAnimals = animals.filter(animal => {
    const matchesSearch = 
      animal.species.toLowerCase().includes(searchTerm.toLowerCase()) ||
      animal.animal_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = 
      filterLocation === "all" || animal.storage_location_id === filterLocation;
    
    return matchesSearch && matchesFilter;
  });

  const getLocationName = (locationId: string) => {
    const location = locations.find(l => l.id === locationId);
    return location?.name || "Ismeretlen";
  };

  const getAnimalsByLocation = (locationId: string) => {
    return animals.filter(a => a.storage_location_id === locationId).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Betöltés...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-forest-deep to-forest-light text-white py-8">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Állat Nyilvántartó</h1>
              <p className="text-primary-foreground/90">Vadászati nyilvántartás és hűtés kezelése</p>
            </div>
            <Button variant="outline" onClick={handleLogout} className="text-white border-white hover:bg-white/10">
              <LogOut className="h-4 w-4 mr-2" />
              Kijelentkezés
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Hűtési helyszínek */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-forest-deep">Hűtési helyszínek</h2>
            <StorageLocationDialog onLocationAdded={fetchData} />
          </div>
          
          {locations.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Még nincs hűtési helyszín. Adjon hozzá egyet a kezdéshez!
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {locations.map((location) => (
                <Card key={location.id} className={location.is_default ? "border-hunt-orange border-2" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-hunt-orange" />
                        <CardTitle className="text-lg">{location.name}</CardTitle>
                        {location.is_default && (
                          <Badge variant="outline" className="text-hunt-orange border-hunt-orange">
                            Alapértelmezett
                          </Badge>
                        )}
                      </div>
                      {!location.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefaultLocation(location.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Star className="h-4 w-4 text-muted-foreground hover:text-hunt-orange" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {location.address && (
                      <p className="text-sm text-muted-foreground">{location.address}</p>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Állatok:</span>
                      <span className="font-semibold">{getAnimalsByLocation(location.id)}</span>
                    </div>
                    {location.capacity && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Kapacitás:</span>
                        <span className="font-semibold">{location.capacity} db</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Összes állat</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-forest-deep">{animals.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Helyszínek</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{locations.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Szarvasok</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {animals.filter(a => a.species.toLowerCase().includes("szarvas")).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Vaddisznók</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {animals.filter(a => a.species.toLowerCase().includes("disznó")).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Keresés faj vagy azonosító alapján..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={filterLocation} onValueChange={setFilterLocation}>
                  <SelectTrigger className="w-[200px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Helyszín" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Minden helyszín</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button variant="hunting" onClick={() => navigate("/add-animal")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Új állat
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Animals Table */}
        <Card>
          <CardHeader>
            <CardTitle>Állat nyilvántartás</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredAnimals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {animals.length === 0 
                  ? "Még nincs állat. Adjon hozzá egyet a kezdéshez!"
                  : "Nincs találat a keresési feltételeknek megfelelően."
                }
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vadazonosító</TableHead>
                      <TableHead>Faj</TableHead>
                      <TableHead>Súly (kg)</TableHead>
                      <TableHead>Osztály</TableHead>
                      <TableHead>Vadász</TableHead>
                      <TableHead>Helyszín</TableHead>
                      <TableHead>Dátum</TableHead>
                      <TableHead className="text-right">Műveletek</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAnimals.map((animal) => (
                      <TableRow key={animal.id}>
                        <TableCell className="font-medium">{animal.animal_id}</TableCell>
                        <TableCell>{animal.species}</TableCell>
                        <TableCell>{animal.weight || "-"}</TableCell>
                        <TableCell>
                          {animal.class ? (
                            <Badge variant="outline">{animal.class}</Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell>{animal.hunter_name || "-"}</TableCell>
                        <TableCell>{getLocationName(animal.storage_location_id)}</TableCell>
                        <TableCell>
                          {animal.cooling_date 
                            ? new Date(animal.cooling_date).toLocaleDateString("hu-HU")
                            : "-"
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
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
    </div>
  );
};

export default Dashboard;
