import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UserCog } from "lucide-react";

type Role = "super_admin" | "admin" | "editor" | "viewer" | "hunter";

export const RoleSwitcher = () => {
  const [activeRole, setActiveRole] = useState<Role>("super_admin");

  useEffect(() => {
    const storedRole = localStorage.getItem("impersonate_role") as Role;
    if (storedRole) {
      setActiveRole(storedRole);
    }
  }, []);

  const handleRoleChange = (role: Role) => {
    setActiveRole(role);
    localStorage.setItem("impersonate_role", role);
    // Frissítjük az oldalt, hogy a változások érvényesüljenek
    window.location.reload();
  };

  return (
    <div className="space-y-2 px-2">
      <Label className="text-xs flex items-center gap-2">
        <UserCog className="h-3 w-3" />
        Szerepkör váltás (Super Admin)
      </Label>
      <Select value={activeRole} onValueChange={handleRoleChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="super_admin">Super Admin</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="editor">Szerkesztő</SelectItem>
          <SelectItem value="viewer">Néző</SelectItem>
          <SelectItem value="hunter">Vadász</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export const getActiveRole = (): Role | null => {
  return localStorage.getItem("impersonate_role") as Role | null;
};
