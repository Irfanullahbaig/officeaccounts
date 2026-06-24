"use client";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, cnStatusColor } from "@/lib/utils/format";
import { reverseLoanPayment } from "@/lib/actions/loans";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import type { LoanTransactionType } from "@prisma/client";

const TYPE_LABELS: Record<LoanTransactionType, string> = {
  loan_created: "Loan Created",
  interest_accrued: "Interest Accrued",
  payment: "Payment",
  payment_reversal: "Payment Reversal",
  adjustment: "Adjustment",
  loan_closed: "Loan Closed",
};

interface LedgerEntry {
  id: string;
  transactionDate: Date;
  transactionType: LoanTransactionType;
  amount: number;
  interestPortion: number;
  principalPortion: number;
  remainingPrincipal: number;
  accruedInterestAfter: number;
  remarks: string | null;
  isReversed: boolean;
}

export function LoanLedgerTable({
  entries,
  isAdmin,
}: {
  entries: LedgerEntry[];
  isAdmin: boolean;
}) {
  const router = useRouter();

  async function handleReverse(id: string) {
    if (!confirm("Reverse this payment? Balances will be restored.")) return;
    try {
      await reverseLoanPayment(id);
      toast.success("Payment reversed");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reverse");
    }
  }

  if (!entries.length) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No ledger entries yet.</p>;
  }

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Interest</TableHead>
            <TableHead>Principal</TableHead>
            <TableHead>Balance</TableHead>
            <TableHead>Accrued Int.</TableHead>
            <TableHead>Remarks</TableHead>
            {isAdmin && <TableHead></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((e) => (
            <TableRow key={e.id} className={e.isReversed ? "opacity-50" : ""}>
              <TableCell>{formatDate(e.transactionDate.toISOString())}</TableCell>
              <TableCell>
                <Badge variant="secondary" className={cnStatusColor(e.transactionType === "payment" ? "paid" : "pending")}>
                  {TYPE_LABELS[e.transactionType]}
                </Badge>
                {e.isReversed && <span className="text-xs text-muted-foreground ml-1">(reversed)</span>}
              </TableCell>
              <TableCell>{e.amount !== 0 ? formatCurrency(e.amount) : "—"}</TableCell>
              <TableCell>{e.interestPortion !== 0 ? formatCurrency(e.interestPortion) : "—"}</TableCell>
              <TableCell>{e.principalPortion !== 0 ? formatCurrency(e.principalPortion) : "—"}</TableCell>
              <TableCell className="font-medium">{formatCurrency(e.remainingPrincipal)}</TableCell>
              <TableCell>{formatCurrency(e.accruedInterestAfter)}</TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                {e.remarks ?? "—"}
              </TableCell>
              {isAdmin && (
                <TableCell>
                  {e.transactionType === "payment" && !e.isReversed && (
                    <Button variant="ghost" size="icon" onClick={() => handleReverse(e.id)} title="Reverse payment">
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
