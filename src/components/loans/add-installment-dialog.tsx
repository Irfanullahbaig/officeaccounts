"use client";

import { useEffect, useState } from "react";
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
import { Landmark } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

const schema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than zero"),
  deposit_date: z.string().min(1, "Deposit date is required"),
  bank_reference: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function buildRemarks(data: Pick<FormData, "bank_reference" | "notes">) {
  const parts = ["Bank deposit installment"];
  if (data.bank_reference?.trim()) parts.push(`Ref: ${data.bank_reference.trim()}`);
  if (data.notes?.trim()) parts.push(data.notes.trim());
  return parts.join(" — ");
}

export function AddInstallmentDialog({
  loanId,
  monthlyInstallment,
  maxAmount,
  disabled,
  compact = false,
}: {
  loanId: string;
  monthlyInstallment?: number | null;
  maxAmount?: number;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      deposit_date: new Date().toISOString().split("T")[0],
      amount: monthlyInstallment ?? undefined,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        deposit_date: new Date().toISOString().split("T")[0],
        amount: monthlyInstallment ?? undefined,
        bank_reference: "",
        notes: "",
      });
    }
  }, [open, monthlyInstallment, form]);

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const result = await recordLoanPayment({
        loanId,
        amount: data.amount,
        paymentDate: data.deposit_date,
        remarks: buildRemarks(data),
        paymentSource: "bank_transfer",
      });
      toast.success(result.closed ? "Installment recorded — loan closed!" : "Installment recorded");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record installment");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          compact ? (
            <Button variant="outline" size="icon" disabled={disabled} title="Add installment">
              <Landmark className="h-4 w-4" />
            </Button>
          ) : (
            <Button disabled={disabled}>
              <Landmark className="h-4 w-4 mr-2" />
              Add Installment
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Bank Installment</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Use this when an employee deposits loan repayment directly to your bank account.
            Daily interest is calculated up to the deposit date. The deposit reduces the original loan first; any remainder pays accrued interest.
          </p>
        </DialogHeader>
        {maxAmount != null && (
          <p className="text-sm font-medium">
            Current payoff amount: {formatCurrency(maxAmount)}
          </p>
        )}
        {monthlyInstallment != null && monthlyInstallment > 0 && (
          <p className="text-sm text-muted-foreground">
            Expected installment: {formatCurrency(monthlyInstallment)}
          </p>
        )}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Deposit Amount (PKR)</Label>
            <Input type="number" step="0.01" {...form.register("amount", { valueAsNumber: true })} />
            {form.formState.errors.amount && (
              <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Deposit Date</Label>
            <Input type="date" {...form.register("deposit_date")} />
            <p className="text-xs text-muted-foreground">Date the amount was received in the bank account</p>
          </div>
          <div className="space-y-2">
            <Label>Bank Reference <span className="text-muted-foreground font-normal">— Optional</span></Label>
            <Input placeholder="e.g. TRX-123456 or transfer ID" {...form.register("bank_reference")} />
          </div>
          <div className="space-y-2">
            <Label>Notes <span className="text-muted-foreground font-normal">— Optional</span></Label>
            <Textarea placeholder="e.g. Monthly installment via HBL" {...form.register("notes")} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Recording..." : "Record Installment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
