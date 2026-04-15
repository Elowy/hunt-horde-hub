import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BalanceTransactionsTable } from "@/components/BalanceTransactionsTable";

const BalanceTransactions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [societies, setSocieties] = useState<Array<{ id: string; company_name: string }>>([]);
  const [totals, setTotals] = useState({ income: 0, expense: 0, balance: 0 });

  useEffect(() => {
    checkAccessAndFetch();
  }, []);

  const checkAccessAndFetch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const roleList = roles?.map(r => r.role) || [];
      const hasAdmin = roleList.includes("admin");
      const hasEditor = roleList.includes("editor");
      setIsAdmin(hasAdmin);
      setIsEditor(hasEditor);

      if (!hasAdmin && !hasEditor) {
        toast({ title: "Hozzáférés megtagadva", variant: "destructive" });
        navigate("/dashboard");
        return;
      }

      // Fetch transactions for this user's society
      const { data: txns, error } = await supabase
        .from("user_balance_transactions")
        .select("*, profiles:hunter_society_id(company_name)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTransactions(txns || []);

      // Calculate totals
      const income = (txns || []).filter(t => t.amount > 0 && t.status === "approved").reduce((s, t) => s + Number(t.amount), 0);
      const expense = (txns || []).filter(t => t.amount < 0 && t.status === "approved").reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
      setTotals({ income, expense, balance: income - expense });

      // Get unique societies
      const uniqueSocieties = new Map<string, string>();
      (txns || []).forEach(t => {
        if (t.hunter_society_id && t.profiles?.company_name) {
          uniqueSocieties.set(t.hunter_society_id, t.profiles.company_name);
        }
      });
      setSocieties(Array.from(uniqueSocieties, ([id, company_name]) => ({ id, company_name })));

    } catch (error: any) {
      console.error("Error:", error);
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Betöltés...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader isAdmin={isAdmin} isEditor={isEditor} onLogout={handleLogout} />
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground">Egyenleg kezelés</h2>
          <p className="text-muted-foreground">Bevételek és tranzakciók áttekintése</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Összes bevétel</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                +{totals.income.toLocaleString("hu-HU")} Ft
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Összes kiadás</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                -{totals.expense.toLocaleString("hu-HU")} Ft
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Egyenleg</CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totals.balance.toLocaleString("hu-HU")} Ft
              </div>
            </CardContent>
          </Card>
        </div>

        <BalanceTransactionsTable transactions={transactions} societies={societies} />
      </div>
    </div>
  );
};

export default BalanceTransactions;
