import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users as UsersIcon, Mail, UserCheck, Trash2, Shield, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { BanUserDialog } from "@/components/BanUserDialog";
import { InviteUserDialog } from "@/components/InviteUserDialog";
import { AddExistingHunterDialog } from "@/components/AddExistingHunterDialog";
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
    hunter_category: string | null;
    banned_until: string | null;
    ban_reason: string | null;
    user_type: string | null;
    registration_approved: boolean | null;
    hunter_society_id: string | null;
  };
}

interface PendingHunter {
  id: string;
  email: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  birth_date: string | null;
  tax_number: string | null;
  hunter_license_number: string | null;
  hunter_category: string | null;
  hunter_society_id: string | null;
  hunter_society_name: string | null;
  created_at: string;
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
  const [pendingHunters, setPendingHunters] = useState<PendingHunter[]>([]);
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
      // Get current user's hunter society
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("id, company_name, hunter_society_id, user_type")
        .eq("id", currentUser?.id)
        .single();

      const currentSocietyId = currentProfile?.user_type === "hunter" 
        ? currentProfile.hunter_society_id 
        : currentProfile?.id;

      // Fetch pending hunters (hunters with registration_approved = false)
      const { data: pendingData, error: pendingError } = await supabase
        .from("profiles")
        .select(`
          id,
          contact_name,
          contact_email,
          contact_phone,
          address,
          birth_date,
          tax_number,
          hunter_license_number,
          hunter_category,
          hunter_society_id,
          created_at,
          user_type
        `)
        .eq("user_type", "hunter")
        .eq("registration_approved", false)
        .eq("hunter_society_id", currentSocietyId)
        .order("created_at", { ascending: false });

      if (pendingError) throw pendingError;

      // Fetch hunter society names for pending hunters
      if (pendingData && pendingData.length > 0) {
        const societyIds = pendingData
          .map(h => h.hunter_society_id)
          .filter((id): id is string => id !== null);
        
        const { data: societies } = await supabase
          .from("profiles")
          .select("id, company_name")
          .in("id", societyIds);

        const pendingWithSociety = pendingData.map(hunter => ({
          id: hunter.id,
          email: hunter.contact_email || "",
          contact_name: hunter.contact_name,
          contact_phone: hunter.contact_phone,
          contact_email: hunter.contact_email,
          address: hunter.address,
          birth_date: hunter.birth_date,
          tax_number: hunter.tax_number,
          hunter_license_number: hunter.hunter_license_number,
          hunter_category: hunter.hunter_category,
          hunter_society_id: hunter.hunter_society_id,
          hunter_society_name: societies?.find(s => s.id === hunter.hunter_society_id)?.company_name || null,
          created_at: hunter.created_at,
        }));

        setPendingHunters(pendingWithSociety);
      } else {
        setPendingHunters([]);
      }

      // Fetch user roles with their profiles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });

      if (rolesError) throw rolesError;
      setUserRoles(rolesData || []);

      // Fetch users with roles AND approved hunters for this hunter society
      const userIds = rolesData?.map(r => r.user_id) || [];
      
      // Fetch profiles with roles
      const { data: profilesWithRoles } = await supabase
        .from("profiles")
        .select("id, company_name, contact_name, hunter_category, banned_until, ban_reason, user_type, registration_approved, hunter_society_id")
        .in("id", userIds);

      // Fetch approved hunters for this society
      const { data: approvedHunters } = await supabase
        .from("profiles")
        .select("id, company_name, contact_name, hunter_category, banned_until, ban_reason, user_type, registration_approved, hunter_society_id")
        .eq("user_type", "hunter")
        .eq("registration_approved", true)
        .eq("hunter_society_id", currentSocietyId);

      // Combine both lists, removing duplicates
      const allProfiles = [...(profilesWithRoles || [])];
      (approvedHunters || []).forEach(hunter => {
        if (!allProfiles.find(p => p.id === hunter.id)) {
          allProfiles.push(hunter);
        }
      });

      // Create a pseudo-user list from profiles
      const usersWithProfiles = allProfiles.map(profile => ({
        id: profile.id,
        email: "",
        created_at: rolesData?.find(r => r.user_id === profile.id)?.created_at || "",
        profiles: profile,
      }));

      setUsers(usersWithProfiles as any);

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

