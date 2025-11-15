import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MapZone {
  id: string;
  name: string;
  description: string | null;
  geojson: any;
  user_id: string;
}

export const useMapZones = () => {
  const { toast } = useToast();
  const [zones, setZones] = useState<MapZone[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchZones = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("map_zones")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni a körzeteket.",
        variant: "destructive",
      });
    } else {
      setZones(data || []);
    }
    setLoading(false);
  };

  const saveZone = async (name: string, description: string, polygon: [number, number][]) => {
    if (!name || polygon.length < 3) {
      toast({
        title: "Hiba",
        description: "Add meg a körzet nevét és rajzolj legalább 3 pontot!",
        variant: "destructive",
      });
      return false;
    }

    const geojson = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [polygon.map(coord => [coord[1], coord[0]])],
      },
      properties: {
        name,
        description,
      },
    };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.from("map_zones").insert({
      name,
      description,
      geojson,
      user_id: user.id,
    });

    if (error) {
      toast({
        title: "Hiba",
        description: "Nem sikerült menteni a körzetet.",
        variant: "destructive",
      });
      return false;
    }

    toast({
      title: "Siker",
      description: "Körzet sikeresen mentve!",
    });
    fetchZones();
    return true;
  };

  const deleteZone = async (zoneId: string) => {
    const { error } = await supabase
      .from("map_zones")
      .delete()
      .eq("id", zoneId);

    if (error) {
      toast({
        title: "Hiba",
        description: "Nem sikerült törölni a körzetet.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Siker",
        description: "Körzet törölve!",
      });
      fetchZones();
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  return { zones, loading, saveZone, deleteZone, refreshZones: fetchZones };
};
