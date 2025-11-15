import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Plus, Pencil, Trash2, ChevronDown, ChevronRight, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { HuntingLocationsManager } from "@/components/HuntingLocationsManager";

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

export function SettlementsAndZonesDialog() {
  const [open, setOpen] = useState(false);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [zones, setZones] = useState<SecurityZone[]>([]);
  const [openSettlements, setOpenSettlements] = useState<Set<string>>(new Set());
  const [openZones, setOpenZones] = useState<Set<string>>(new Set());
  
  // Új település
  const [newSettlementName, setNewSettlementName] = useState("");
  
  // Település szerkesztése
  const [editingSettlement, setEditingSettlement] = useState<Settlement | null>(null);
  
  // Új beírókörzet
  const [addingZoneForSettlement, setAddingZoneForSettlement] = useState<string | null>(null);
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneDescription, setNewZoneDescription] = useState("");
  
  // Beírókörzet szerkesztése
  const [editingZone, setEditingZone] = useState<SecurityZone | null>(null);
  const [editingZoneSettlement, setEditingZoneSettlement] = useState<string>("");

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [settlementsResult, zonesResult] = await Promise.all([
      supabase
        .from("settlements")
        .select("*")
        .eq("user_id", user.id)
        .order("display_order"),
      supabase
        .from("security_zones")
        .select("*")
        .eq("user_id", user.id)
        .order("display_order"),
    ]);

    if (settlementsResult.data) setSettlements(settlementsResult.data);
    if (zonesResult.data) setZones(zonesResult.data);
  };

  const toggleSettlement = (id: string) => {
    const newOpen = new Set(openSettlements);
    if (newOpen.has(id)) {
      newOpen.delete(id);
    } else {
      newOpen.add(id);
    }
    setOpenSettlements(newOpen);
  };

  const toggleZone = (id: string) => {
    const newOpen = new Set(openZones);
    if (newOpen.has(id)) {
      newOpen.delete(id);
    } else {
      newOpen.add(id);
    }
    setOpenZones(newOpen);
  };

  // Település műveletek
  const addSettlement = async () => {
    if (!newSettlementName.trim()) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("settlements").insert({
      name: newSettlementName,
      user_id: user.id,
      display_order: settlements.length,
    });

    if (error) {
      toast({ title: "Hiba", description: "Nem sikerült hozzáadni", variant: "destructive" });
    } else {
      toast({ title: "Település hozzáadva" });
      setNewSettlementName("");
      fetchData();
    }
  };

  const updateSettlement = async () => {
    if (!editingSettlement || !editingSettlement.name.trim()) return;

    const { error } = await supabase
      .from("settlements")
      .update({ name: editingSettlement.name })
      .eq("id", editingSettlement.id);

    if (error) {
      toast({ title: "Hiba", description: "Nem sikerült módosítani", variant: "destructive" });
    } else {
      toast({ title: "Település módosítva" });
      setEditingSettlement(null);
      fetchData();
    }
  };

  const deleteSettlement = async (id: string) => {
    const { error } = await supabase.from("settlements").delete().eq("id", id);

    if (error) {
      toast({ title: "Hiba", description: "Nem sikerült törölni", variant: "destructive" });
    } else {
      toast({ title: "Település törölve" });
      fetchData();
    }
  };

  const moveSettlement = async (id: string, direction: "up" | "down") => {
    const index = settlements.findIndex((s) => s.id === id);
    if (index === -1) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === settlements.length - 1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const reordered = [...settlements];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    
    const updated = reordered.map((s, i) => ({ ...s, display_order: i }));
    setSettlements(updated);

    for (const settlement of updated) {
      await supabase
        .from("settlements")
        .update({ display_order: settlement.display_order })
        .eq("id", settlement.id);
    }
  };

  // Beírókörzet műveletek
  const addZone = async () => {
    if (!newZoneName.trim() || !addingZoneForSettlement) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const settlementZones = zones.filter((z) => z.settlement_id === addingZoneForSettlement);

    const { error } = await supabase.from("security_zones").insert({
      name: newZoneName,
      description: newZoneDescription || null,
      settlement_id: addingZoneForSettlement,
      user_id: user.id,
      display_order: settlementZones.length,
    });

    if (error) {
      toast({ title: "Hiba", description: "Nem sikerült hozzáadni", variant: "destructive" });
    } else {
      toast({ title: "Beírókörzet hozzáadva" });
      setNewZoneName("");
      setNewZoneDescription("");
      setAddingZoneForSettlement(null);
      fetchData();
    }
  };

  const updateZone = async () => {
    if (!editingZone || !editingZone.name.trim()) return;

    const { error } = await supabase
      .from("security_zones")
      .update({
        name: editingZone.name,
        description: editingZone.description,
        settlement_id: editingZoneSettlement || null,
      })
      .eq("id", editingZone.id);

    if (error) {
      toast({ title: "Hiba", description: "Nem sikerült módosítani", variant: "destructive" });
    } else {
      toast({ title: "Beírókörzet módosítva" });
      setEditingZone(null);
      setEditingZoneSettlement("");
      fetchData();
    }
  };

  const deleteZone = async (id: string) => {
    const { error } = await supabase.from("security_zones").delete().eq("id", id);

    if (error) {
      toast({ title: "Hiba", description: "Nem sikerült törölni", variant: "destructive" });
    } else {
      toast({ title: "Beírókörzet törölve" });
      fetchData();
    }
  };

  const moveZone = async (id: string, direction: "up" | "down") => {
    const zone = zones.find((z) => z.id === id);
    if (!zone) return;

    const settlementZones = zones.filter((z) => z.settlement_id === zone.settlement_id);
    const index = settlementZones.findIndex((z) => z.id === id);
    if (index === -1) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === settlementZones.length - 1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const reordered = [...settlementZones];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    
    const updated = reordered.map((z, i) => ({ ...z, display_order: i }));
    
    const otherZones = zones.filter((z) => z.settlement_id !== zone.settlement_id);
    setZones([...otherZones, ...updated]);

    for (const updatedZone of updated) {
      await supabase
        .from("security_zones")
        .update({ display_order: updatedZone.display_order })
        .eq("id", updatedZone.id);
    }
  };

  const getZonesForSettlement = (settlementId: string) => {
    return zones.filter((z) => z.settlement_id === settlementId);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start">
          <MapPin className="mr-2 h-4 w-4" />
          Települések és Beírókörzetek
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Települések és Beírókörzetek kezelése</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Új település */}
          <div className="space-y-2">
            <Label>Új település</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Település neve"
                value={newSettlementName}
                onChange={(e) => setNewSettlementName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSettlement()}
              />
              <Button onClick={addSettlement}>
                <Plus className="h-4 w-4 mr-1" />
                Hozzáad
              </Button>
            </div>
          </div>

          {/* Települések listája */}
          <div className="space-y-2">
            <Label>Települések</Label>
            {settlements.map((settlement, index) => {
              const settlementZones = getZonesForSettlement(settlement.id);
              const isOpen = openSettlements.has(settlement.id);
              
              return (
                <div key={settlement.id} className="bg-card border rounded-lg">
                  <div className="flex items-center gap-2 p-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSettlement(settlement.id)}
                      className="p-0 h-6 w-6"
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="font-medium flex-1">{settlement.name}</span>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveSettlement(settlement.id, "up")}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveSettlement(settlement.id, "down")}
                      disabled={index === settlements.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAddingZoneForSettlement(settlement.id)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Beírókörzet
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingSettlement(settlement)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSettlement(settlement.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {isOpen && (
                    <div className="pl-12 pr-3 pb-3 space-y-2">
                      {settlementZones.length > 0 ? (
                        settlementZones.map((zone, zoneIndex) => {
                          const isZoneOpen = openZones.has(zone.id);
                          return (
                            <div key={zone.id} className="bg-muted/30 rounded">
                              <div className="flex items-center gap-2 p-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleZone(zone.id)}
                                  className="p-0 h-6 w-6"
                                >
                                  {isZoneOpen ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                </Button>
                                <span className="flex-1 text-sm">{zone.name}</span>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => moveZone(zone.id, "up")}
                                  disabled={zoneIndex === 0}
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </Button>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => moveZone(zone.id, "down")}
                                  disabled={zoneIndex === settlementZones.length - 1}
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </Button>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingZone(zone);
                                    setEditingZoneSettlement(zone.settlement_id || "");
                                  }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteZone(zone.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              {isZoneOpen && (
                                <div className="px-2 pb-2">
                                  <HuntingLocationsManager
                                    securityZoneId={zone.id}
                                    securityZoneName={zone.name}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          Még nincs beírókörzet
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Település szerkesztése */}
          {editingSettlement && (
            <div className="space-y-2 border-t pt-4">
              <Label>Település szerkesztése</Label>
              <div className="flex gap-2">
                <Input
                  value={editingSettlement.name}
                  onChange={(e) =>
                    setEditingSettlement({ ...editingSettlement, name: e.target.value })
                  }
                />
                <Button onClick={updateSettlement}>Mentés</Button>
                <Button variant="outline" onClick={() => setEditingSettlement(null)}>
                  Mégse
                </Button>
              </div>
            </div>
          )}

          {/* Beírókörzet hozzáadása */}
          {addingZoneForSettlement && (
            <div className="space-y-2 border-t pt-4">
              <Label>Új beírókörzet</Label>
              <Input
                placeholder="Beírókörzet neve"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
              />
              <Input
                placeholder="Leírás (opcionális)"
                value={newZoneDescription}
                onChange={(e) => setNewZoneDescription(e.target.value)}
              />
              <div className="flex gap-2">
                <Button onClick={addZone}>Hozzáad</Button>
                <Button variant="outline" onClick={() => {
                  setAddingZoneForSettlement(null);
                  setNewZoneName("");
                  setNewZoneDescription("");
                }}>
                  Mégse
                </Button>
              </div>
            </div>
          )}

          {/* Beírókörzet szerkesztése */}
          {editingZone && (
            <div className="space-y-2 border-t pt-4">
              <Label>Beírókörzet szerkesztése</Label>
              <Input
                value={editingZone.name}
                onChange={(e) =>
                  setEditingZone({ ...editingZone, name: e.target.value })
                }
              />
              <Input
                placeholder="Leírás (opcionális)"
                value={editingZone.description || ""}
                onChange={(e) =>
                  setEditingZone({ ...editingZone, description: e.target.value })
                }
              />
              <div className="space-y-2">
                <Label>Település</Label>
                <Select
                  value={editingZoneSettlement}
                  onValueChange={setEditingZoneSettlement}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Válassz települést" />
                  </SelectTrigger>
                  <SelectContent>
                    {settlements.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={updateZone}>Mentés</Button>
                <Button variant="outline" onClick={() => {
                  setEditingZone(null);
                  setEditingZoneSettlement("");
                }}>
                  Mégse
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
