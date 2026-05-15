import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, Truck } from "lucide-react";
import { AnimalStatusBadge } from "@/components/AnimalStatusBadge";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { toast } from "sonner";

interface Row {
  id: string;
  animal_id: string;
  species: string;
  class: string | null;
  weight: number | null;
  hunter_name: string | null;
  transported_at: string | null;
  updated_at: string;
  status: string;
}

export default function DeliveredAnimals() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("animals")
      .select("id, animal_id, species, class, weight, hunter_name, transported_at, updated_at, status")
      .eq("status", "elszallitva")
      .order("transported_at", { ascending: false, nullsFirst: false })
      .limit(500);
    if (error) {
      toast.error(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as Row[]);
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Truck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Elszállított vadak</h1>
      </div>

      <Card className="p-4">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nincs elszállított vad.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Státusz</TableHead>
                <TableHead>Azonosító</TableHead>
                <TableHead>Faj</TableHead>
                <TableHead>Osztály</TableHead>
                <TableHead>Súly (kg)</TableHead>
                <TableHead>Vadász</TableHead>
                <TableHead>Elszállítás dátuma</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell><AnimalStatusBadge status={r.status} /></TableCell>
                  <TableCell className="font-medium">{r.animal_id}</TableCell>
                  <TableCell>{r.species}</TableCell>
                  <TableCell>{r.class || "-"}</TableCell>
                  <TableCell>{r.weight ?? "-"}</TableCell>
                  <TableCell>{r.hunter_name || "-"}</TableCell>
                  <TableCell>
                    {(r.transported_at || r.updated_at)
                      ? format(new Date(r.transported_at || r.updated_at), "yyyy. MMM d. HH:mm", { locale: hu })
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
