"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createLoanWithLedger } from "@/lib/actions/loans";
import { getActiveEmployees } from "@/lib/actions/finance";
import { toast } from "sonner";

const optionalPositiveNumber = z.preprocess(
  (val) =>
    val === "" || val === null || val === undefined || Number.isNaN(Number(val))
      ? undefined
      : Number(val),
  z.number().positive().optional()
);

const schema = z.object({
  employee_id: z.string().min(1),
  loan_amount: z.number().min(1),
  interest_rate: z.number().min(0),
  interest_type: z.enum(["daily_diminishing", "monthly_diminishing", "flat"]),
  loan_date: z.string().min(1),
  duration_months: optionalPositiveNumber,
  monthly_installment: optionalPositiveNumber,
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function AddLoanDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<{ id: string; fullName: string }[]>([]);
  const router = useRouter();

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: {
      interest_type: "daily_diminishing",
      loan_date: new Date().toISOString().split("T")[0],
      interest_rate: 15,
    },
  });

  useEffect(() => {
    if (open) getActiveEmployees().then(setEmployees);
  }, [open]);

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const result = await createLoanWithLedger(data);
      toast.success("Loan created successfully");
      setOpen(false);
      form.reset();
      router.push(`/loans/${result.loanId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create loan");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button><Plus className="h-4 w-4 mr-2" />New Loan</Button>} />
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Employee Loan</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Duration and monthly installment are optional — employees often repay when a project pays out.
          </p>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select
              value={form.watch("employee_id")}
              onValueChange={(v) => v && form.setValue("employee_id", v)}
            >
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Loan Amount</Label>
              <Input type="number" {...form.register("loan_amount", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Interest Rate (% annual)</Label>
              <Input type="number" step="0.01" {...form.register("interest_rate", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Interest Type</Label>
              <Select
                value={form.watch("interest_type")}
                onValueChange={(v) => v && form.setValue("interest_type", v as FormData["interest_type"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily_diminishing">Daily Diminishing</SelectItem>
                  <SelectItem value="monthly_diminishing">Monthly Diminishing</SelectItem>
                  <SelectItem value="flat">Flat Interest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Loan Date</Label>
              <Input type="date" {...form.register("loan_date")} />
            </div>
            <div className="space-y-2">
              <Label>Duration (months) <span className="text-muted-foreground font-normal">— Optional</span></Label>
              <Input
                type="number"
                placeholder="Leave blank if unknown"
                {...form.register("duration_months", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>Monthly Installment <span className="text-muted-foreground font-normal">— Optional</span></Label>
              <Input
                type="number"
                placeholder="Set when project pays"
                {...form.register("monthly_installment", { valueAsNumber: true })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea {...form.register("notes")} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Loan"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
