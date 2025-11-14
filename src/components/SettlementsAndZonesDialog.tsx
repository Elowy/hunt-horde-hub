import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Plus, Edit, Trash2, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Settlement {
  id: string;
  name: string;
  display_order: number;
}

interface SecurityZone {
  id: string;
  name: string;
  description: string | null;
  settlement_id: string | null;
  display_order: number;
}

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
}

const SortableItem = ({ id, children }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center gap-2">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        {children}
      </div>
    </div>
  );
};

export const SettlementsAndZonesDialog = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [zones, setZones] = useState<SecurityZone[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [editingSettlement, setEditingSettlement] = useState<Settlement | null>(null);
  const [settlementName, setSettlementName] = useState("");
  
  const [editingZone, setEditingZone] = useState<SecurityZone | null>(null);
  const [zoneFormData, setZoneFormData] = useState({
    name: "",
    description: "",
    settlement_id: "",
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [settlementsRes, zonesRes] = await Promise.all([
        supabase
          .from("settlements")
          .select("*")
          .eq("user_id", user.id)
          .order("display_order", { ascending: true }),
        supabase
          .from("security_zones")
          .select("*")
          .eq("user_id", user.id)
          .order("display_order", { ascending: true }),
      ]);

      if (settlementsRes.error) throw settlementsRes.error;
      if (zonesRes.error) throw zonesRes.error;

      setSettlements(settlementsRes.data || []);
      setZones(zonesRes.data || []);
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSettlementSubmit = async () => {
    if (!settlementName.trim()) {
      toast({
        title: "Hiba",
        description: "A település neve kötelező!",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingSettlement) {
        const { error } = await supabase
          .from("settlements")
          .update({ name: settlementName })
          .eq("id", editingSettlement.id);

        if (error) throw error;
        toast({ title: "Siker!", description: "Település frissítve!" });
      } else {
        const { error } = await supabase
          .from("settlements")
          .insert({
            user_id: user.id,
            name: settlementName,
            display_order: settlements.length,
          });

        if (error) throw error;
        toast({ title: "Siker!", description: "Település létrehozva!" });
      }

      setSettlementName("");
      setEditingSettlement(null);
      fetchData();
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

  const handleZoneSubmit = async () => {
    if (!zoneFormData.name.trim()) {
      toast({
        title: "Hiba",
        description: "A körzet neve kötelező!",
        variant: "destructive",
      });
      return;
    }

    if (!zoneFormData.settlement_id) {
      toast({
        title: "Hiba",
        description: "Válasszon települést!",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingZone) {
        const { error } = await supabase
          .from("security_zones")
          .update({
            name: zoneFormData.name,
            description: zoneFormData.description || null,
            settlement_id: zoneFormData.settlement_id,
          })
          .eq("id", editingZone.id);

        if (error) throw error;
        toast({ title: "Siker!", description: "Körzet frissítve!" });
      } else {
        const zonesInSettlement = zones.filter(z => z.settlement_id === zoneFormData.settlement_id);
        const { error } = await supabase
          .from("security_zones")
          .insert({
            user_id: user.id,
            name: zoneFormData.name,
            description: zoneFormData.description || null,
            settlement_id: zoneFormData.settlement_id,
            display_order: zonesInSettlement.length,
          });

        if (error) throw error;
        toast({ title: "Siker!", description: "Körzet létrehozva!" });
      }

      setZoneFormData({ name: "", description: "", settlement_id: "" });
      setEditingZone(null);
      fetchData();
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

  const handleDeleteSettlement = async (settlementId: string) => {
    if (!confirm("Biztosan törli ezt a települést? Az összes hozzá tartozó körzet is törlődik!")) return;

    try {
      const { error } = await supabase
        .from("settlements")
        .delete()
        .eq("id", settlementId);

      if (error) throw error;
      toast({ title: "Siker!", description: "Település törölve!" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    if (!confirm("Biztosan törli ezt a körzetet?")) return;

    try {
      const { error } = await supabase
        .from("security_zones")
        .delete()
        .eq("id", zoneId);

      if (error) throw error;
      toast({ title: "Siker!", description: "Körzet törölve!" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSettlementDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = settlements.findIndex((s) => s.id === active.id);
    const newIndex = settlements.findIndex((s) => s.id === over.id);

    const newSettlements = arrayMove(settlements, oldIndex, newIndex);
    setSettlements(newSettlements);

    try {
      const updates = newSettlements.map((settlement, index) => 
        supabase
          .from("settlements")
          .update({ display_order: index })
          .eq("id", settlement.id)
      );

      await Promise.all(updates);
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
      fetchData();
    }
  };

  const handleZoneDragEnd = async (event: DragEndEvent, settlementId: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const settlementZones = zones.filter(z => z.settlement_id === settlementId);
    const oldIndex = settlementZones.findIndex((z) => z.id === active.id);
    const newIndex = settlementZones.findIndex((z) => z.id === over.id);

    const newZones = arrayMove(settlementZones, oldIndex, newIndex);
    
    const updatedZones = zones.map(zone => {
      if (zone.settlement_id !== settlementId) return zone;
      const newOrder = newZones.findIndex(z => z.id === zone.id);
      return { ...zone, display_order: newOrder };
    });
    
    setZones(updatedZones);

    try {
      const updates = newZones.map((zone, index) => 
        supabase
          .from("security_zones")
          .update({ display_order: index })
          .eq("id", zone.id)
      );

      await Promise.all(updates);
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
      fetchData();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MapPin className="h-4 w-4" />
          Települések és körzetek
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Települések és beírókörzetek kezelése</DialogTitle>
          <DialogDescription>
            Hozzon létre településeket és beírókörzeti hierarchiát. Húzza az elemeket a sorrend módosításához.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Település hozzáadása */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {editingSettlement ? "Település szerkesztése" : "Új település"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="settlement-name">Település neve</Label>
                <Input
                  id="settlement-name"
                  value={settlementName}
                  onChange={(e) => setSettlementName(e.target.value)}
                  placeholder="pl. Budapest"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSettlementSubmit} disabled={loading} className="flex-1">
                  <Plus className="h-4 w-4 mr-2" />
                  {editingSettlement ? "Frissítés" : "Hozzáadás"}
                </Button>
                {editingSettlement && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingSettlement(null);
                      setSettlementName("");
                    }}
                  >
                    Mégse
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Körzet hozzáadása */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {editingZone ? "Körzet szerkesztése" : "Új beírókörzet"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="zone-settlement">Település</Label>
                <select
                  id="zone-settlement"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={zoneFormData.settlement_id}
                  onChange={(e) =>
                    setZoneFormData({ ...zoneFormData, settlement_id: e.target.value })
                  }
                >
                  <option value="">Válasszon települést...</option>
                  {settlements.map((settlement) => (
                    <option key={settlement.id} value={settlement.id}>
                      {settlement.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="zone-name">Körzet neve</Label>
                <Input
                  id="zone-name"
                  value={zoneFormData.name}
                  onChange={(e) =>
                    setZoneFormData({ ...zoneFormData, name: e.target.value })
                  }
                  placeholder="pl. Északi körzet"
                />
              </div>
              <div>
                <Label htmlFor="zone-description">Leírás (opcionális)</Label>
                <Textarea
                  id="zone-description"
                  value={zoneFormData.description}
                  onChange={(e) =>
                    setZoneFormData({ ...zoneFormData, description: e.target.value })
                  }
                  placeholder="Részletes leírás..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleZoneSubmit} disabled={loading} className="flex-1">
                  <Plus className="h-4 w-4 mr-2" />
                  {editingZone ? "Frissítés" : "Hozzáadás"}
                </Button>
                {editingZone && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingZone(null);
                      setZoneFormData({ name: "", description: "", settlement_id: "" });
                    }}
                  >
                    Mégse
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hierarchikus lista */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Települések és körzetek</CardTitle>
          </CardHeader>
          <CardContent>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSettlementDragEnd}
            >
              <SortableContext
                items={settlements.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {settlements.map((settlement) => (
                  <SortableItem key={settlement.id} id={settlement.id}>
                    <div className="flex-1 mb-4">
                      <Card className="bg-muted/50">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-semibold">
                              {settlement.name}
                            </CardTitle>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingSettlement(settlement);
                                  setSettlementName(settlement.name);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteSettlement(settlement.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(event) => handleZoneDragEnd(event, settlement.id)}
                          >
                            <SortableContext
                              items={zones
                                .filter((z) => z.settlement_id === settlement.id)
                                .map((z) => z.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              {zones
                                .filter((z) => z.settlement_id === settlement.id)
                                .map((zone) => (
                                  <SortableItem key={zone.id} id={zone.id}>
                                    <div className="flex-1 mb-2">
                                      <Card className="bg-background">
                                        <CardContent className="p-3">
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <p className="font-medium">{zone.name}</p>
                                              {zone.description && (
                                                <p className="text-sm text-muted-foreground">
                                                  {zone.description}
                                                </p>
                                              )}
                                            </div>
                                            <div className="flex gap-2">
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                  setEditingZone(zone);
                                                  setZoneFormData({
                                                    name: zone.name,
                                                    description: zone.description || "",
                                                    settlement_id: zone.settlement_id || "",
                                                  });
                                                }}
                                              >
                                                <Edit className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDeleteZone(zone.id)}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    </div>
                                  </SortableItem>
                                ))}
                            </SortableContext>
                          </DndContext>
                          {zones.filter((z) => z.settlement_id === settlement.id).length === 0 && (
                            <p className="text-sm text-muted-foreground italic">
                              Nincs még beírókörzet
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </SortableItem>
                ))}
              </SortableContext>
            </DndContext>
            {settlements.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                Nincs még település. Hozzon létre egyet a fenti űrlappal!
              </p>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};
