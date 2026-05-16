import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Plus, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SPECIES_OPTIONS } from "@/lib/speciesConstants";

interface SocietyQuota {
  id: string;
  species: string;
  max_count: number;
}

interface HunterQuota {
  id: string;
  hunter_id: string;
  species: string;
  max_kg: number;
}

interface AnimalRow {
  species: string;
  weight: number | null;
  hunter_name: string | null;
  status: string | null;
}

interface Hunter {
  id: string;
  contact_name: string | null;
}

const quotaColor = (used: number, max: number) => {
  if (max <= 0) return "bg-muted";
  const r = used / max;
  if (r >= 1) return "text-destructive";
  if (r >= 0.8) return "text-yellow-600";
  return "text-foreground";
};

const Quotas = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [societyId, setSocietyId] = useState<string | null>(null);

  const [societyQuotas, setSocietyQuotas] = useState<SocietyQuota[]>([]);
  const [hunterQuotas, setHunterQuotas] = useState<HunterQuota[]>([]);
  const [hunters, setHunters] = useState<Hunter[]>([]);
  const [animals, setAnimals] = useState<AnimalRow[]>([]);

  const [newSoc, setNewSoc] = useState({ species: "", max_count: "" });
  const [newHunter, setNewHunter] = useState({ hunter_id: "", species: "", max_kg: "" });

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", user.id)
        .single();

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const isAdmin = roles?.some((r) => r.role === "admin" || r.role === "super_admin");
      if (!isAdmin || profile?.user_type !== "hunter_society") {
        navigate("/dashboard");
        return;
      }

      setSocietyId(user.id);
      await Promise.all([
        loadSocietyQuotas(user.id),
        loadHunterQuotas(user.id),
        loadHunters(user.id),
        loadAnimals(user.id),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadSocietyQuotas = async (sid: string) => {
    const { data } = await supabase
      .from("society_species_quotas" as any)
      .select("*")
      .eq("hunter_society_id", sid)
      .order("species");
    setSocietyQuotas((data as any) || []);
  };

  const loadHunterQuotas = async (sid: string) => {
    const { data } = await supabase
      .from("hunter_meat_quotas" as any)
      .select("*")
      .eq("hunter_society_id", sid)
      .order("species");
    setHunterQuotas((data as any) || []);
  };

  const loadHunters = async (sid: string) => {
    const { data: members } = await supabase
      .from("hunter_society_members")
      .select("hunter_id")
      .eq("hunter_society_id", sid);
    const ids = (members || []).map((m) => m.hunter_id);
    if (!ids.length) {
      setHunters([]);
      return;
    }
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, contact_name")
      .in("id", ids);
    setHunters((profiles as any) || []);
  };

  const loadAnimals = async (sid: string) => {
    const { data } = await supabase
      .from("animals")
      .select("species, weight, hunter_name, status")
      .eq("user_id", sid);
    setAnimals(((data as any) || []).filter((a: AnimalRow) => a.status !== "archivalva"));
  };

  const addSocietyQuota = async () => {
    if (!societyId || !newSoc.species || !newSoc.max_count) return;
    const { error } = await supabase.from("society_species_quotas" as any).insert({
      hunter_society_id: societyId,
      species: newSoc.species,
      max_count: parseInt(newSoc.max_count),
    });
    if (error) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Kvóta mentve", description: `${newSoc.species} — ${newSoc.max_count} egyed` });
    setNewSoc({ species: "", max_count: "" });
    loadSocietyQuotas(societyId);
  };

  const updateSocietyQuota = async (id: string, max_count: number) => {
    const { error } = await supabase
      .from("society_species_quotas" as any)
      .update({ max_count })
      .eq("id", id);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else if (societyId) loadSocietyQuotas(societyId);
  };

  const deleteSocietyQuota = async (id: string) => {
    await supabase.from("society_species_quotas" as any).delete().eq("id", id);
    if (societyId) loadSocietyQuotas(societyId);
  };

  const addHunterQuota = async () => {
    if (!societyId || !newHunter.hunter_id || !newHunter.species || !newHunter.max_kg) return;
    const { error } = await supabase.from("hunter_meat_quotas" as any).insert({
      hunter_society_id: societyId,
      hunter_id: newHunter.hunter_id,
      species: newHunter.species,
      max_kg: parseFloat(newHunter.max_kg),
    });
    if (error) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Kvóta mentve", description: `${newHunter.species} — ${newHunter.max_kg} kg` });
    setNewHunter({ hunter_id: "", species: "", max_kg: "" });
    loadHunterQuotas(societyId);
  };

  const updateHunterQuota = async (id: string, max_kg: number) => {
    const { error } = await supabase
      .from("hunter_meat_quotas" as any)
      .update({ max_kg })
      .eq("id", id);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else if (societyId) loadHunterQuotas(societyId);
  };

  const deleteHunterQuota = async (id: string) => {
    await supabase.from("hunter_meat_quotas" as any).delete().eq("id", id);
    if (societyId) loadHunterQuotas(societyId);
  };

  // TODO: hard limit later
  const usageBySpecies = useMemo(() => {
    const map: Record<string, number> = {};
    animals.forEach((a) => {
      map[a.species] = (map[a.species] || 0) + 1;
    });
    return map;
  }, [animals]);

  const usageByHunterSpecies = useMemo(() => {
    // key: hunterName|species -> kg
    const map: Record<string, number> = {};
    animals.forEach((a) => {
      if (!a.hunter_name) return;
      const key = `${a.hunter_name}|${a.species}`;
      map[key] = (map[key] || 0) + (Number(a.weight) || 0);
    });
    return map;
  }, [animals]);

  const hunterName = (id: string) => hunters.find((h) => h.id === id)?.contact_name || "Ismeretlen";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-gradient-to-r from-forest-deep to-forest-light text-white shadow-md">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Kvóták</h1>
            <p className="text-white/80 text-sm">Vadásztársasági és tag-vadász kvóták kezelése</p>
          </div>
        </div>
      </div>

      <div className="container py-6 space-y-6">
        {/* Vadásztársasági kvóták */}
        <Card>
          <CardHeader>
            <CardTitle>Vadásztársasági kvóták</CardTitle>
            <CardDescription>Maximális elejthető egyedszám vadfajonként</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-2 items-end">
              <div className="space-y-1">
                <Label>Vadfaj</Label>
                <Select value={newSoc.species} onValueChange={(v) => setNewSoc({ ...newSoc, species: v })}>
                  <SelectTrigger><SelectValue placeholder="Válasszon..." /></SelectTrigger>
                  <SelectContent>
                    {SPECIES_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Max egyedszám</Label>
                <Input type="number" min="0" value={newSoc.max_count} onChange={(e) => setNewSoc({ ...newSoc, max_count: e.target.value })} />
              </div>
              <Button onClick={addSocietyQuota} disabled={!newSoc.species || !newSoc.max_count}>
                <Plus className="h-4 w-4 mr-1" /> Hozzáadás
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vadfaj</TableHead>
                    <TableHead className="w-[160px]">Max</TableHead>
                    <TableHead>Felhasználás</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {societyQuotas.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nincs kvóta</TableCell></TableRow>
                  )}
                  {societyQuotas.map((q) => {
                    const used = usageBySpecies[q.species] || 0;
                    const pct = q.max_count > 0 ? Math.min(100, (used / q.max_count) * 100) : 0;
                    const isFull = used >= q.max_count;
                    const isNear = !isFull && used >= q.max_count * 0.8;
                    return (
                      <TableRow key={q.id}>
                        <TableCell className="font-medium">{q.species}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            defaultValue={q.max_count}
                            onBlur={(e) => {
                              const v = parseInt(e.target.value);
                              if (!isNaN(v) && v !== q.max_count) updateSocietyQuota(q.id, v);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className={`text-sm ${quotaColor(used, q.max_count)}`}>
                              Elejtett: {used} / Max: {q.max_count} egyed
                            </div>
                            <Progress value={pct} />
                            {isFull && <Badge variant="destructive" className="mt-1"><AlertTriangle className="h-3 w-3 mr-1" />Kvóta betelt!</Badge>}
                            {isNear && <Badge className="mt-1 bg-yellow-500">Kvóta közelében (80%+)</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => deleteSocietyQuota(q.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Tag-vadász kvóták */}
        <Card>
          <CardHeader>
            <CardTitle>Tag-vadász vadhús kvóták</CardTitle>
            <CardDescription>Maximális vadhús (kg) vadászonként és vadfajonként</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_140px_auto] gap-2 items-end">
              <div className="space-y-1">
                <Label>Vadász</Label>
                <Select value={newHunter.hunter_id} onValueChange={(v) => setNewHunter({ ...newHunter, hunter_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Válasszon vadászt..." /></SelectTrigger>
                  <SelectContent>
                    {hunters.map((h) => (
                      <SelectItem key={h.id} value={h.id}>{h.contact_name || "(névtelen)"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Vadfaj</Label>
                <Select value={newHunter.species} onValueChange={(v) => setNewHunter({ ...newHunter, species: v })}>
                  <SelectTrigger><SelectValue placeholder="Válasszon..." /></SelectTrigger>
                  <SelectContent>
                    {SPECIES_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Max kg</Label>
                <Input type="number" min="0" step="0.1" value={newHunter.max_kg} onChange={(e) => setNewHunter({ ...newHunter, max_kg: e.target.value })} />
              </div>
              <Button onClick={addHunterQuota} disabled={!newHunter.hunter_id || !newHunter.species || !newHunter.max_kg}>
                <Plus className="h-4 w-4 mr-1" /> Hozzáadás
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vadász</TableHead>
                    <TableHead>Vadfaj</TableHead>
                    <TableHead className="w-[140px]">Max (kg)</TableHead>
                    <TableHead>Felhasználás</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hunterQuotas.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nincs kvóta</TableCell></TableRow>
                  )}
                  {hunterQuotas.map((q) => {
                    const hn = hunterName(q.hunter_id);
                    const used = usageByHunterSpecies[`${hn}|${q.species}`] || 0;
                    const pct = q.max_kg > 0 ? Math.min(100, (used / q.max_kg) * 100) : 0;
                    const isFull = used >= q.max_kg;
                    const isNear = !isFull && used >= q.max_kg * 0.8;
                    return (
                      <TableRow key={q.id}>
                        <TableCell className="font-medium">{hn}</TableCell>
                        <TableCell>{q.species}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            defaultValue={q.max_kg}
                            onBlur={(e) => {
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v) && v !== Number(q.max_kg)) updateHunterQuota(q.id, v);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className={`text-sm ${quotaColor(used, q.max_kg)}`}>
                              Felhasznált: {used.toFixed(1)} kg / Max: {Number(q.max_kg).toFixed(1)} kg
                            </div>
                            <Progress value={pct} />
                            {isFull && <Badge variant="destructive" className="mt-1"><AlertTriangle className="h-3 w-3 mr-1" />Kvóta betelt!</Badge>}
                            {isNear && <Badge className="mt-1 bg-yellow-500">Kvóta közelében (80%+)</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => deleteHunterQuota(q.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Quotas;
