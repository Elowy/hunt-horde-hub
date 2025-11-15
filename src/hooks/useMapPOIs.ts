import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MapPOI {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  zone_id: string | null;
  user_id: string;
}

export const useMapPOIs = () => {
  const { toast } = useToast();
  const [pois, setPois] = useState<MapPOI[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPOIs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("map_pois")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni a POI-kat.",
        variant: "destructive",
      });
    } else {
      setPois(data || []);
    }
    setLoading(false);
  };

  const savePOI = async (
    name: string,
    description: string,
    coords: [number, number]
  ) => {
    if (!name || !coords) {
      toast({
        title: "Hiba",
        description: "Add meg a POI nevét és kattints a térképre!",
        variant: "destructive",
      });
      return false;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.from("map_pois").insert({
      name,
      description,
      latitude: coords[0],
      longitude: coords[1],
      user_id: user.id,
    });

    if (error) {
      toast({
        title: "Hiba",
        description: "Nem sikerült menteni a POI-t.",
        variant: "destructive",
      });
      return false;
    }

    toast({
      title: "Siker",
      description: "POI sikeresen mentve!",
    });
    fetchPOIs();
    return true;
  };

  const deletePOI = async (poiId: string) => {
    const { error } = await supabase
      .from("map_pois")
      .delete()
      .eq("id", poiId);

    if (error) {
      toast({
        title: "Hiba",
        description: "Nem sikerült törölni a POI-t.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Siker",
        description: "POI törölve!",
      });
      fetchPOIs();
    }
  };

  useEffect(() => {
    fetchPOIs();
  }, []);

  return { pois, loading, savePOI, deletePOI, refreshPOIs: fetchPOIs };
};