  const handleApproveHunter = async (hunterId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ registration_approved: true })
        .eq("id", hunterId);

      if (error) throw error;

      // Get the registration details to send notification
      const { data: registrations } = await supabase
        .from("hunting_registrations")
        .select("id")
        .eq("user_id", hunterId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1);

      // Send approval notification email if there's a pending registration
      if (registrations && registrations.length > 0) {
        try {
          await supabase.functions.invoke("send-registration-approval", {
            body: { registrationId: registrations[0].id },
          });
        } catch (emailError) {
          console.error("Failed to send approval email:", emailError);
          // Don't fail the whole operation if email fails
        }
      }

      toast({
        title: "Jóváhagyva!",
        description: "Vadász regisztráció jóváhagyva.",
      });

      await fetchData();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRejectHunter = async (hunterId: string) => {
    try {
      const { error } = await supabase.auth.admin.deleteUser(hunterId);
      if (error) throw error;

      toast({
        title: "Elutasítva!",
        description: "Vadász regisztráció elutasítva és törölve.",
      });

      await fetchData();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
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

  const handleHunterCategoryChange = async (userId: string, newCategory: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ hunter_category: newCategory as any })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "Vadász kategória módosítva!",
      });

      await fetchData();
    } catch (error: any) {
      console.error("Error changing hunter category:", error);
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

  const getHunterCategoryLabel = (category: string | null) => {
    if (!category) return "Nincs megadva";
    switch (category) {
      case "tag":
        return "Tag";
      case "vendeg":
        return "Vendég";
      case "bervadasz":
        return "Bérvadász";
      case "ib_vendeg":
        return "IB Vendég";
      case "trofeas_vadasz":
        return "Trófeás vadász";
      case "egyeb":
        return "Egyéb";
      default:
        return "Nincs megadva";
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
          {/* Jóváhagyásra váró vadászok */}
          {pendingHunters.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Jóváhagyásra váró vadászok
                </CardTitle>
                <CardDescription>
                  Vadász regisztrációk, amelyek adminisztrátori jóváhagyásra várnak
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {pendingHunters.map((hunter) => (
                    <Card key={hunter.id} className="border-l-4 border-l-primary">
                      <CardHeader>
                        <CardTitle className="text-lg">{hunter.contact_name || "Névtelen"}</CardTitle>
                        <CardDescription>
                          Regisztráció: {new Date(hunter.created_at).toLocaleDateString("hu-HU", { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Email</p>
                            <p className="text-sm">{hunter.email || "-"}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Telefonszám</p>
                            <p className="text-sm">{hunter.contact_phone || "-"}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Cím</p>
                            <p className="text-sm">{hunter.address || "-"}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Születési dátum</p>
                            <p className="text-sm">
                              {hunter.birth_date 
                                ? new Date(hunter.birth_date).toLocaleDateString("hu-HU") 
                                : "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Adószám</p>
                            <p className="text-sm">{hunter.tax_number || "-"}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Vadászjegyszám</p>
                            <p className="text-sm">{hunter.hunter_license_number || "-"}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Vadász kategória</p>
                            <p className="text-sm">{getHunterCategoryLabel(hunter.hunter_category)}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Vadásztársaság</p>
                            <p className="text-sm">{hunter.hunter_society_name || "-"}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleApproveHunter(hunter.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Igen
                          </Button>
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => handleRejectHunter(hunter.id)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Nem
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
                    <TableHead>Vadász kategória</TableHead>
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
                          <div className="flex flex-col gap-1">
                            <Badge variant={getRoleBadgeVariant(role)}>
                              {getRoleLabel(role)}
                            </Badge>
                            {user.profiles?.banned_until && 
                             new Date(user.profiles.banned_until) > new Date() && (
                              <Badge variant="destructive" className="text-xs">
                                Kitiltva
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.profiles?.hunter_category || "tag"}
                            onValueChange={(value) => handleHunterCategoryChange(user.id, value)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Vadász kategória" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tag">Tag</SelectItem>
                              <SelectItem value="vendeg">Vendég</SelectItem>
                              <SelectItem value="bervadasz">Bérvadász</SelectItem>
                              <SelectItem value="ib_vendeg">IB Vendég</SelectItem>
                              <SelectItem value="trofeas_vadasz">Trófeás vadász</SelectItem>
                              <SelectItem value="egyeb">Egyéb</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString("hu-HU")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
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
                            <BanUserDialog
                              userId={user.id}
                              userEmail={user.email || user.profiles?.contact_name || "Névtelen"}
                              currentBanUntil={user.profiles?.banned_until}
                              currentBanReason={user.profiles?.ban_reason}
                              onBanUpdated={fetchData}
                            />
                          </div>
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
