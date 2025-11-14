import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const InviteUserDialog = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "editor" | "viewer" | "hunter">("hunter");
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!email.trim() || !email.includes("@")) {
      toast({
        title: "Hiba",
        description: "Adjon meg egy érvényes email címet!",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user is admin
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roles) {
        toast({
          title: "Hiba",
          description: "Csak adminisztrátorok küldhetnek meghívókat!",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Create invitation
      const { error: inviteError } = await supabase
        .from("invitations")
        .insert({
          email: email.toLowerCase().trim(),
          role: role,
          invited_by: user.id,
        });

      if (inviteError) throw inviteError;

      // Call edge function to send email
      const { error: emailError } = await supabase.functions.invoke("send-invitation", {
        body: { email: email.toLowerCase().trim() },
      });

      if (emailError) {
        console.error("Email sending error:", emailError);
        toast({
          title: "Figyelmeztetés",
          description: "A meghívó létrejött, de az email küldése sikertelen volt.",
        });
      } else {
        toast({
          title: "Siker!",
          description: `Meghívó elküldve a következő címre: ${email}`,
        });
      }

      setEmail("");
      setRole("hunter");
      setOpen(false);
    } catch (error: any) {
      console.error("Invitation error:", error);
      toast({
        title: "Hiba",
        description: error.message || "Nem sikerült elküldeni a meghívót.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <UserPlus className="h-4 w-4 mr-2" />
          Felhasználó meghívása
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Felhasználó meghívása</DialogTitle>
          <DialogDescription>
            Küldjön meghívót egy új felhasználónak és válassza ki a szerepkörét:
            <ul className="mt-2 ml-4 list-disc text-sm">
              <li><strong>Admin:</strong> Teljes hozzáférés, felhasználók kezelése</li>
              <li><strong>Kezelő:</strong> Vadakat tud hozzáadni, de törölni vagy módosítani nem</li>
              <li><strong>Megtekintő:</strong> Csak megtekintési jogosultság</li>
              <li><strong>Vadász:</strong> Csak a hűtőben lévő vadakat tekintheti meg</li>
            </ul>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="role">Szerepkör</Label>
            <Select value={role} onValueChange={(value: "admin" | "editor" | "viewer" | "hunter") => setRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Válasszon szerepkört" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">👑 Admin (teljes hozzáférés)</SelectItem>
                <SelectItem value="editor">📝 Kezelő (hozzáadás engedélyezve)</SelectItem>
                <SelectItem value="viewer">👁️ Megtekintő (csak olvasás)</SelectItem>
                <SelectItem value="hunter">🏹 Vadász (csak megtekintés)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email cím</Label>
            <Input
              id="email"
              type="email"
              placeholder="pelda@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleInvite();
                }
              }}
            />
          </div>
          <Button onClick={handleInvite} disabled={loading} className="w-full">
            {loading ? "Küldés..." : "Meghívó küldése"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
