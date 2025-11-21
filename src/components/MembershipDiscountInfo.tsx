import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Check, X, Building2 } from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";

interface Payment {
  id: string;
  period: "first_half" | "second_half" | "full_year";
  amount: number;
  paid: boolean;
  paid_at: string | null;
  season_year: number;
  hunter_society_id: string;
}

interface PaymentsBySociety {
  society_id: string;
  society_name: string;
  payments: Payment[];
  total_paid: number;
  total_unpaid: number;
  discount_enabled: boolean;
}

export const MembershipDiscountInfo = () => {
  const [paymentsBySociety, setPaymentsBySociety] = useState<PaymentsBySociety[]>([]);
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

      // Get all hunter societies this user belongs to
      const { data: memberships } = await supabase
        .from("hunter_society_members")
        .select(`
          hunter_society_id,
          profiles!hunter_society_members_hunter_society_id_fkey (
            company_name,
            enable_membership_discount
          )
        `)
        .eq("hunter_id", user.id);

      if (!memberships || memberships.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch payments for each society
      const societyPayments: PaymentsBySociety[] = [];

      for (const membership of memberships) {
        const { data: payments } = await supabase
          .from("membership_payments")
          .select("*")
          .eq("user_id", user.id)
          .eq("hunter_society_id", membership.hunter_society_id)
          .eq("season_year", seasonYear)
          .order("created_at", { ascending: false });

        const totalPaid = payments?.filter(p => p.paid).reduce((sum, p) => sum + p.amount, 0) || 0;
        const totalUnpaid = payments?.filter(p => !p.paid).reduce((sum, p) => sum + p.amount, 0) || 0;

        societyPayments.push({
          society_id: membership.hunter_society_id,
          society_name: (membership.profiles as any)?.company_name || "Ismeretlen társaság",
          payments: payments || [],
          total_paid: totalPaid,
          total_unpaid: totalUnpaid,
          discount_enabled: (membership.profiles as any)?.enable_membership_discount || false,
        });
      }

      setPaymentsBySociety(societyPayments);
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

  if (paymentsBySociety.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Tagdíjak és kedvezmények
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Nincs tagdíj információ elérhető</p>
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
          Aktuális idény tagdíj információk és állatfoglalási kedvezmények társaságonként
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {paymentsBySociety.map((societyData, index) => (
          <div key={societyData.society_id}>
            {/* Society header */}
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold">{societyData.society_name}</h3>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Befizetett összeg</p>
                <p className="text-2xl font-bold text-green-600">
                  {societyData.total_paid.toLocaleString()} Ft
                </p>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Fizetetlen</p>
                <p className="text-2xl font-bold text-red-600">
                  {societyData.total_unpaid.toLocaleString()} Ft
                </p>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Elérhető kedvezmény</p>
                <p className="text-2xl font-bold text-primary">
                  {societyData.discount_enabled ? societyData.total_paid.toLocaleString() : 0} Ft
                </p>
                {!societyData.discount_enabled && societyData.total_paid > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    (Kedvezmény nem engedélyezett)
                  </p>
                )}
              </div>
            </div>

            {/* Discount info */}
            {societyData.discount_enabled && societyData.total_paid > 0 && (
              <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg mb-4">
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
            {societyData.payments.length > 0 && (
              <div>
                <h4 className="font-medium mb-3 text-sm">Tagdíj részletezés</h4>
                <div className="space-y-2">
                  {societyData.payments.map((payment) => (
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

            {societyData.payments.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                <p>Nincs tagdíj bejegyzés ennél a társaságnál</p>
              </div>
            )}

            {index < paymentsBySociety.length - 1 && <Separator className="mt-8" />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
