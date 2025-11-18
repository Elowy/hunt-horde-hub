import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Check, X } from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";

interface Payment {
  id: string;
  period: "first_half" | "second_half" | "full_year";
  amount: number;
  paid: boolean;
  paid_at: string | null;
  season_year: number;
}

export const MembershipDiscountInfo = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current season
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();
      const seasonYear = currentMonth <= 2 ? currentYear - 1 : currentYear;

      // Fetch payments for current season
      const { data: paymentsData } = await supabase
        .from("membership_payments")
        .select("*")
        .eq("user_id", user.id)
        .eq("season_year", seasonYear)
        .order("created_at", { ascending: false });

      if (paymentsData) {
        setPayments(paymentsData);
      }

      // Check if discount is enabled for hunter society
      const { data: profile } = await supabase
        .from("profiles")
        .select("hunter_society_id")
        .eq("id", user.id)
        .single();

      if (profile?.hunter_society_id) {
        const { data: societyProfile } = await supabase
          .from("profiles")
          .select("enable_membership_discount")
          .eq("id", profile.hunter_society_id)
          .single();

        setDiscountEnabled(societyProfile?.enable_membership_discount || false);
      }
    } catch (error) {
      console.error("Error fetching membership data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case "first_half":
        return "Első félév";
      case "second_half":
        return "Második félév";
      case "full_year":
        return "Teljes év";
      default:
        return period;
    }
  };

  const totalPaid = payments
    .filter(p => p.paid)
    .reduce((sum, p) => sum + p.amount, 0);

  const totalUnpaid = payments
    .filter(p => !p.paid)
    .reduce((sum, p) => sum + p.amount, 0);

  const availableDiscount = discountEnabled ? totalPaid : 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tagdíjak és kedvezmények</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Betöltés...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Tagdíjak és kedvezmények
        </CardTitle>
        <CardDescription>
          Aktuális idény tagdíj információk és állatfoglalási kedvezmények
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Befizetett összeg</p>
            <p className="text-2xl font-bold text-green-600">{totalPaid.toLocaleString()} Ft</p>
          </div>
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Fizetetlen</p>
            <p className="text-2xl font-bold text-red-600">{totalUnpaid.toLocaleString()} Ft</p>
          </div>
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Elérhető kedvezmény</p>
            <p className="text-2xl font-bold text-primary">
              {availableDiscount.toLocaleString()} Ft
            </p>
            {!discountEnabled && totalPaid > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                (Kedvezmény jelenleg nem engedélyezett)
              </p>
            )}
          </div>
        </div>

        {/* Discount info */}
        {discountEnabled && totalPaid > 0 && (
          <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
            <p className="font-medium text-primary mb-2">Hogyan működik a kedvezmény?</p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li>A befizetett tagdíj mértékéig foglalhat állatokat kedvezményes áron</li>
              <li>Az állatokat 2. osztályú áron, ÁFA nélkül foglalhatja le</li>
              <li>A kedvezmény automatikusan érvényesül az állatfoglaláskor</li>
              <li>A kedvezmény az aktuális idényben felhasználható</li>
            </ul>
          </div>
        )}

        {/* Payment list */}
        {payments.length > 0 && (
          <div>
            <h3 className="font-medium mb-3">Tagdíj részletezés</h3>
            <div className="space-y-2">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{getPeriodLabel(payment.period)}</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.season_year}/{payment.season_year + 1} idény
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-medium">{payment.amount.toLocaleString()} Ft</p>
                    {payment.paid ? (
                      <Badge variant="default" className="bg-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        Fizetve
                        {payment.paid_at && (
                          <span className="ml-1 text-xs">
                            ({format(new Date(payment.paid_at), "MM. dd.", { locale: hu })})
                          </span>
                        )}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <X className="h-3 w-3 mr-1" />
                        Fizetetlen
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {payments.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nincs tagdíj bejegyzés az aktuális idényre</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
