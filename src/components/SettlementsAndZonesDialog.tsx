import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Plus, GripVertical, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

interface SortableSettlementItemProps {
  settlement: Settlement;
  zones: SecurityZone[];
  onEdit: (settlement: Settlement) => void;
  onDelete: (id: string) => void;
  onEditZone: (zone: SecurityZone) => void;
  onDeleteZone: (id: string) => void;
  onAddZone: (settlementId: string) => void;
  onReorderZones: (settlementId: string, zones: SecurityZone[]) => void;
}

function SortableSettlementItem({
  settlement,
  zones,
  onEdit,
  onDelete,
  onEditZone,
  onDeleteZone,
  onAddZone,
  onReorderZones,
}: SortableSettlementItemProps) {
  const [isOpen, setIsOpen] = useState(true);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: settlement.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleZoneDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = zones.findIndex((z) => z.id === active.id);
      const newIndex = zones.findIndex((z) => z.id === over.id);
      
      const reorderedZones = arrayMove(zones, oldIndex, newIndex).map((zone, index) => ({
        ...zone,
        display_order: index,
      }));
      
      onReorderZones(settlement.id, reorderedZones);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-card border rounded-lg mb-2">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-2 p-3">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          
          <MapPin className="h-4 w-4 text-primary" />
          <span className="font-medium flex-1">{settlement.name}</span>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddZone(settlement.id)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Beírókörzet
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(settlement)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(settlement.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        
        <CollapsibleContent>
          {zones.length > 0 ? (
            <div className="pl-12 pr-3 pb-3">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleZoneDragEnd}
              >
                <SortableContext
                  items={zones.map((z) => z.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {zones.map((zone) => (
                    <SortableZoneItem
                      key={zone.id}
                      zone={zone}
                      onEdit={onEditZone}
                      onDelete={onDeleteZone}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          ) : (
            <div className="pl-12 pr-3 pb-3 text-sm text-muted-foreground">
              Még nincs beírókörzet
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

interface SortableZoneItemProps {
  zone: SecurityZone;
  onEdit: (zone: SecurityZone) => void;
  onDelete: (id: string) => void;
}

function SortableZoneItem({ zone, onEdit, onDelete }: SortableZoneItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: zone.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 bg-muted/30 rounded mb-1"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <span className="flex-1 text-sm">{zone.name}</span>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onEdit(zone)}
      >
        <Pencil className="h-3 w-3" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(zone.id)}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function SettlementsAndZonesDialog() {
  const [open, setOpen] = useState(false);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [zones, setZones] = useState<SecurityZone[]>([]);
  const [editingSettlement, setEditingSettlement] = useState<Settlement | null>(null);
  const [editingZone, setEditingZone] = useState<SecurityZone | null>(null);
  const [newSettlementName, setNewSettlementName] = useState("");
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneDescription, setNewZoneDescription] = useState("");
  const [addingZoneForSettlement, setAddingZoneForSettlement] = useState<string | null>(null);

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

  const handleSettlementDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = settlements.findIndex((s) => s.id === active.id);
      const newIndex = settlements.findIndex((s) => s.id === over.id);
      
      const reordered = arrayMove(settlements, oldIndex, newIndex).map((settlement, index) => ({
        ...settlement,
        display_order: index,
      }));
      
      setSettlements(reordered);
      
      for (const settlement of reordered) {
        await supabase
          .from("settlements")
          .update({ display_order: settlement.display_order })
          .eq("id", settlement.id);
      }
    }
  };

  const handleZoneReorder = async (settlementId: string, reorderedZones: SecurityZone[]) => {
    setZones((prev) => {
      const otherZones = prev.filter((z) => z.settlement_id !== settlementId);
      return [...otherZones, ...reorderedZones];
    });
    
    for (const zone of reorderedZones) {
      await supabase
        .from("security_zones")
        .update({ display_order: zone.display_order })
        .eq("id", zone.id);
    }
  };

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
      toast({ title: "Hiba", description: "Nem sikerült hozzáadni a települést", variant: "destructive" });
    } else {
      toast({ title: "Siker", description: "Település hozzáadva" });
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
      toast({ title: "Siker", description: "Település módosítva" });
      setEditingSettlement(null);
      fetchData();
    }
  };

  const deleteSettlement = async (id: string) => {
    const { error } = await supabase.from("settlements").delete().eq("id", id);

    if (error) {
      toast({ title: "Hiba", description: "Nem sikerült törölni", variant: "destructive" });
    } else {
      toast({ title: "Siker", description: "Település törölve" });
      fetchData();
    }
  };

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
      toast({ title: "Hiba", description: "Nem sikerült hozzáadni a beírókört", variant: "destructive" });
    } else {
      toast({ title: "Siker", description: "Beírókörzet hozzáadva" });
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
      })
      .eq("id", editingZone.id);

    if (error) {
      toast({ title: "Hiba", description: "Nem sikerült módosítani", variant: "destructive" });
    } else {
      toast({ title: "Siker", description: "Beírókörzet módosítva" });
      setEditingZone(null);
      fetchData();
    }
  };

  const deleteZone = async (id: string) => {
    const { error } = await supabase.from("security_zones").delete().eq("id", id);

    if (error) {
      toast({ title: "Hiba", description: "Nem sikerült törölni", variant: "destructive" });
    } else {
      toast({ title: "Siker", description: "Beírókörzet törölve" });
      fetchData();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg">
          <MapPin className="mr-2 h-5 w-5" />
          Települések és Beírókörzetek
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Települések és Beírókörzetek kezelése</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Új település hozzáadása */}
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
                  <SortableSettlementItem
                    key={settlement.id}
                    settlement={settlement}
                    zones={zones.filter((z) => z.settlement_id === settlement.id)}
                    onEdit={setEditingSettlement}
                    onDelete={deleteSettlement}
                    onEditZone={setEditingZone}
                    onDeleteZone={deleteZone}
                    onAddZone={setAddingZoneForSettlement}
                    onReorderZones={handleZoneReorder}
                  />
                ))}
              </SortableContext>
            </DndContext>
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
                <Button variant="outline" onClick={() => setAddingZoneForSettlement(null)}>
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
              <div className="flex gap-2">
                <Button onClick={updateZone}>Mentés</Button>
                <Button variant="outline" onClick={() => setEditingZone(null)}>
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
