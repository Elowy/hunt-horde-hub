import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Building2, Package, Truck, FileText, MapPin, Shield, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  user_type: string | null;
}

interface Animal {
  id: string;
  animal_id: string;
  species: string;
  weight: number | null;
  created_at: string;
}

interface StorageLocation {
  id: string;
  name: string;
  address: string | null;
  capacity: number | null;
  is_default: boolean | null;
}

interface Transporter {
  id: string;
  company_name: string;
  contact_name: string | null;
  address: string | null;
}

interface TransportDocument {
  id: string;
  document_number: string;
  transport_date: string;
  total_weight: number;
  animal_count: number;
}

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSuperAdmin, loading: checkingAdmin } = useIsSuperAdmin();
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [transportDocuments, setTransportDocuments] = useState<TransportDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!checkingAdmin && !isSuperAdmin) {
      toast({
        title: "Hozzáférés megtagadva",
        description: "Csak super adminok férhetnek hozzá ehhez az oldalhoz.",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  }, [isSuperAdmin, checkingAdmin, navigate, toast]);

  useEffect(() => {
    if (isSuperAdmin) {
      loadAllData();
    }
  }, [isSuperAdmin]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [profilesData, animalsData, locationsData, transportersData, documentsData] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("animals").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("storage_locations").select("*"),
        supabase.from("transporters").select("*"),
        supabase.from("transport_documents").select("*").order("transport_date", { ascending: false }).limit(50),
      ]);

      if (profilesData.data) setProfiles(profilesData.data);
      if (animalsData.data) setAnimals(animalsData.data);
      if (locationsData.data) setStorageLocations(locationsData.data);
      if (transportersData.data) setTransporters(transportersData.data);
      if (documentsData.data) setTransportDocuments(documentsData.data);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni az adatokat",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingAdmin || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted p-4 md:p-8">
      <div className="container mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground flex items-center gap-3">
              <Shield className="h-10 w-10 text-primary" />
              Super Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">Központi adminisztrációs felület</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Vissza a Dashboard-hoz
          </Button>
        </div>

        {/* Összesítő kártyák */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Felhasználók
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profiles.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Állatok
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{animals.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Hűtési helyek
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{storageLocations.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Szállítók
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{transporters.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Szállítólevél
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{transportDocuments.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Részletes adatok */}
        <Card>
          <CardHeader>
            <CardTitle>Részletes adatok</CardTitle>
            <CardDescription>Az összes rendszerbeli adat áttekintése és kezelése</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="users" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="users">Felhasználók</TabsTrigger>
                <TabsTrigger value="animals">Állatok</TabsTrigger>
                <TabsTrigger value="locations">Hűtési helyek</TabsTrigger>
                <TabsTrigger value="transporters">Szállítók</TabsTrigger>
                <TabsTrigger value="documents">Szállítólevelek</TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cégnév</TableHead>
                        <TableHead>Kapcsolattartó</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Típus</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profiles.map((profile) => (
                        <TableRow key={profile.id}>
                          <TableCell className="font-medium">{profile.company_name || "-"}</TableCell>
                          <TableCell>{profile.contact_name || "-"}</TableCell>
                          <TableCell>{profile.contact_email || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{profile.user_type || "-"}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="animals" className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Állat ID</TableHead>
                        <TableHead>Faj</TableHead>
                        <TableHead>Súly (kg)</TableHead>
                        <TableHead>Hozzáadva</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {animals.map((animal) => (
                        <TableRow key={animal.id}>
                          <TableCell className="font-medium">{animal.animal_id}</TableCell>
                          <TableCell>{animal.species}</TableCell>
                          <TableCell>{animal.weight || "-"}</TableCell>
                          <TableCell>{new Date(animal.created_at).toLocaleDateString('hu-HU')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="locations" className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Név</TableHead>
                        <TableHead>Cím</TableHead>
                        <TableHead>Kapacitás</TableHead>
                        <TableHead>Alapértelmezett</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {storageLocations.map((location) => (
                        <TableRow key={location.id}>
                          <TableCell className="font-medium">{location.name}</TableCell>
                          <TableCell>{location.address || "-"}</TableCell>
                          <TableCell>{location.capacity || "-"}</TableCell>
                          <TableCell>
                            {location.is_default ? (
                              <Badge variant="default">Igen</Badge>
                            ) : (
                              <Badge variant="outline">Nem</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="transporters" className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cégnév</TableHead>
                        <TableHead>Kapcsolattartó</TableHead>
                        <TableHead>Cím</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transporters.map((transporter) => (
                        <TableRow key={transporter.id}>
                          <TableCell className="font-medium">{transporter.company_name}</TableCell>
                          <TableCell>{transporter.contact_name || "-"}</TableCell>
                          <TableCell>{transporter.address || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dokumentumszám</TableHead>
                        <TableHead>Dátum</TableHead>
                        <TableHead>Össz súly (kg)</TableHead>
                        <TableHead>Állatok száma</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transportDocuments.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">{doc.document_number}</TableCell>
                          <TableCell>{new Date(doc.transport_date).toLocaleDateString('hu-HU')}</TableCell>
                          <TableCell>{doc.total_weight}</TableCell>
                          <TableCell>{doc.animal_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
