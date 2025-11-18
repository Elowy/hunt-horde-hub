import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCog } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

type Role = "super_admin" | "admin" | "editor" | "viewer" | "hunter";

export const SuperAdminRoleSwitcher = () => {
  const [activeRole, setActiveRole] = useState<Role>("super_admin");

  useEffect(() => {
    const storedRole = localStorage.getItem("test_impersonate_role") as Role;
    if (storedRole) {
      setActiveRole(storedRole);
    }
  }, []);

  const handleRoleChange = (role: Role) => {
    setActiveRole(role);
    localStorage.setItem("test_impersonate_role", role);
    window.location.reload();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5" />
          Szerepkör tesztelés
        </CardTitle>
        <CardDescription>
          UI tesztelés céljából válthat szerepkörök között. Az autorizáció továbbra is szerver oldalon történik.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Ez csak UI tesztelési célokat szolgál. A valódi adathozzáférés és jogosultságok továbbra is a szerveren ellenőrzöttek.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-2">
          <Label>Teszt szerepkör</Label>
          <Select value={activeRole} onValueChange={handleRoleChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="super_admin">Super Admin (valódi)</SelectItem>
              <SelectItem value="admin">Admin (UI teszt)</SelectItem>
              <SelectItem value="editor">Szerkesztő (UI teszt)</SelectItem>
              <SelectItem value="viewer">Néző (UI teszt)</SelectItem>
              <SelectItem value="hunter">Vadász (UI teszt)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

export const getTestRole = (): Role | null => {
  return localStorage.getItem("test_impersonate_role") as Role | null;
};
