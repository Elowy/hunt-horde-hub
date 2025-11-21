import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { Eye, TrendingUp, TrendingDown, Receipt, Package, RefreshCw, Settings } from "lucide-react";
import { BalanceTransactionDetailsDialog } from "./BalanceTransactionDetailsDialog";

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
  hunter_society_id: string;
  profiles?: {
    company_name: string;
  };
}

interface BalanceTransactionsTableProps {
  transactions: Transaction[];
  societies: Array<{ id: string; company_name: string }>;
}

const transactionTypeLabels: Record<string, string> = {
  deposit: "Befizetés",
  membership_fee: "Tagdíj",
  animal_reservation: "Állatfoglalás",
  animal_purchase: "Állatvásárlás",
  refund: "Visszatérítés",
  admin_adjustment: "Korrekció",
};

const transactionTypeIcons: Record<string, any> = {
  deposit: TrendingUp,
  membership_fee: Receipt,
  animal_reservation: Package,
  animal_purchase: Package,
  refund: RefreshCw,
  admin_adjustment: Settings,
};

export function BalanceTransactionsTable({ transactions, societies }: BalanceTransactionsTableProps) {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [societyFilter, setSocietyFilter] = useState<string>("all");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const filteredTransactions = transactions.filter((t) => {
    if (typeFilter !== "all" && t.transaction_type !== typeFilter) return false;
    if (societyFilter !== "all" && t.hunter_society_id !== societyFilter) return false;
    return true;
  });

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDetailsOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Típus szűrése" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Összes típus</SelectItem>
            <SelectItem value="deposit">Befizetés</SelectItem>
            <SelectItem value="membership_fee">Tagdíj</SelectItem>
            <SelectItem value="animal_reservation">Állatfoglalás</SelectItem>
            <SelectItem value="animal_purchase">Állatvásárlás</SelectItem>
            <SelectItem value="refund">Visszatérítés</SelectItem>
            <SelectItem value="admin_adjustment">Korrekció</SelectItem>
          </SelectContent>
        </Select>

        <Select value={societyFilter} onValueChange={setSocietyFilter}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Társaság szűrése" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Összes társaság</SelectItem>
            {societies.map((society) => (
              <SelectItem key={society.id} value={society.id}>
                {society.company_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dátum</TableHead>
              <TableHead>Típus</TableHead>
              <TableHead>Társaság</TableHead>
              <TableHead className="text-right">Összeg</TableHead>
              <TableHead className="text-right">Egyenleg</TableHead>
              <TableHead>Státusz</TableHead>
              <TableHead className="text-right">Részletek</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nincs megjeleníthető tranzakció
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((transaction) => {
                const Icon = transactionTypeIcons[transaction.transaction_type] || TrendingDown;
                const isPositive = transaction.amount > 0;

                return (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {format(new Date(transaction.created_at), "PPP", { locale: hu })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {transactionTypeLabels[transaction.transaction_type] || transaction.transaction_type}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {transaction.profiles?.company_name || "N/A"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={isPositive ? "text-green-600 font-medium" : "text-destructive font-medium"}>
                        {isPositive ? "+" : ""}{transaction.amount.toLocaleString("hu-HU")} Ft
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {transaction.balance_after.toLocaleString("hu-HU")} Ft
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(transaction)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {selectedTransaction && (
        <BalanceTransactionDetailsDialog
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          transaction={selectedTransaction}
        />
      )}
    </div>
  );
}
