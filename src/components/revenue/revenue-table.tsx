"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createIncomeEntry, getActiveEmployees } from "@/lib/actions/finance";
import { toast } from "sonner";
import { IncomeLoanPaymentFields } from "@/components/revenue/income-loan-payment-fields";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { IncomeEntry } from "@/types/database";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { EditIncomeDialog } from "@/components/revenue/edit-income-dialog";

const schema = z.object({
  employee_id: z.string().min(1),
  project_name: z.string().min(1),
  client_name: z.string().min(1),
  project_type: z.string().min(1),
  project_value: z.number().min(0.01),
  payment_received_date: z.string().min(1),
  currency: z.enum(["PKR", "USD", "EUR", "GBP", "AED"]),
  savings_contribution: z.number().min(0),
  loan_payment: z.number().min(0),
  target_loan_id: z.string().optional(),
  lead_employee_id: z.string().optional(),
  lead_percent: z.number().min(0),
  co_lead_employee_id: z.string().optional(),
  co_lead_percent: z.number().min(0),
  notes: z.string().optional(),
});

type FormData = z.input<typeof schema>;

export function AddRevenueDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Array<{ id: string; fullName: string }>>([]);
  const router = useRouter();
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      payment_received_date: new Date().toISOString().split("T")[0],
      currency: "PKR",
      savings_contribution: 0,
      loan_payment: 0,
      target_loan_id: undefined,
      lead_percent: 0,
      co_lead_percent: 0,
    },
  });

  useEffect(() => {
    if (!open) return;
    getActiveEmployees()
      .then((rows) => setEmployees(rows.map((row) => ({ id: row.id, fullName: row.fullName }))))
      .catch(() => toast.error("Failed to load employee list"));
  }, [open]);

  const employeeId = form.watch("employee_id");
  const targetLoanId = form.watch("target_loan_id");
  const projectValue = form.watch("project_value") || 0;
  const savings = form.watch("savings_contribution") || 0;
  const loanPayment = form.watch("loan_payment") || 0;
  const leadPercent = form.watch("lead_percent") || 0;
  const coLeadPercent = form.watch("co_lead_percent") || 0;

  const companyShare = useMemo(() => round2(projectValue * 0.3), [projectValue]);
  const employeeShare = useMemo(() => round2(projectValue * 0.7), [projectValue]);
  const leadCommissionAmount = useMemo(() => round2(projectValue * (leadPercent / 100)), [projectValue, leadPercent]);
  const coLeadCommissionAmount = useMemo(() => round2(projectValue * (coLeadPercent / 100)), [projectValue, coLeadPercent]);
  const netPayout = useMemo(
    () => round2(employeeShare - savings - loanPayment - leadCommissionAmount - coLeadCommissionAmount),
    [employeeShare, savings, loanPayment, leadCommissionAmount, coLeadCommissionAmount]
  );

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      await createIncomeEntry({
        employee_id: data.employee_id,
        project_name: data.project_name,
        client_name: data.client_name,
        project_type: data.project_type,
        project_value: data.project_value,
        payment_received_date: data.payment_received_date,
        currency: data.currency,
        savings_contribution: data.savings_contribution,
        loan_payment: data.loan_payment,
        target_loan_id: data.target_loan_id,
        notes: data.notes,
        lead_assignments: data.lead_employee_id && data.lead_percent > 0 ? [{ employee_id: data.lead_employee_id, percent: data.lead_percent }] : [],
        co_lead_assignments: data.co_lead_employee_id && data.co_lead_percent > 0 ? [{ employee_id: data.co_lead_employee_id, percent: data.co_lead_percent }] : [],
      });
      toast.success("Income entry added");
      setOpen(false);
      form.reset();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add revenue");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button><Plus className="h-4 w-4 mr-2" />Add Income</Button>} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>Add Income Entry</DialogTitle></DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Employee Name</Label>
              <Select value={form.watch("employee_id")} onValueChange={(v) => v && form.setValue("employee_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((row) => (
                    <SelectItem key={row.id} value={row.id}>{row.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Project Name</Label><Input {...form.register("project_name")} /></div>
            <div className="space-y-2"><Label>Client Name</Label><Input {...form.register("client_name")} /></div>
            <div className="space-y-2"><Label>Project Type</Label><Input {...form.register("project_type")} /></div>
            <div className="space-y-2"><Label>Project Value</Label><Input type="number" {...form.register("project_value", { valueAsNumber: true })} /></div>
            <div className="space-y-2"><Label>Payment Received Date</Label><Input type="date" {...form.register("payment_received_date")} /></div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={form.watch("currency")} onValueChange={(v) => v && form.setValue("currency", v as FormData["currency"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PKR">PKR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="AED">AED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Savings Contribution</Label><Input type="number" {...form.register("savings_contribution", { valueAsNumber: true })} /></div>
            <IncomeLoanPaymentFields
              employeeId={employeeId}
              loanPayment={loanPayment}
              targetLoanId={targetLoanId}
              register={form.register}
              setValue={form.setValue}
              watch={form.watch}
            />
            <div className="space-y-2">
              <Label>Lead Assigned</Label>
              <Select
                value={form.watch("lead_employee_id")}
                onValueChange={(v) => form.setValue("lead_employee_id", v || undefined)}
              >
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {employees.map((row) => (
                    <SelectItem key={row.id} value={row.id}>{row.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Lead Commission %</Label><Input type="number" {...form.register("lead_percent", { valueAsNumber: true })} /></div>
            <div className="space-y-2">
              <Label>Co-Lead Assigned</Label>
              <Select
                value={form.watch("co_lead_employee_id")}
                onValueChange={(v) => form.setValue("co_lead_employee_id", v || undefined)}
              >
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {employees.map((row) => (
                    <SelectItem key={row.id} value={row.id}>{row.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Co-Lead Commission %</Label><Input type="number" {...form.register("co_lead_percent", { valueAsNumber: true })} /></div>
          </div>
          <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
            <p><span className="text-muted-foreground">Company Share (30%):</span> <span className="font-medium">{formatCurrency(companyShare)}</span></p>
            <p><span className="text-muted-foreground">Employee Share (70%):</span> <span className="font-medium">{formatCurrency(employeeShare)}</span></p>
            <p><span className="text-muted-foreground">Lead Commission:</span> <span className="font-medium">{formatCurrency(leadCommissionAmount)}</span></p>
            <p><span className="text-muted-foreground">Co-Lead Commission:</span> <span className="font-medium">{formatCurrency(coLeadCommissionAmount)}</span></p>
            <p><span className="text-muted-foreground">Net Available Balance:</span> <span className="font-semibold">{formatCurrency(netPayout)}</span></p>
          </div>
          <div className="space-y-2"><Label>Notes</Label><Textarea {...form.register("notes")} /></div>
          <Button type="submit" className="w-full" disabled={loading}>Save</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RevenueTable({
  revenues,
  readOnly = false,
}: {
  revenues: IncomeEntry[];
  readOnly?: boolean;
}) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Project Value</TableHead>
            <TableHead>Company Share</TableHead>
            <TableHead>Employee Share</TableHead>
            <TableHead>Savings</TableHead>
            <TableHead>Loan Payment</TableHead>
            <TableHead>Net Payout</TableHead>
            <TableHead>Date</TableHead>
            {!readOnly && <TableHead className="w-[60px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {revenues.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.employee?.full_name ?? "—"}</TableCell>
              <TableCell className="font-medium">{r.client_name}</TableCell>
              <TableCell>{r.project_name ?? "—"}</TableCell>
              <TableCell>{formatCurrency(Number(r.project_value))}</TableCell>
              <TableCell>{formatCurrency(Number(r.company_share))}</TableCell>
              <TableCell>{formatCurrency(Number(r.freelancer_share))}</TableCell>
              <TableCell>{formatCurrency(Number(r.savings_contribution))}</TableCell>
              <TableCell>{formatCurrency(Number(r.loan_payment))}</TableCell>
              <TableCell className="font-semibold">{formatCurrency(Number(r.net_payout))}</TableCell>
              <TableCell>{formatDate(r.payment_received_date)}</TableCell>
              {!readOnly && (
                <TableCell>
                  <EditIncomeDialog income={r} />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
