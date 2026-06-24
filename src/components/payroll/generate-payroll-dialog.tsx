"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { getActiveEmployees } from "@/lib/actions/finance";
import {
  generatePayroll,
  getPayrollDeductionPreview,
  type PayrollDeductionPreview,
} from "@/lib/actions/payroll";
import { toast } from "sonner";
import { formatCurrency, getMonthName } from "@/lib/utils/format";

export function GeneratePayrollDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [employees, setEmployees] = useState<{ id: string; fullName: string; baseSalary: number }[]>([]);
  const [preview, setPreview] = useState<PayrollDeductionPreview | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [deductLoan, setDeductLoan] = useState(true);
  const [deductSavings, setDeductSavings] = useState(true);
  const [loanAmounts, setLoanAmounts] = useState<Record<string, string>>({});
  const [savingsAmount, setSavingsAmount] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (open) getActiveEmployees().then(setEmployees);
  }, [open]);

  useEffect(() => {
    if (!employeeId || !open) {
      setPreview(null);
      return;
    }
    setPreviewLoading(true);
    getPayrollDeductionPreview(employeeId)
      .then((p) => {
        setPreview(p);
        const amounts: Record<string, string> = {};
        p.loans.forEach((l) => {
          amounts[l.loanId] = l.suggestedAmount > 0 ? String(l.suggestedAmount) : "";
        });
        setLoanAmounts(amounts);
        setSavingsAmount(p.savings.suggestedAmount > 0 ? String(p.savings.suggestedAmount) : "");
        setDeductLoan(p.loans.length > 0);
        setDeductSavings(p.savings.isActive && p.savings.suggestedAmount > 0);
      })
      .catch(() => toast.error("Failed to load deduction preview"))
      .finally(() => setPreviewLoading(false));
  }, [employeeId, open]);

  const loanTotal = useMemo(() => {
    if (!deductLoan) return 0;
    return Object.values(loanAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  }, [deductLoan, loanAmounts]);

  const savingsTotal = useMemo(() => {
    if (!deductSavings) return 0;
    return parseFloat(savingsAmount) || 0;
  }, [deductSavings, savingsAmount]);

  const netSalary = useMemo(() => {
    if (!preview) return 0;
    return preview.baseSalary - loanTotal - savingsTotal;
  }, [preview, loanTotal, savingsTotal]);

  async function handleGenerate() {
    if (!employeeId || !preview) return;
    setLoading(true);
    try {
      const loan_allocations = deductLoan
        ? preview.loans
            .map((l) => ({
              loanId: l.loanId,
              amount: parseFloat(loanAmounts[l.loanId] || "0") || 0,
            }))
            .filter((a) => a.amount > 0)
        : [];

      await generatePayroll({
        employee_id: employeeId,
        period_month: Number(month),
        period_year: Number(year),
        deduct_loan: deductLoan,
        deduct_savings: deductSavings,
        loan_allocations,
        savings_contribution: deductSavings ? savingsTotal : 0,
      });
      toast.success(`Payroll generated for ${getMonthName(Number(month))} ${year}`);
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate payroll");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button><Plus className="h-4 w-4 mr-2" />Generate Payroll</Button>} />
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Monthly Payroll</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Deduct loan recoveries and savings directly from salary
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={employeeId} onValueChange={(v) => v && setEmployeeId(v)}>
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
              <Label>Month</Label>
              <Select value={month} onValueChange={(v) => v && setMonth(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {getMonthName(i + 1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={year} onValueChange={(v) => v && setYear(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {previewLoading && (
            <p className="text-sm text-muted-foreground text-center py-4">Loading deductions...</p>
          )}

          {preview && !previewLoading && (
            <>
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base Salary</span>
                  <span className="font-semibold">{formatCurrency(preview.baseSalary)}</span>
                </div>
              </div>

              <Separator />

              {/* Loan deductions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Deduct Loan Recovery</Label>
                    <p className="text-xs text-muted-foreground">
                      {preview.loans.length
                        ? `${preview.loans.length} active loan(s)`
                        : "No active loans"}
                    </p>
                  </div>
                  <Switch
                    checked={deductLoan}
                    onCheckedChange={setDeductLoan}
                    disabled={preview.loans.length === 0}
                  />
                </div>

                {deductLoan && preview.loans.length > 0 && (
                  <div className="space-y-2 pl-1">
                    {preview.loans.map((loan) => (
                      <div key={loan.loanId} className="rounded-md border p-3 space-y-2">
                        <p className="text-sm font-medium">{loan.label}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <span>Outstanding: {formatCurrency(loan.remainingPrincipal)}</span>
                          <span>Max payoff: {formatCurrency(loan.maxPayoff)}</span>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Deduction amount</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder={loan.monthlyInstallment ? String(loan.monthlyInstallment) : "Enter amount"}
                            value={loanAmounts[loan.loanId] ?? ""}
                            onChange={(e) =>
                              setLoanAmounts((prev) => ({
                                ...prev,
                                [loan.loanId]: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-medium pt-1">
                      <span>Total loan deduction</span>
                      <span className="text-destructive">− {formatCurrency(loanTotal)}</span>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Savings deductions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Deduct Savings Contribution</Label>
                    <p className="text-xs text-muted-foreground">
                      {preview.savings.isActive
                        ? `${preview.savings.savingsType} — balance ${formatCurrency(preview.savings.currentBalance)}`
                        : preview.savings.hasAccount
                          ? "Savings account inactive"
                          : "No savings account"}
                    </p>
                  </div>
                  <Switch
                    checked={deductSavings}
                    onCheckedChange={setDeductSavings}
                    disabled={!preview.savings.isActive}
                  />
                </div>

                {deductSavings && preview.savings.isActive && (
                  <div className="space-y-1 pl-1">
                    <Label className="text-xs">Savings amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={savingsAmount}
                      onChange={(e) => setSavingsAmount(e.target.value)}
                    />
                    <div className="flex justify-between text-sm font-medium pt-2">
                      <span>Savings deduction</span>
                      <span className="text-destructive">− {formatCurrency(savingsTotal)}</span>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 flex justify-between items-center">
                <span className="font-medium">Net Salary (Take Home)</span>
                <span className="text-xl font-bold">{formatCurrency(netSalary)}</span>
              </div>
            </>
          )}

          <Button
            onClick={handleGenerate}
            className="w-full"
            disabled={loading || !employeeId || previewLoading || !preview}
          >
            {loading ? "Generating..." : "Generate Payroll"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
