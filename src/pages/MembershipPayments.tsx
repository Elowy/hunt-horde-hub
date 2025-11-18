import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, CheckCircle, XCircle, Users, Plus } from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";

interface Member {
  id: string;
  contact_name: string | null;
  contact_email: string | null;
}

interface Payment {
  id: string;
  user_id: string;
  period: "first_half" | "second_half" | "full_year";
  amount: number;
  paid: boolean;
  paid_at: string | null;
  notes: string | null;
  season_year: number;
  profiles: {
    contact_name: string | null;
    contact_email: string | null;
  } | null;
}

interface FeeSettings {
  first_half_amount: number;
  second_half_amount: number;
  full_year_amount: number;
}

const MembershipPayments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [currentSeasonYear, setCurrentSeasonYear] = useState(0);
  const [selectedSeasonYear, setSelectedSeasonYear] = useState(0);
  const [availableSeasons, setAvailableSeasons] = useState<number[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [feeSettings, setFeeSettings] = useState<FeeSettings | null>(null);
  const [selectedMember, setSelectedMember] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<"first_half" | "second_half" | "full_year">("first_half");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [bulkPeriod, setBulkPeriod] = useState<"first_half" | "second_half" | "full_year">("first_half");
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkCreating, setBulkCreating] = useState(false);

  useEffect(() => {
    checkAuth();
    initializeData();
  }, []);

  useEffect(() => {
    if (selectedSeasonYear > 0) {
      fetchPayments(selectedSeasonYear);
      fetchFeeSettings(selectedSeasonYear);
    }
  }, [selectedSeasonYear]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const { data: editorRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "editor")
      .maybeSingle();

    setIsAdmin(!!adminRole);
    setIsEditor(!!editorRole);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const initializeData = async () => {
    try {
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();
      const seasonYear = currentMonth <= 2 ? currentYear - 1 : currentYear;
      setCurrentSeasonYear(seasonYear);
      setSelectedSeasonYear(seasonYear);

      await Promise.all([
        fetchMembers(),
        fetchPayments(seasonYear),
        fetchFeeSettings(seasonYear),
        fetchAvailableSeasons(),
        fetchAllPayments()
      ]);
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

  const fetchAvailableSeasons = async () => {
    try {
      const { data, error } = await supabase
        .from("membership_payments")
        .select("season_year");

      if (error) throw error;

      // Get unique season years and sort them
      const uniqueSeasons = [...new Set(data?.map(p => p.season_year) || [])].sort((a, b) => b - a);
      
      // Add current season if not present
      if (!uniqueSeasons.includes(currentSeasonYear)) {
        uniqueSeasons.unshift(currentSeasonYear);
        uniqueSeasons.sort((a, b) => b - a);
      }
      
      setAvailableSeasons(uniqueSeasons);
    } catch (error) {
      console.error("Error fetching available seasons:", error);
    }
  };

  const fetchAllPayments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("membership_payments")
        .select(`
          *,
          profiles!membership_payments_user_id_fkey (
            contact_name,
            contact_email
          )
        `)
        .eq("hunter_society_id", user.id)
        .order("season_year", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAllPayments(data || []);
    } catch (error) {
      console.error("Error fetching all payments:", error);
    }
  };

  const fetchMembers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, contact_name, contact_email")
      .eq("hunter_society_id", user.id)
      .eq("user_type", "hunter")
      .order("contact_name");

    if (error) throw error;
    setMembers(data || []);
  };

  const fetchPayments = async (seasonYear: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("membership_payments")
      .select(`
        *,
        profiles!membership_payments_user_id_fkey(contact_name, contact_email)
      `)
      .eq("hunter_society_id", user.id)
      .eq("season_year", seasonYear)
      .order("paid", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw error;
    setPayments(data || []);
  };

  const fetchFeeSettings = async (seasonYear: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("membership_fee_settings")
      .select("first_half_amount, second_half_amount, full_year_amount")
      .eq("hunter_society_id", user.id)
      .eq("season_year", seasonYear)
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw error;
    setFeeSettings(data);
  };

  const handleCreatePayment = async () => {
    if (!selectedMember || !amount) {
      toast({
        title: "Hiba",
        description: "Válasszon tagot és adjon meg összeget!",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nincs bejelentkezve");

      const { error } = await supabase
        .from("membership_payments")
        .insert({
          hunter_society_id: user.id,
          user_id: selectedMember,
          season_year: currentSeasonYear,
          period: selectedPeriod,
          amount: parseFloat(amount),
          paid: false,
          notes: notes || null,
        });

      if (error) throw error;

      // Send notification
      await sendPaymentNotification(selectedMember, user.id);

      toast({
        title: "Sikeres létrehozás",
        description: "A tagdíj bejegyzés sikeresen létrehozva és értesítés elküldve.",
      });

      setDialogOpen(false);
      setSelectedMember("");
      setAmount("");
      setNotes("");
      fetchPayments(selectedSeasonYear);
      fetchAvailableSeasons();
      fetchAllPayments();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const sendPaymentNotification = async (memberId: string, societyId: string) => {
    try {
      const { data: memberData } = await supabase
        .from("profiles")
        .select("contact_name, contact_email")
        .eq("id", memberId)
        .single();

      const { data: societyData } = await supabase
        .from("profiles")
        .select("company_name")
        .eq("id", societyId)
        .single();

      if (!memberData?.contact_email) {
        console.log("Tagnak nincs email címe, értesítés nem került elküldésre");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.functions.invoke("send-membership-fee-notification", {
        body: {
          user_email: memberData.contact_email,
          user_name: memberData.contact_name || "Tag",
          period: selectedPeriod,
          amount: parseFloat(amount),
          season_year: currentSeasonYear,
          hunter_society_name: societyData?.company_name || "Vadásztársaság",
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
    } catch (error) {
      console.error("Értesítés küldési hiba:", error);
    }
  };

  const handleCreateAllPayments = async () => {
    if (!bulkAmount) {
      toast({
        title: "Hiba",
        description: "Kérjük, adja meg az összeget",
        variant: "destructive",
      });
      return;
    }

    try {
      setBulkCreating(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nincs bejelentkezve");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, company_name")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profil nem található");

      const amountToUse = parseFloat(bulkAmount);

      const paymentsToCreate = members.map(member => ({
        user_id: member.id,
        hunter_society_id: profile.id,
        season_year: currentSeasonYear,
        period: bulkPeriod,
        amount: amountToUse,
      }));

      const { error } = await supabase
        .from("membership_payments")
        .insert(paymentsToCreate);

      if (error) throw error;

      // Send notifications to all members
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        for (const member of members) {
          if (member.contact_email) {
            try {
              await supabase.functions.invoke("send-membership-fee-notification", {
                body: {
                  user_email: member.contact_email,
                  user_name: member.contact_name || "Tag",
                  period: bulkPeriod,
                  amount: amountToUse,
                  season_year: currentSeasonYear,
                  hunter_society_name: profile.company_name || "Vadásztársaság",
                },
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
              });
            } catch (notifError) {
              console.error(`Értesítés küldési hiba ${member.contact_email}:`, notifError);
            }
          }
        }
      }

      toast({
        title: "Sikeres létrehozás",
        description: `${members.length} tagdíj bejegyzés létrehozva és értesítések elküldve.`,
      });

      setBulkDialogOpen(false);
      setBulkAmount("");
      fetchPayments(selectedSeasonYear);
      fetchAvailableSeasons();
      fetchAllPayments();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBulkCreating(false);
    }
  };

  const handleMarkAsPaid = async (paymentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nincs bejelentkezve");

      const { error } = await supabase
        .from("membership_payments")
        .update({
          paid: true,
          paid_at: new Date().toISOString(),
          paid_by: user.id,
        })
        .eq("id", paymentId);

      if (error) throw error;

      toast({
        title: "Sikeres frissítés",
        description: "A tagdíj fizetettként lett megjelölve.",
      });

      fetchPayments(selectedSeasonYear);
      fetchAvailableSeasons();
      fetchAllPayments();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleMarkAsUnpaid = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from("membership_payments")
        .update({
          paid: false,
          paid_at: null,
          paid_by: null,
        })
        .eq("id", paymentId);

      if (error) throw error;

      toast({
        title: "Sikeres frissítés",
        description: "A tagdíj fizetetlen státuszra állítva.",
      });

      fetchPayments(selectedSeasonYear);
      fetchAvailableSeasons();
      fetchAllPayments();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case "first_half":
        return "Első félév";
      case "second_half":
        return "Második félév";
      case "full_year":
        return "Egész év";
      default:
        return period;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Betöltés...</p>
      </div>
    );
  }

  const stats = {
    total: payments.length,
    paid: payments.filter(p => p.paid).length,
    unpaid: payments.filter(p => !p.paid).length,
    totalAmount: payments.reduce((sum, p) => sum + (p.paid ? p.amount : 0), 0),
    totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        isAdmin={isAdmin}
        isEditor={isEditor}
        onLogout={handleLogout}
      />
      
      <div className="container mx-auto py-6 px-4">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold text-forest-deep flex items-center gap-2">
              <DollarSign className="h-8 w-8" />
              Tagdíjak kezelése
            </h2>
            <p className="text-muted-foreground">
              Tagdíjak nyilvántartása és kezelése
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Label htmlFor="season-select" className="text-sm font-medium">Idény:</Label>
            <Select 
              value={selectedSeasonYear.toString()} 
              onValueChange={(value) => setSelectedSeasonYear(parseInt(value))}
            >
              <SelectTrigger id="season-select" className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableSeasons.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}/{year + 1} {year === currentSeasonYear && "(aktuális)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Összes bejegyzés</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Fizetve</CardDescription>
              <CardTitle className="text-3xl text-green-600">{stats.paid}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Fizetetlen</CardDescription>
              <CardTitle className="text-3xl text-red-600">{stats.unpaid}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Befizetett összeg</CardDescription>
              <CardTitle className="text-3xl">{stats.totalAmount.toLocaleString()} Ft</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Összes bevétel</CardDescription>
              <CardTitle className="text-3xl text-primary">{stats.totalRevenue.toLocaleString()} Ft</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Add Payment Buttons */}
        <div className="mb-4 flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Új tagdíj bejegyzés
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Új tagdíj bejegyzés létrehozása</DialogTitle>
                <DialogDescription>
                  Válassza ki a tagot és adja meg a tagdíj adatait.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tag</Label>
                  <Select value={selectedMember} onValueChange={setSelectedMember}>
                    <SelectTrigger>
                      <SelectValue placeholder="Válasszon tagot" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.contact_name || member.contact_email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Időszak</Label>
                  <Select value={selectedPeriod} onValueChange={(val: any) => {
                    setSelectedPeriod(val);
                    // Auto-fill amount based on settings
                    if (feeSettings) {
                      if (val === "first_half") setAmount(feeSettings.first_half_amount.toString());
                      else if (val === "second_half") setAmount(feeSettings.second_half_amount.toString());
                      else if (val === "full_year") setAmount(feeSettings.full_year_amount.toString());
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first_half">Első félév (márc. 1 - aug. 31)</SelectItem>
                      <SelectItem value="second_half">Második félév (szept. 1 - feb. utolsó nap)</SelectItem>
                      <SelectItem value="full_year">Egész év</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Összeg (Ft)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Megjegyzés</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Opcionális megjegyzés"
                    rows={2}
                  />
                </div>

                <Button onClick={handleCreatePayment} className="w-full">
                  Létrehozás
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Kiküldés minden tagnak
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tagdíj kiküldése minden tagnak</DialogTitle>
                <DialogDescription>
                  A rendszer automatikusan létrehoz egy-egy tagdíj bejegyzést minden tag számára a beállított tagdíj összegekkel, és értesítést küld nekik.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Időszak</Label>
                  <Select value={bulkPeriod} onValueChange={(val: any) => {
                    setBulkPeriod(val);
                    // Auto-fill amount based on settings
                    if (feeSettings) {
                      if (val === "first_half") setBulkAmount(feeSettings.first_half_amount.toString());
                      else if (val === "second_half") setBulkAmount(feeSettings.second_half_amount.toString());
                      else if (val === "full_year") setBulkAmount(feeSettings.full_year_amount.toString());
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first_half">
                        Első félév (márc. 1 - aug. 31)
                      </SelectItem>
                      <SelectItem value="second_half">
                        Második félév (szept. 1 - feb. utolsó nap)
                      </SelectItem>
                      <SelectItem value="full_year">
                        Egész év
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Összeg (Ft)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={bulkAmount}
                    onChange={(e) => setBulkAmount(e.target.value)}
                    placeholder="0"
                  />
                  {feeSettings && (
                    <p className="text-xs text-muted-foreground">
                      Beállított összegek: 
                      Első félév: {feeSettings.first_half_amount.toLocaleString()} Ft, 
                      Második félév: {feeSettings.second_half_amount.toLocaleString()} Ft, 
                      Egész év: {feeSettings.full_year_amount.toLocaleString()} Ft
                    </p>
                  )}
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-1">
                  <p className="text-sm font-medium">Érintett tagok: {members.length}</p>
                  <p className="text-sm text-muted-foreground">
                    Email címmel rendelkező tagok értesítést kapnak a tagdíjról.
                  </p>
                </div>

                <Button 
                  onClick={handleCreateAllPayments} 
                  className="w-full"
                  disabled={bulkCreating}
                >
                  {bulkCreating ? "Létrehozás és értesítések küldése..." : "Kiküldés mindenkinek"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                Archívum
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tagdíj archívum</DialogTitle>
                <DialogDescription>
                  Minden idény tagdíj bejegyzései
                </DialogDescription>
              </DialogHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Idény</TableHead>
                    <TableHead>Tag</TableHead>
                    <TableHead>Időszak</TableHead>
                    <TableHead>Összeg</TableHead>
                    <TableHead>Státusz</TableHead>
                    <TableHead>Fizetés dátuma</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nincs megjeleníthető adat
                      </TableCell>
                    </TableRow>
                  ) : (
                    allPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {payment.season_year}/{payment.season_year + 1}
                        </TableCell>
                        <TableCell>
                          {payment.profiles?.contact_name || payment.profiles?.contact_email || "Ismeretlen"}
                        </TableCell>
                        <TableCell>{getPeriodLabel(payment.period)}</TableCell>
                        <TableCell>{payment.amount.toLocaleString()} Ft</TableCell>
                        <TableCell>
                          {payment.paid ? (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Fizetve
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Fizetetlen
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {payment.paid_at
                            ? format(new Date(payment.paid_at), "yyyy. MM. dd.", { locale: hu })
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </DialogContent>
          </Dialog>
         </div>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Tagdíjak listája
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag</TableHead>
                  <TableHead>Időszak</TableHead>
                  <TableHead>Összeg</TableHead>
                  <TableHead>Státusz</TableHead>
                  <TableHead>Fizetés dátuma</TableHead>
                  <TableHead>Megjegyzés</TableHead>
                  <TableHead>Műveletek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Még nincs tagdíj bejegyzés
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {payment.profiles?.contact_name || payment.profiles?.contact_email || "N/A"}
                      </TableCell>
                      <TableCell>{getPeriodLabel(payment.period)}</TableCell>
                      <TableCell>{payment.amount.toLocaleString()} Ft</TableCell>
                      <TableCell>
                        {payment.paid ? (
                          <Badge className="bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Fizetve
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Fizetetlen
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {payment.paid_at
                          ? format(new Date(payment.paid_at), "yyyy. MM. dd.", { locale: hu })
                          : "-"}
                      </TableCell>
                      <TableCell>{payment.notes || "-"}</TableCell>
                      <TableCell>
                        {payment.paid ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkAsUnpaid(payment.id)}
                          >
                            Fizetetlen
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleMarkAsPaid(payment.id)}
                          >
                            Fizetve
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MembershipPayments;
