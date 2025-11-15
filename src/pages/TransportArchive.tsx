import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, Search, X, Calendar, User, Truck, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
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
import { Badge } from "@/components/ui/badge";

interface Animal {
  id: string;
  animal_id: string;
  species: string;
  weight: number | null;
}

interface Transporter {
  id: string;
  company_name: string;
}

interface TransportDocument {
  id: string;
  document_number: string;
  transport_date: string;
  transporter_name: string | null;
  vehicle_plate: string | null;
  total_weight: number;
  animal_count: number;
  total_price: number;
  transporters: Transporter | null;
  user_id: string;
  profiles: {
    company_name: string | null;
    contact_name: string | null;
  } | null;
}

interface TransportItem {
  id: string;
  animal_id: string;
  transport_document_id: string;
  animals: Animal;
}

const TransportArchive = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [documents, setDocuments] = useState<TransportDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<TransportDocument[]>([]);
  const [transportItems, setTransportItems] = useState<TransportItem[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAnimal, setSelectedAnimal] = useState<string>("");
  const [selectedHunter, setSelectedHunter] = useState<string>("");
  const [selectedTransporter, setSelectedTransporter] = useState<string>("");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  useEffect(() => {
    checkUserRole();
  }, []);

  useEffect(() => {
    if (isAdmin || isEditor) {
      fetchData();
    }
  }, [isAdmin, isEditor]);

  useEffect(() => {
    applyFilters();
  }, [documents, searchTerm, selectedAnimal, selectedHunter, selectedTransporter]);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const roleList = roles?.map(r => r.role) || [];
      const admin = roleList.includes("admin");
      const editor = roleList.includes("editor");

      setIsAdmin(admin);
      setIsEditor(editor);

      if (!admin && !editor) {
        toast({
          title: "Hozzáférés megtagadva",
          description: "Csak adminisztrátorok és szerkesztők láthatják ezt az oldalt!",
          variant: "destructive",
        });
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Error checking role:", error);
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch transport documents
      const { data: docsData, error: docsError } = await supabase
        .from("transport_documents")
        .select(`
          *,
          transporters (
            id,
            company_name
          )
        `)
        .order("transport_date", { ascending: false });

      if (docsError) throw docsError;

      // Fetch user profiles for hunters
      const userIds = [...new Set(docsData?.map(d => d.user_id) || [])];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, company_name, contact_name")
        .in("id", userIds);

      const documentsWithProfiles = docsData?.map(doc => ({
        ...doc,
        profiles: profilesData?.find(p => p.id === doc.user_id) || null,
      })) || [];

      setDocuments(documentsWithProfiles);

      // Fetch transport items with animals
      const { data: itemsData, error: itemsError } = await supabase
        .from("transport_document_items")
        .select(`
          *,
          animals (
            id,
            animal_id,
            species,
            weight
          )
        `);

      if (itemsError) throw itemsError;
      setTransportItems(itemsData || []);

      // Fetch all transporters for filter
      const { data: transportersData, error: transportersError } = await supabase
        .from("transporters")
        .select("id, company_name")
        .order("company_name");

      if (transportersError) throw transportersError;
      setTransporters(transportersData || []);

    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni az adatokat.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...documents];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.document_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.transporter_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.vehicle_plate?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Animal filter
    if (selectedAnimal) {
      const relevantDocIds = transportItems
        .filter(item => item.animals.animal_id === selectedAnimal)
        .map(item => item.transport_document_id);
      filtered = filtered.filter(doc => relevantDocIds.includes(doc.id));
    }

    // Hunter filter
    if (selectedHunter) {
      filtered = filtered.filter(doc => doc.user_id === selectedHunter);
    }

    // Transporter filter
    if (selectedTransporter) {
      filtered = filtered.filter(doc => 
        doc.transporters?.id === selectedTransporter
      );
    }

    setFilteredDocuments(filtered);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedAnimal("");
    setSelectedHunter("");
    setSelectedTransporter("");
  };

  const getUniqueAnimals = () => {
    const animals = transportItems.map(item => item.animals);
    const uniqueAnimals = animals.filter((animal, index, self) =>
      index === self.findIndex(a => a.animal_id === animal.animal_id)
    );
    return uniqueAnimals;
  };

  const getUniqueHunters = () => {
    const hunters = documents
      .map(doc => ({
        id: doc.user_id,
        name: doc.profiles?.company_name || doc.profiles?.contact_name || "Névtelen",
      }))
      .filter((hunter, index, self) =>
        index === self.findIndex(h => h.id === hunter.id)
      );
    return hunters;
  };

  const getAnimalsForDocument = (documentId: string) => {
    return transportItems
      .filter(item => item.transport_document_id === documentId)
      .map(item => item.animals);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Betöltés...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <PageHeader
        isAdmin={isAdmin}
        isEditor={isEditor}
        onLogout={handleLogout}
      />

      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Elszállítási archívum
            </CardTitle>
            <CardDescription>
              Keresés és szűrés az összes elszállítási dokumentum között
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search and Filters */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Keresés dokumentumszám, elszállító vagy rendszám szerint..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {(searchTerm || selectedAnimal || selectedHunter || selectedTransporter) && (
                  <Button variant="outline" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Szűrők törlése
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select value={selectedAnimal} onValueChange={setSelectedAnimal}>
                  <SelectTrigger>
                    <SelectValue placeholder="Szűrés állat szerint" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Összes állat</SelectItem>
                    {getUniqueAnimals().map(animal => (
                      <SelectItem key={animal.id} value={animal.animal_id}>
                        {animal.animal_id} - {animal.species}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedHunter} onValueChange={setSelectedHunter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Szűrés vadász szerint" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Összes vadász</SelectItem>
                    {getUniqueHunters().map(hunter => (
                      <SelectItem key={hunter.id} value={hunter.id}>
                        {hunter.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedTransporter} onValueChange={setSelectedTransporter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Szűrés elszállító szerint" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Összes elszállító</SelectItem>
                    {transporters.map(transporter => (
                      <SelectItem key={transporter.id} value={transporter.id}>
                        {transporter.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results */}
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                {filteredDocuments.length} dokumentum találva
              </p>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dokumentumszám</TableHead>
                      <TableHead>Dátum</TableHead>
                      <TableHead>Vadász</TableHead>
                      <TableHead>Elszállító</TableHead>
                      <TableHead>Rendszám</TableHead>
                      <TableHead>Állatok</TableHead>
                      <TableHead className="text-right">Össztömeg</TableHead>
                      <TableHead className="text-right">Összár</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          Nincs találat
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDocuments.map((doc) => {
                        const animals = getAnimalsForDocument(doc.id);
                        return (
                          <TableRow key={doc.id}>
                            <TableCell className="font-medium">{doc.document_number}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {format(new Date(doc.transport_date), "yyyy. MM. dd.", { locale: hu })}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                {doc.profiles?.company_name || doc.profiles?.contact_name || "Névtelen"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Truck className="h-4 w-4 text-muted-foreground" />
                                {doc.transporters?.company_name || doc.transporter_name || "-"}
                              </div>
                            </TableCell>
                            <TableCell>{doc.vehicle_plate || "-"}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {animals.slice(0, 2).map(animal => (
                                  <Badge key={animal.id} variant="secondary" className="text-xs">
                                    {animal.animal_id}
                                  </Badge>
                                ))}
                                {animals.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{animals.length - 2}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {doc.total_weight.toFixed(2)} kg
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {doc.total_price.toLocaleString("hu-HU")} Ft
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TransportArchive;
