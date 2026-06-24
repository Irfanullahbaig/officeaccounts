"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { recordLoanPayment } from "@/lib/actions/loans";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

const schema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than zero"),
  payment_date: z.string().min(1),
  remarks: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function RecordPaymentDialog({
  loanId,
  maxAmount,
  disabled,
}: {
  loanId: string;
  maxAmount?: number;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      payment_date: new Date().toISOString().split("T")[0],
    },
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const result = await recordLoanPayment({
        loanId,
        amount: data.amount,
        paymentDate: data.payment_date,
        remarks: data.remarks,
      });
      toast.success(result.closed ? "Payment recorded — loan closed!" : "Payment recorded");
      setOpen(false);
      form.reset({ payment_date: new Date().toISOString().split("T")[0] });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record payment");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button disabled={disabled}>
            <Wallet className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Loan Payment</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Principal is reduced first. Daily interest accrues on the remaining balance until payment date.
          </p>
        </DialogHeader>
        {maxAmount != null && (
          <p className="text-sm font-medium">
            Current payoff amount: {formatCurrency(maxAmount)}
          </p>
        )}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Payment Amount (PKR)</Label>
            <Input type="number" step="0.01" {...form.register("amount", { valueAsNumber: true })} />
          </div>
          <div className="space-y-2">
            <Label>Payment Date</Label>
            <Input type="date" {...form.register("payment_date")} />
          </div>
          <div className="space-y-2">
            <Label>Remarks</Label>
            <Textarea placeholder="e.g. Project payout received" {...form.register("remarks")} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Processing..." : "Apply Payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
