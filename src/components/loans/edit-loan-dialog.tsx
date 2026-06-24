"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateLoan } from "@/lib/actions/loans";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import type { InterestType } from "@/types/database";

const optionalPositiveNumber = z.preprocess(
  (val) =>
    val === "" || val === null || val === undefined || Number.isNaN(Number(val))
      ? null
      : Number(val),
  z.number().positive().nullable().optional()
);

const schema = z.object({
  loan_amount: z.number().min(0.01).optional(),
  loan_date: z.string().optional(),
  interest_rate: z.number().min(0),
  interest_type: z.enum(["daily_diminishing", "monthly_diminishing", "flat"]),
  monthly_installment: optionalPositiveNumber,
  duration_months: optionalPositiveNumber,
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function EditLoanDialog({
  loanId,
  defaults,
  hasPayments,
  compact = false,
}: {
  loanId: string;
  defaults: FormData;
  hasPayments: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: defaults,
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      await updateLoan(loanId, {
        loan_amount: data.loan_amount,
        loan_date: data.loan_date,
        interest_rate: data.interest_rate,
        interest_type: data.interest_type as InterestType,
        monthly_installment: data.monthly_installment,
        duration_months: data.duration_months,
        notes: data.notes,
      });
      toast.success("Loan updated");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update loan");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          compact ? (
            <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
          ) : (
            <Button variant="outline"><Pencil className="h-4 w-4 mr-2" />Edit Loan</Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader><DialogTitle>Edit Loan</DialogTitle></DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {!hasPayments && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Principal Amount</Label>
                <Input type="number" step="0.01" {...form.register("loan_amount", { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>Issue Date</Label>
                <Input type="date" {...form.register("loan_date")} />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>Annual Interest Rate (%)</Label>
            <Input type="number" step="0.01" {...form.register("interest_rate", { valueAsNumber: true })} />
          </div>
          <div className="space-y-2">
            <Label>Interest Mode</Label>
            <Select
              value={form.watch("interest_type")}
              onValueChange={(v) => v && form.setValue("interest_type", v as FormData["interest_type"])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily_diminishing">Daily Diminishing (principal-based)</SelectItem>
                <SelectItem value="monthly_diminishing">Monthly Diminishing</SelectItem>
                <SelectItem value="flat">Flat Interest</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Payments reduce principal first. Daily interest accrues on the remaining principal balance.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Monthly Installment (optional)</Label>
              <Input type="number" {...form.register("monthly_installment", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Duration months (optional)</Label>
              <Input type="number" {...form.register("duration_months", { valueAsNumber: true })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea {...form.register("notes")} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>Save Changes</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
