"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { closeLoanPayoff } from "@/lib/actions/loans";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

export function CloseLoanDialog({
  loanId,
  payoffAmount,
  disabled,
}: {
  loanId: string;
  payoffAmount: number;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClose() {
    setLoading(true);
    try {
      await closeLoanPayoff(loanId);
      toast.success("Loan closed successfully");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to close loan");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" disabled={disabled}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Full Payoff
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close Loan — Full Payoff</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will accrue interest through today and settle the full remaining balance.
          </p>
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Payoff Amount</p>
            <p className="text-2xl font-bold">{formatCurrency(payoffAmount)}</p>
          </div>
          <Button onClick={handleClose} className="w-full" disabled={loading}>
            {loading ? "Closing..." : "Confirm Full Payoff"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
