import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { Badge } from "@/components/ui/badge";

interface QuickActionsSettingsDialogProps {
  onSettingsChanged: () => void;
}

const AVAILABLE_ACTIONS = [
  { value: "add_animal", label: "Vad hozzáadása", icon: "Plus" },
  { value: "hunting_registration", label: "Beiratkozás", icon: "CalendarCheck" },
  { value: "hunting_registrations", label: "Beiratkozások megtekintése", icon: "List" },
  { value: "hunters", label: "Bérvadászok", icon: "Users" },
  { value: "tickets", label: "Támogatási jegyek", icon: "Ticket" },
  { value: "reports", label: "Jelentések", icon: "FileText" },
  { value: "settings", label: "Beállítások", icon: "Settings" },
  { value: "users", label: "Felhasználók", icon: "UserCog" },
];

export function QuickActionsSettingsDialog({ onSettingsChanged }: QuickActionsSettingsDialogProps) {
  const { toast } = useToast();
  const { tier } = useSubscription();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [action1, setAction1] = useState("add_animal");
  const [action2, setAction2] = useState("hunting_registration");

  const isPro = tier === "pro";

  useEffect(() => {
    if (open && isPro) {
      fetchSettings();
    }
  }, [open, isPro]);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("quick_actions_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setAction1(data.action_1);
        setAction2(data.action_2);
      }
    } catch (error) {
      console.error("Error fetching quick actions settings:", error);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nincs bejelentkezve");

      const { error } = await supabase
        .from("quick_actions_settings")
        .upsert({
          user_id: user.id,
          action_1: action1,
          action_2: action2,
        });

      if (error) throw error;

      toast({
        title: "Sikeres mentés",
        description: "A gyorsgombok beállításai sikeresen mentve.",
      });

      setOpen(false);
      onSettingsChanged();
    } catch (error) {
      console.error("Error saving quick actions settings:", error);
      toast({
        title: "Hiba",
        description: "A beállítások mentése sikertelen.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isPro) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="gap-2"
      >
        <Settings className="h-4 w-4" />
        Gyorsgombok
        <Badge variant="secondary" className="ml-1">Pro</Badge>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Gyorsgombok
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gyorsgombok testreszabása</DialogTitle>
          <DialogDescription>
            Válaszd ki a mobilon megjelenő két gyorsgomb funkcióját.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="action1">Első gyorsgomb</Label>
            <Select value={action1} onValueChange={setAction1}>
              <SelectTrigger id="action1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_ACTIONS.map((action) => (
                  <SelectItem key={action.value} value={action.value}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="action2">Második gyorsgomb</Label>
            <Select value={action2} onValueChange={setAction2}>
              <SelectTrigger id="action2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_ACTIONS.map((action) => (
                  <SelectItem key={action.value} value={action.value}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Mégse
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Mentés..." : "Mentés"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
