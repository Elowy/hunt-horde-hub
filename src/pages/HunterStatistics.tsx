import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, TrendingUp, Package, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface HunterStat {
  hunter_name: string;
  hunter_type: string;
  total_animals: number;
  total_weight: number;
  total_revenue: number;
  species_breakdown: { [key: string]: number };
}

const HunterStatistics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [hunterStats, setHunterStats] = useState<HunterStat[]>([]);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Check admin role
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      // Check editor role
      const { data: editorRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "editor")
        .maybeSingle();

      const hasAdminAccess = !!adminRole;
      const hasEditorAccess = !!editorRole;

      setIsAdmin(hasAdminAccess);
      setIsEditor(hasEditorAccess);

      if (!hasAdminAccess && !hasEditorAccess) {
        toast({
          title: "Hozzáférés megtagadva",
          description: "Csak adminisztrátorok és szerkesztők érhetik el ezt az oldalt.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      fetchHunterStatistics();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  };

  const fetchHunterStatistics = async () => {
    try {
      setLoading(true);

      // Fetch all animals with their data
      const { data: animals, error } = await supabase
        .from("animals")
        .select(`
          hunter_name,
          hunter_type,
          species,
          weight,
          storage_locations (
            cooling_price_per_kg,
            cooling_vat_rate
          )
        `)
        .not("hunter_name", "is", null);

      if (error) throw error;

      // Group by hunter
      const statsMap = new Map<string, HunterStat>();

      animals?.forEach((animal) => {
        const key = `${animal.hunter_name}_${animal.hunter_type || "tag"}`;
        
        if (!statsMap.has(key)) {
          statsMap.set(key, {
            hunter_name: animal.hunter_name || "Névtelen",
            hunter_type: animal.hunter_type || "tag",
            total_animals: 0,
            total_weight: 0,
            total_revenue: 0,
            species_breakdown: {},
          });
        }

        const stat = statsMap.get(key)!;
        stat.total_animals += 1;
        stat.total_weight += animal.weight || 0;

        // Calculate revenue
        if (animal.weight && animal.storage_locations) {
          const pricePerKg = animal.storage_locations.cooling_price_per_kg || 0;
          const vatRate = animal.storage_locations.cooling_vat_rate || 27;
          const netRevenue = animal.weight * pricePerKg;
          const grossRevenue = netRevenue * (1 + vatRate / 100);
          stat.total_revenue += grossRevenue;
        }

        // Species breakdown
        if (!stat.species_breakdown[animal.species]) {
          stat.species_breakdown[animal.species] = 0;
        }
        stat.species_breakdown[animal.species] += 1;
      });

      setHunterStats(Array.from(statsMap.values()));
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

  const getTopByAnimals = () => {
    return [...hunterStats].sort((a, b) => b.total_animals - a.total_animals);
  };

  const getTopByRevenue = () => {
    return [...hunterStats].sort((a, b) => b.total_revenue - a.total_revenue);
  };

  const getMedalIcon = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `${index + 1}.`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Betöltés...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Trophy className="h-8 w-8 text-yellow-500" />
                Vadász statisztikák
              </h1>
              <p className="text-muted-foreground">Teljesítmény alapú toplisták</p>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <Tabs defaultValue="animals" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="animals">
              <Package className="h-4 w-4 mr-2" />
              Elejtett állatok
            </TabsTrigger>
            <TabsTrigger value="revenue">
              <DollarSign className="h-4 w-4 mr-2" />
              Összesített bevétel
            </TabsTrigger>
          </TabsList>

          {/* Top by Animals */}
          <TabsContent value="animals">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Toplista - Elejtett állatok
                </CardTitle>
                <CardDescription>
                  Vadászok rangsorolva az elejtett állatok száma és összesített súlya alapján
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hunterStats.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nincs megjeleníthető adat
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Hely</TableHead>
                        <TableHead>Vadász neve</TableHead>
                        <TableHead>Típus</TableHead>
                        <TableHead className="text-right">Elejtett állatok</TableHead>
                        <TableHead className="text-right">Összsúly (kg)</TableHead>
                        <TableHead>Fajok</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getTopByAnimals().map((stat, index) => (
                        <TableRow key={`${stat.hunter_name}_${index}`}>
                          <TableCell className="font-medium text-lg">
                            {getMedalIcon(index)}
                          </TableCell>
                          <TableCell className="font-medium">{stat.hunter_name}</TableCell>
                          <TableCell>
                            <Badge variant={stat.hunter_type === "bérvadász" ? "secondary" : "outline"}>
                              {stat.hunter_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {stat.total_animals}
                          </TableCell>
                          <TableCell className="text-right">
                            {stat.total_weight.toFixed(1)} kg
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(stat.species_breakdown).map(([species, count]) => (
                                <Badge key={species} variant="outline" className="text-xs">
                                  {species}: {count}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top by Revenue */}
          <TabsContent value="revenue">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Toplista - Összesített bevétel
                </CardTitle>
                <CardDescription>
                  Vadászok rangsorolva a hűtési díjból származó bruttó bevétel alapján
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hunterStats.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nincs megjeleníthető adat
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Hely</TableHead>
                        <TableHead>Vadász neve</TableHead>
                        <TableHead>Típus</TableHead>
                        <TableHead className="text-right">Elejtett állatok</TableHead>
                        <TableHead className="text-right">Összsúly (kg)</TableHead>
                        <TableHead className="text-right">Bruttó bevétel (Ft)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getTopByRevenue().map((stat, index) => (
                        <TableRow key={`${stat.hunter_name}_${index}`}>
                          <TableCell className="font-medium text-lg">
                            {getMedalIcon(index)}
                          </TableCell>
                          <TableCell className="font-medium">{stat.hunter_name}</TableCell>
                          <TableCell>
                            <Badge variant={stat.hunter_type === "bérvadász" ? "secondary" : "outline"}>
                              {stat.hunter_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {stat.total_animals}
                          </TableCell>
                          <TableCell className="text-right">
                            {stat.total_weight.toFixed(1)} kg
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                            {stat.total_revenue.toLocaleString("hu-HU")} Ft
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default HunterStatistics;
