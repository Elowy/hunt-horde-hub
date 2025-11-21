import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";

interface Balance {
  society_name: string;
  current_balance: number;
  last_transaction_at: string | null;
}

interface UserBalanceCardProps {
  balances: Balance[];
  compact?: boolean;
}

export function UserBalanceCard({ balances, compact = false }: UserBalanceCardProps) {
  if (balances.length === 0) {
    return null;
  }

  const totalBalance = balances.reduce((sum, b) => sum + b.current_balance, 0);

  if (compact) {
    return (
      <Card className="border-primary/20">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Összesített egyenleg</span>
            </div>
            <Badge
              variant={totalBalance >= 0 ? "default" : "destructive"}
              className="text-base font-bold px-3"
            >
              {totalBalance.toLocaleString("hu-HU")} Ft
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {balances.map((balance, index) => (
        <Card key={index} className="border-primary/20">
          <CardContent className="pt-4 pb-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  {balance.society_name}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {balance.current_balance >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  )}
                  <span className="text-2xl font-bold">
                    {balance.current_balance.toLocaleString("hu-HU")} Ft
                  </span>
                </div>
              </div>
              
              {balance.last_transaction_at && (
                <p className="text-xs text-muted-foreground">
                  Utolsó tranzakció:{" "}
                  {format(new Date(balance.last_transaction_at), "PPP p", { locale: hu })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
