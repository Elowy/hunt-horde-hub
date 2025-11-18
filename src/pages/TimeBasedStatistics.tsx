import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, TrendingUp, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { hu } from "date-fns/locale";

interface Animal {
  id: string;
  cooling_date: string | null;
  transported_at: string | null;
  created_at: string;
  species: string;
}

const TimeBasedStatistics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");

  useEffect(() => {
    checkAccess();
    fetchAnimals();
  }, []);

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const { data: editorRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "editor")
      .maybeSingle();

    setIsAdmin(!!adminRole);
    setIsEditor(!!editorRole);

    if (!adminRole && !editorRole) {
      toast({
        title: "Hozzáférés megtagadva",
        description: "Nincs jogosultsága ehhez az oldalhoz.",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const fetchAnimals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("animals")
        .select("id, cooling_date, transported_at, created_at, species")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAnimals(data || []);

      // Set default year to the latest year with data
      if (data && data.length > 0) {
        const years = getAvailableYears(data);
        if (years.length > 0) {
          setSelectedYear(years[0]);
        }
      }
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

  const getAvailableYears = (animalData: Animal[] = animals) => {
    const yearsSet = new Set<string>();
    animalData.forEach(animal => {
      if (animal.cooling_date) {
        const year = new Date(animal.cooling_date).getFullYear().toString();
        yearsSet.add(year);
      }
    });
    return Array.from(yearsSet).sort().reverse();
  };

  const getAvailableMonths = () => {
    if (!selectedYear) return [];
    
    const monthsSet = new Set<string>();
    animals.forEach(animal => {
      if (animal.cooling_date) {
        const date = new Date(animal.cooling_date);
        if (date.getFullYear().toString() === selectedYear) {
          const monthKey = String(date.getMonth() + 1).padStart(2, '0');
          monthsSet.add(monthKey);
        }
      }
    });
    return Array.from(monthsSet).sort();
  };

  const filterAnimalsByPeriod = () => {
    return animals.filter(animal => {
      if (!animal.cooling_date) return false;
      
      const date = new Date(animal.cooling_date);
      const year = date.getFullYear().toString();
      
      if (year !== selectedYear) return false;
      
      if (selectedMonth !== "all") {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return month === selectedMonth;
      }
      
      return true;
    });
  };

  // Havi/heti kilövési trend
  const getShootingTrend = () => {
    const filtered = filterAnimalsByPeriod();
    
    if (selectedMonth !== "all") {
      // Weekly trend for selected month
      const year = parseInt(selectedYear);
      const month = parseInt(selectedMonth) - 1;
      const monthStart = new Date(year, month, 1);
      const monthEnd = endOfMonth(monthStart);
      
      const weeks = eachWeekOfInterval(
        { start: monthStart, end: monthEnd },
        { weekStartsOn: 1 }
      );
      
      return weeks.map((weekStart, index) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const count = filtered.filter(animal => {
          const date = new Date(animal.cooling_date!);
          return date >= weekStart && date <= weekEnd;
        }).length;
        
        return {
          week: `${index + 1}. hét`,
          count,
        };
      });
    } else {
      // Monthly trend for selected year
      const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        month: format(new Date(parseInt(selectedYear), i, 1), 'MMM', { locale: hu }),
        count: 0,
      }));
      
      filtered.forEach(animal => {
        const date = new Date(animal.cooling_date!);
        const monthIndex = date.getMonth();
        monthlyData[monthIndex].count++;
      });
      
      return monthlyData.filter(m => m.count > 0);
    }
  };

  // Szezonális grafikon (összes év adatai alapján)
  const getSeasonalChart = () => {
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: format(new Date(2024, i, 1), 'MMMM', { locale: hu }),
      count: 0,
    }));
    
    animals.forEach(animal => {
      if (animal.cooling_date) {
        const date = new Date(animal.cooling_date);
        const monthIndex = date.getMonth();
        monthlyData[monthIndex].count++;
      }
    });
    
    return monthlyData;
  };

  // Átlagos hűtési idő
  const getAverageCoolingTime = () => {
    const filtered = filterAnimalsByPeriod().filter(
      animal => animal.cooling_date && animal.transported_at
    );
    
    if (filtered.length === 0) return 0;
    
    const totalDays = filtered.reduce((sum, animal) => {
      const coolingDate = new Date(animal.cooling_date!);
      const transportDate = new Date(animal.transported_at!);
      const days = (transportDate.getTime() - coolingDate.getTime()) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);
    
    return Math.round(totalDays / filtered.length);
  };

  // Legforgalmasabb napok
  const getBusiestDays = () => {
    const filtered = filterAnimalsByPeriod();
    
    const dayCount: Record<string, number> = {
      'Hétfő': 0,
      'Kedd': 0,
      'Szerda': 0,
      'Csütörtök': 0,
      'Péntek': 0,
      'Szombat': 0,
      'Vasárnap': 0,
    };
    
    filtered.forEach(animal => {
      if (animal.cooling_date) {
        const date = new Date(animal.cooling_date);
        const dayName = format(date, 'EEEE', { locale: hu });
        dayCount[dayName]++;
      }
    });
    
    return Object.entries(dayCount).map(([day, count]) => ({
      day,
      count,
    }));
  };

  // Fajok szerinti idénycsúcs
  const getSpeciesSeasonalPeak = () => {
    const speciesMonthData: Record<string, Record<string, number>> = {};
    
    animals.forEach(animal => {
      if (animal.cooling_date) {
        const date = new Date(animal.cooling_date);
        const month = format(date, 'MMMM', { locale: hu });
        
        if (!speciesMonthData[animal.species]) {
          speciesMonthData[animal.species] = {};
        }
        if (!speciesMonthData[animal.species][month]) {
          speciesMonthData[animal.species][month] = 0;
        }
        speciesMonthData[animal.species][month]++;
      }
    });

    // Get all unique months
    const allMonths = Array.from({ length: 12 }, (_, i) => 
      format(new Date(2024, i, 1), 'MMMM', { locale: hu })
    );

    // Transform to chart data
    return allMonths.map(month => {
      const dataPoint: any = { month };
      Object.keys(speciesMonthData).forEach(species => {
        dataPoint[species] = speciesMonthData[species][month] || 0;
      });
      return dataPoint;
    });
  };

  const getSpeciesColors = () => {
    const species = [...new Set(animals.map(a => a.species))];
    const colors = [
      "hsl(var(--primary))",
      "hsl(var(--secondary))",
      "hsl(var(--accent))",
      "hsl(142, 71%, 45%)",
      "hsl(24, 70%, 50%)",
      "hsl(262, 83%, 58%)",
    ];
    return species.map((s, i) => ({ species: s, color: colors[i % colors.length] }));
  };

  const getMonthLabel = (monthKey: string) => {
    const monthNames = ['Január', 'Február', 'Március', 'Április', 'Május', 'Június', 
                       'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'];
    return monthNames[parseInt(monthKey) - 1];
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
      <PageHeader 
        isAdmin={isAdmin}
        isEditor={isEditor}
        onLogout={handleLogout}
      />

      <div className="container mx-auto px-6 py-8">
        {/* Page Title */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-forest-deep flex items-center gap-2">
            <Clock className="h-8 w-8" />
            Időalapú statisztikák
          </h2>
          <p className="text-muted-foreground">
            Részletes elemzések időbeli bontásban
          </p>
        </div>
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Időszak szűrés
            </CardTitle>
            <CardDescription>
              Válassza ki a megtekinteni kívánt időszakot
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Év</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Válasszon évet" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableYears().map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Hónap</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Válasszon hónapot" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Teljes év</SelectItem>
                    {getAvailableMonths().map((month) => (
                      <SelectItem key={month} value={month}>
                        {getMonthLabel(month)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Shooting Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {selectedMonth === "all" ? "Havi kilövési trend" : "Heti kilövési trend"}
              </CardTitle>
              <CardDescription>
                Elejtett állatok száma {selectedMonth === "all" ? "havonta" : "hetente"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getShootingTrend()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey={selectedMonth === "all" ? "month" : "week"}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    name="Elejtett állatok" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Seasonal Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Szezonális grafikon
              </CardTitle>
              <CardDescription>
                Elejtett állatok havi megoszlása (összes év)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getSeasonalChart()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    dataKey="count" 
                    name="Elejtett állatok" 
                    fill="hsl(var(--primary))" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Average Cooling Time */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Átlagos hűtési idő
              </CardTitle>
              <CardDescription>
                Mennyi ideig maradnak a hűtőben
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8">
                <div className="text-6xl font-bold text-primary mb-2">
                  {getAverageCoolingTime()}
                </div>
                <div className="text-xl text-muted-foreground">nap</div>
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  A kiválasztott időszakban az állatok átlagosan ennyi napot töltenek hűtésben
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Busiest Days */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Legforgalmasabb napok
              </CardTitle>
              <CardDescription>
                Mely napokon történik a legtöbb behelyezés
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getBusiestDays()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    dataKey="count" 
                    name="Behelyezések száma" 
                    fill="hsl(var(--chart-2))" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Species Seasonal Peak - Full Width */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Fajok szerinti idénycsúcs
              </CardTitle>
              <CardDescription>
                Mely hónapokban, mely fajok a legaktívabbak (összes év)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={getSpeciesSeasonalPeak()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {getSpeciesColors().map(({ species, color }) => (
                    <Bar 
                      key={species}
                      dataKey={species} 
                      name={species} 
                      fill={color}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TimeBasedStatistics;
