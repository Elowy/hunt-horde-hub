import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  status: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  approved_at: string | null;
  rejection_reason: string | null;
  profiles?: {
    company_name: string;
  };
}

interface BalanceTransactionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction;
}

const transactionTypeLabels: Record<string, string> = {
  deposit: "Befizetés",
  membership_fee: "Tagdíj levonás",
  animal_reservation: "Állatfoglalás levonás",
  animal_purchase: "Állatvásárlás levonás",
  refund: "Visszatérítés",
  admin_adjustment: "Adminisztrátori korrekció",
};

export function BalanceTransactionDetailsDialog({
  open,
  onOpenChange,
  transaction,
}: BalanceTransactionDetailsDialogProps) {
  const isPositive = transaction.amount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Tranzakció részletei</DialogTitle>
          <DialogDescription>
            Tranzakció azonosító: {transaction.id.slice(0, 8)}...
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Típus</p>
              <p className="font-medium">
                {transactionTypeLabels[transaction.transaction_type] || transaction.transaction_type}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Státusz</p>
              <Badge
                variant={
                  transaction.status === "approved"
                    ? "default"
                    : transaction.status === "rejected"
                    ? "destructive"
                    : "secondary"
                }
              >
                {transaction.status === "approved" && "Jóváhagyva"}
                {transaction.status === "rejected" && "Elutasítva"}
                {transaction.status === "pending" && "Várakozik"}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Összeg</p>
              <p className={`text-xl font-bold ${isPositive ? "text-green-600" : "text-destructive"}`}>
                {isPositive ? "+" : ""}{transaction.amount.toLocaleString("hu-HU")} Ft
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Egyenleg utána</p>
              <p className="text-xl font-bold">
                {transaction.balance_after.toLocaleString("hu-HU")} Ft
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-sm text-muted-foreground mb-1">Vadásztársaság</p>
            <p className="font-medium">{transaction.profiles?.company_name || "N/A"}</p>
          </div>

          {transaction.reference_number && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Hivatkozási szám</p>
              <p className="font-medium font-mono">{transaction.reference_number}</p>
            </div>
          )}

          <div>
            <p className="text-sm text-muted-foreground mb-1">Létrehozva</p>
            <p className="font-medium">
              {format(new Date(transaction.created_at), "PPP p", { locale: hu })}
            </p>
          </div>

          {transaction.approved_at && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Jóváhagyva</p>
              <p className="font-medium">
                {format(new Date(transaction.approved_at), "PPP p", { locale: hu })}
              </p>
            </div>
          )}

          {transaction.notes && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Megjegyzés</p>
              <p className="text-sm">{transaction.notes}</p>
            </div>
          )}

          {transaction.status === "pending" && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Ez a tranzakció adminisztrátori jóváhagyásra vár. Az egyenlege csak a jóváhagyás után változik.
              </AlertDescription>
            </Alert>
          )}

          {transaction.status === "rejected" && transaction.rejection_reason && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-1">Elutasítás oka:</p>
                <p>{transaction.rejection_reason}</p>
              </AlertDescription>
            </Alert>
          )}

          {transaction.status === "approved" && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                Ez a tranzakció jóváhagyásra került és már szerepel az egyenlegében.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
