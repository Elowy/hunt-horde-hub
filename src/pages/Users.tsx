import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users as UsersIcon, Mail, UserCheck, Trash2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface User {
  id: string;
  email: string;
  created_at: string;
  profiles?: {
    company_name: string | null;
    contact_name: string | null;
  };
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  accepted: boolean;
  created_at: string;
  expires_at: string;
  profiles?: {
    company_name: string | null;
    contact_name: string | null;
  };
}

const Users = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [deleteType, setDeleteType] = useState<"invitation" | "role">("invitation");

  useEffect(() => {
    checkAdminAndFetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const checkAdminAndFetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Check if user is admin
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roles) {
        toast({
          title: "Hozzáférés megtagadva",
          description: "Csak adminisztrátorok láthatják ezt az oldalt!",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
      await fetchData();
    } catch (error: any) {
      console.error("Error checking admin:", error);
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch user roles with their profiles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });

      if (rolesError) throw rolesError;
      setUserRoles(rolesData || []);

      // Fetch profiles for users with roles
      if (rolesData && rolesData.length > 0) {
        const userIds = rolesData.map(r => r.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, company_name, contact_name")
          .in("id", userIds);

        // Create a pseudo-user list from profiles
        const usersWithProfiles = profilesData?.map(profile => ({
          id: profile.id,
          email: "", // We can't get email from profiles, but we can show other info
          created_at: rolesData.find(r => r.user_id === profile.id)?.created_at || "",
          profiles: profile,
        })) || [];

        setUsers(usersWithProfiles);
      }

      // Fetch invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from("invitations")
        .select("*")
        .order("created_at", { ascending: false });

      if (invitationsError) throw invitationsError;

      // Fetch profiles for invitations
      if (invitationsData && invitationsData.length > 0) {
        const inviterIds = invitationsData.map(inv => inv.invited_by);
        const { data: inviterProfiles } = await supabase
          .from("profiles")
          .select("id, company_name, contact_name")
          .in("id", inviterIds);

        const invitationsWithProfiles = invitationsData.map(inv => ({
          ...inv,
          profiles: inviterProfiles?.find(p => p.id === inv.invited_by),
        }));

        setInvitations(invitationsWithProfiles as any);
      } else {
        setInvitations([]);
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni az adatokat.",
        variant: "destructive",
      });
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Don't allow changing own role
      if (userId === user.id) {
        toast({
          title: "Hiba",
          description: "Saját szerepkört nem módosíthatja!",
          variant: "destructive",
        });
        return;
      }

      // Delete existing roles for this user
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      // Insert new role
      const { error } = await supabase
        .from("user_roles")
        .insert([{
          user_id: userId,
          role: newRole as "admin" | "editor" | "viewer",
        }]);

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "Szerepkör módosítva!",
      });

      await fetchData();
    } catch (error: any) {
      console.error("Error changing role:", error);
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from("invitations")
        .delete()
        .eq("id", invitationId);

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "Meghívó törölve!",
      });

      await fetchData();
    } catch (error: any) {
      console.error("Error deleting invitation:", error);
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openDeleteDialog = (id: string, type: "invitation" | "role") => {
    setSelectedItemId(id);
    setDeleteType(type);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteType === "invitation") {
      await handleDeleteInvitation(selectedItemId);
    }
    setDeleteDialogOpen(false);
    setSelectedItemId("");
  };

  const getUserRole = (userId: string) => {
    const role = userRoles.find(r => r.user_id === userId);
    return role?.role || "Nincs szerepkör";
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "editor":
        return "default";
      case "viewer":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Adminisztrátor";
      case "editor":
        return "Szerkesztő";
      case "viewer":
        return "Megtekintő";
      default:
        return "Nincs szerepkör";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Betöltés...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <PageHeader 
        isAdmin={isAdmin}
        isEditor={false}
        onLogout={handleLogout}
      />

      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <div className="grid gap-6">
          {/* Aktív felhasználók */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5" />
                Aktív felhasználók
              </CardTitle>
              <CardDescription>
                Regisztrált felhasználók és szerepköreik
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cégnév / Kapcsolattartó</TableHead>
                    <TableHead>Szerepkör</TableHead>
                    <TableHead>Hozzáadva</TableHead>
                    <TableHead>Művelet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const role = getUserRole(user.id);
                    const currentUser = supabase.auth.getUser();
                    
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.profiles?.company_name || user.profiles?.contact_name || "Névtelen felhasználó"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(role)}>
                            {getRoleLabel(role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString("hu-HU")}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={role}
                            onValueChange={(value) => handleRoleChange(user.id, value)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Szerepkör választás" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4" />
                                  Adminisztrátor
                                </div>
                              </SelectItem>
                              <SelectItem value="editor">
                                <div className="flex items-center gap-2">
                                  <UserCheck className="h-4 w-4" />
                                  Szerkesztő
                                </div>
                              </SelectItem>
                              <SelectItem value="viewer">
                                <div className="flex items-center gap-2">
                                  <UsersIcon className="h-4 w-4" />
                                  Megtekintő
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Függőben lévő meghívók */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Függőben lévő meghívók
              </CardTitle>
              <CardDescription>
                Kiküldött meghívók listája
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Még nincs függőben lévő meghívó.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Szerepkör</TableHead>
                      <TableHead>Állapot</TableHead>
                      <TableHead>Meghívta</TableHead>
                      <TableHead>Létrehozva</TableHead>
                      <TableHead>Lejár</TableHead>
                      <TableHead>Művelet</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((invitation) => {
                      const isExpired = new Date(invitation.expires_at) < new Date();
                      
                      return (
                        <TableRow key={invitation.id}>
                          <TableCell className="font-medium">{invitation.email}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(invitation.role)}>
                              {getRoleLabel(invitation.role)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {invitation.accepted ? (
                              <Badge variant="default">Elfogadva</Badge>
                            ) : isExpired ? (
                              <Badge variant="destructive">Lejárt</Badge>
                            ) : (
                              <Badge variant="secondary">Függőben</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {invitation.profiles?.company_name || 
                             invitation.profiles?.contact_name || 
                             "-"}
                          </TableCell>
                          <TableCell>
                            {new Date(invitation.created_at).toLocaleDateString("hu-HU")}
                          </TableCell>
                          <TableCell>
                            {new Date(invitation.expires_at).toLocaleDateString("hu-HU")}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(invitation.id, "invitation")}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Biztosan törli?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === "invitation" 
                ? "Ez véglegesen törli a meghívót."
                : "Ez véglegesen törli a felhasználó szerepkörét."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégse</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Törlés</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Users;
