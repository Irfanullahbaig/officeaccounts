"use client";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Payroll } from "@/types/database";
import { formatCurrency, getMonthName, cnStatusColor } from "@/lib/utils/format";
import { markPayrollAsPaid } from "@/lib/actions/payroll";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";
import { useState } from "react";

interface PayrollWithEmployee extends Omit<Payroll, "employees"> {
  employees: { full_name: string; employee_code: string } | null;
}

export function PayrollTable({ payrolls }: { payrolls: PayrollWithEmployee[] }) {
  const router = useRouter();
  const [payingId, setPayingId] = useState<string | null>(null);

  async function handleMarkPaid(id: string) {
    if (!confirm("Mark as paid? Loan and savings deductions will be applied to employee accounts.")) return;
    setPayingId(id);
    try {
      await markPayrollAsPaid(id);
      toast.success("Payroll paid — loan & savings deductions applied");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to mark as paid");
    }
    setPayingId(null);
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Base</TableHead>
            <TableHead>Loan Recovery</TableHead>
            <TableHead>Savings</TableHead>
            <TableHead>Final Salary</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payrolls.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{p.employees?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{p.employees?.employee_code}</p>
                </div>
              </TableCell>
              <TableCell>{getMonthName(p.period_month)} {p.period_year}</TableCell>
              <TableCell>{formatCurrency(Number(p.base_salary))}</TableCell>
              <TableCell>
                {Number(p.loan_recovery) > 0 ? (
                  <span className="text-destructive">{formatCurrency(Number(p.loan_recovery))}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {Number(p.savings_contribution) > 0 ? (
                  <span className="text-destructive">{formatCurrency(Number(p.savings_contribution))}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="font-semibold">{formatCurrency(Number(p.final_salary))}</TableCell>
              <TableCell>
                <Badge variant="secondary" className={cnStatusColor(p.status)}>
                  {p.status}
                </Badge>
              </TableCell>
              <TableCell>
                {p.status === "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={payingId === p.id}
                    onClick={() => handleMarkPaid(p.id)}
                  >
                    {payingId === p.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Mark Paid
                      </>
                    )}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
