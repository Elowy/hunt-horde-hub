import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Target, TrendingUp, Users, Percent } from "lucide-react";

interface Animal {
  id: string;
  created_at: string;
  hunting_registration_id: string | null;
}

interface Registration {
  id: string;
  is_guest: boolean | null;
  status: string;
}

export const HuntingEfficiency = () => {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [registrationsWithAnimals, setRegistrationsWithAnimals] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch animals
      const { data: animalsData, error: animalsError } = await supabase
        .from("animals")
        .select("id, created_at, hunting_registration_id")
        .eq("user_id", user.id);

      if (animalsError) throw animalsError;
      setAnimals(animalsData || []);

      // Get unique registration IDs that have animals
      const regIds = [...new Set((animalsData || [])
        .filter(a => a.hunting_registration_id)
        .map(a => a.hunting_registration_id))];
      setRegistrationsWithAnimals(regIds as string[]);

      // Fetch all registrations
      const { data: regsData, error: regsError } = await supabase
        .from("hunting_registrations")
        .select("id, is_guest, status, user_id")
        .eq("user_id", user.id);

      if (regsError) throw regsError;
      setRegistrations(regsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Állat elejtés / beírás arány - minden beírt állat vs csak az elejtett
  const getShootingEntryRatio = () => {
    const totalEntries = animals.length;
    const withRegistration = animals.filter(a => a.hunting_registration_id).length;
    const withoutRegistration = totalEntries - withRegistration;

    return [
      { name: "Kimenetelhez társítva", value: withRegistration, color: "hsl(var(--primary))" },
      { name: "Kimenetel nélkül", value: withoutRegistration, color: "hsl(var(--muted))" },
    ];
  };

  // Állat elejtés / kimenetel arány
  const getShootingOutcomeRatio = () => {
    const totalOutcomes = registrations.length;
    const withAnimals = registrationsWithAnimals.length;
    const withoutAnimals = totalOutcomes - withAnimals;

    const percentage = totalOutcomes > 0 
      ? Math.round((withAnimals / totalOutcomes) * 100) 
      : 0;

    return {
      data: [
        { name: "Elejtéssel", value: withAnimals, color: "hsl(var(--primary))" },
        { name: "Elejtés nélkül", value: withoutAnimals, color: "hsl(var(--muted))" },
      ],
      percentage,
      withAnimals,
      totalOutcomes,
    };
  };

  // Vendégek vs tagok eredményessége
  const getGuestVsMemberEfficiency = () => {
    const guestRegs = registrations.filter(r => r.is_guest === true);
    const memberRegs = registrations.filter(r => r.is_guest === false || r.is_guest === null);

    const guestWithAnimals = guestRegs.filter(r => 
      registrationsWithAnimals.includes(r.id)
    ).length;
    const memberWithAnimals = memberRegs.filter(r => 
      registrationsWithAnimals.includes(r.id)
    ).length;

    const guestPercentage = guestRegs.length > 0 
      ? Math.round((guestWithAnimals / guestRegs.length) * 100) 
      : 0;
    const memberPercentage = memberRegs.length > 0 
      ? Math.round((memberWithAnimals / memberRegs.length) * 100) 
      : 0;

    return [
      {
        type: "Vendégek",
        "Eredményes kimenetelek": guestWithAnimals,
        "Eredménytelen kimenetelek": guestRegs.length - guestWithAnimals,
        "Eredményesség %": guestPercentage,
      },
      {
        type: "Tagok",
        "Eredményes kimenetelek": memberWithAnimals,
        "Eredménytelen kimenetelek": memberRegs.length - memberWithAnimals,
        "Eredményesség %": memberPercentage,
      },
    ];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-lg">Betöltés...</div>
      </div>
    );
  }

  const outcomeRatio = getShootingOutcomeRatio();

  return (
    <div className="space-y-6">
      {/* Elejtés/beírás arány */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Állat elejtés / beírás arány
          </CardTitle>
          <CardDescription>
            Kimenetelhez társított vs kimenetel nélküli állatok
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={getShootingEntryRatio()}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) => 
                  `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                }
                outerRadius={100}
                fill="hsl(var(--primary))"
                dataKey="value"
              >
                {getShootingEntryRatio().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Elejtés/kimenetel arány */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Állat elejtés / kimenetel arány
          </CardTitle>
          <CardDescription>
            Eredményes kimenetelek aránya
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center py-4">
              <div className="text-6xl font-bold text-primary mb-2">
                {outcomeRatio.percentage}%
              </div>
              <div className="text-xl text-muted-foreground">eredményesség</div>
              <p className="text-sm text-muted-foreground mt-4 text-center">
                {outcomeRatio.withAnimals} / {outcomeRatio.totalOutcomes} kimenetelből volt elejtés
              </p>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={outcomeRatio.data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => 
                    `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                  }
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {outcomeRatio.data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Vendégek vs tagok */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Vendégek vs. tagok eredményessége
          </CardTitle>
          <CardDescription>
            Összehasonlító eredményesség elemzés
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={getGuestVsMemberEfficiency()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar 
                dataKey="Eredményes kimenetelek" 
                fill="hsl(var(--primary))" 
                radius={[8, 8, 0, 0]}
              />
              <Bar 
                dataKey="Eredménytelen kimenetelek" 
                fill="hsl(var(--muted))" 
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {getGuestVsMemberEfficiency().map((item) => (
              <div key={item.type} className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {item["Eredményesség %"]}%
                </div>
                <div className="text-sm text-muted-foreground">{item.type}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
