"use client";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { Loan } from "@/types/database";
import { formatCurrency, formatDate, cnStatusColor } from "@/lib/utils/format";
import { getNextDailyInterest } from "@/lib/loans/ledger";
import { AddInstallmentDialog } from "@/components/loans/add-installment-dialog";
import { EditLoanDialog } from "@/components/loans/edit-loan-dialog";
import { DeleteLoanDialog } from "@/components/loans/delete-loan-dialog";

interface LoanWithEmployee extends Omit<Loan, "employees"> {
  employees: { full_name: string; employee_code: string } | null;
}

const INTEREST_LABELS: Record<string, string> = {
  daily_diminishing: "Daily Diminishing",
  monthly_diminishing: "Monthly Diminishing",
  flat: "Flat Interest",
};

export function LoansTable({ loans }: { loans: LoanWithEmployee[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Rate</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Remaining</TableHead>
            <TableHead>Daily Interest</TableHead>
            <TableHead>Installment</TableHead>
            <TableHead>Total Interest Earned</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[160px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loans.map((loan) => (
            <TableRow key={loan.id}>
              <TableCell>
                <Link href={`/loans/${loan.id}`} className="hover:underline">
                  <p className="font-medium">{loan.employees?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{loan.employees?.employee_code}</p>
                </Link>
              </TableCell>
              <TableCell>{formatCurrency(Number(loan.loan_amount))}</TableCell>
              <TableCell>{Number(loan.interest_rate)}%</TableCell>
              <TableCell>{INTEREST_LABELS[loan.interest_type]}</TableCell>
              <TableCell className="font-semibold">{formatCurrency(Number(loan.remaining_principal))}</TableCell>
              <TableCell className="text-muted-foreground">
                {loan.status === "active"
                  ? formatCurrency(getNextDailyInterest(Number(loan.remaining_principal), Number(loan.interest_rate)))
                  : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {loan.monthly_installment != null
                  ? formatCurrency(Number(loan.monthly_installment))
                  : "On project payout"}
              </TableCell>
              <TableCell>{formatCurrency(Number(loan.total_interest_paid))}</TableCell>
              <TableCell>{formatDate(loan.loan_date)}</TableCell>
              <TableCell>
                <Badge variant="secondary" className={cnStatusColor(loan.status)}>
                  {loan.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {loan.status === "active" && (
                    <AddInstallmentDialog
                      loanId={loan.id}
                      monthlyInstallment={
                        loan.monthly_installment != null ? Number(loan.monthly_installment) : null
                      }
                      compact
                    />
                  )}
                  <EditLoanDialog
                    loanId={loan.id}
                    compact
                    hasPayments={Number(loan.total_principal_paid) > 0 || Number(loan.total_interest_paid) > 0}
                    defaults={{
                      loan_amount: Number(loan.loan_amount),
                      loan_date: loan.loan_date.split("T")[0],
                      interest_rate: Number(loan.interest_rate),
                      interest_type: loan.interest_type,
                      monthly_installment: loan.monthly_installment,
                      duration_months: loan.duration_months,
                      notes: loan.notes ?? "",
                    }}
                  />
                  <DeleteLoanDialog
                    loanId={loan.id}
                    hasPayments={Number(loan.total_principal_paid) > 0 || Number(loan.total_interest_paid) > 0}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
