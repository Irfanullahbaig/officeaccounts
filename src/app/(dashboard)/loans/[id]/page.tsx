import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getLoanDetail } from "@/lib/actions/loans";
import { StatCard } from "@/components/dashboard/stat-card";
import { LoanLedgerTable } from "@/components/loans/loan-ledger-table";
import { AddInstallmentDialog } from "@/components/loans/add-installment-dialog";
import { CloseLoanDialog } from "@/components/loans/close-loan-dialog";
import { EditLoanDialog } from "@/components/loans/edit-loan-dialog";
import { DeleteLoanDialog } from "@/components/loans/delete-loan-dialog";
import { ExportLoanStatement } from "@/components/loans/export-loan-statement";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, cnStatusColor } from "@/lib/utils/format";
import { getNextDailyInterest } from "@/lib/loans/ledger";
import {
  DollarSign, TrendingDown, Percent, Wallet, CheckCircle, Clock,
} from "lucide-react";

export default async function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let data;
  try {
    data = await getLoanDetail(id);
  } catch {
    notFound();
  }

  const { loan, summary } = data;
  const isActive = loan.status === "active";
  const dailyInterest = isActive
    ? getNextDailyInterest(loan.remainingPrincipal, loan.interestRate)
    : 0;

  const statementRows = loan.ledgerEntries
    .filter((e) => !e.isReversed)
    .map((e) => ({
      Date: e.transactionDate.toISOString().split("T")[0],
      Type: e.transactionType.replace(/_/g, " "),
      Amount: e.amount,
      "Interest Portion": e.interestPortion,
      "Principal Portion": e.principalPortion,
      "Remaining Balance": e.remainingPrincipal,
      Remarks: e.remarks ?? "",
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link href="/loans" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
            <ArrowLeft className="h-4 w-4" /> Back to Loans
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            {loan.employee.fullName}
          </h1>
          <p className="text-muted-foreground text-sm">
            {loan.employee.employeeCode} · Loan #{loan.id.slice(-8).toUpperCase()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Badge variant="secondary" className={cnStatusColor(loan.status === "paid" ? "paid" : "active")}>
            {loan.status === "paid" ? "Completed" : loan.status}
          </Badge>
          {isActive && (
            <>
              <AddInstallmentDialog
                loanId={loan.id}
                monthlyInstallment={loan.monthlyInstallment}
                maxAmount={summary.payoffAmount}
              />
              <CloseLoanDialog loanId={loan.id} payoffAmount={summary.payoffAmount} />
            </>
          )}
          <EditLoanDialog
            loanId={loan.id}
            hasPayments={loan.totalPrincipalPaid > 0 || loan.totalInterestPaid > 0}
            defaults={{
              loan_amount: loan.loanAmount,
              loan_date: loan.loanDate.toISOString().split("T")[0],
              interest_rate: loan.interestRate,
              interest_type: loan.interestType,
              monthly_installment: loan.monthlyInstallment,
              duration_months: loan.durationMonths,
              notes: loan.notes ?? "",
            }}
          />
          <DeleteLoanDialog
            loanId={loan.id}
            hasPayments={loan.totalPrincipalPaid > 0 || loan.totalInterestPaid > 0}
            redirectTo="/loans"
          />
          <ExportLoanStatement
            rows={statementRows}
            filename={`loan-${loan.employee.employeeCode}`}
            employeeName={loan.employee.fullName}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard title="Original Loan" value={formatCurrency(summary.originalAmount)} icon={DollarSign} />
        <StatCard title="Outstanding Principal" value={formatCurrency(summary.outstandingPrincipal)} icon={TrendingDown} />
        <StatCard
          title="Interest Rate"
          value={`${loan.interestRate}%`}
          icon={Percent}
          description="Annual rate — diminishing daily balance"
        />
        <StatCard
          title="Daily Interest"
          value={formatCurrency(dailyInterest)}
          icon={Clock}
          description={
            isActive
              ? `(Balance × ${loan.interestRate}%) ÷ 365 — reduces as principal is paid`
              : "Loan closed"
          }
        />
        <StatCard
          title="Total Interest Earned"
          value={formatCurrency(loan.totalInterestPaid)}
          icon={Wallet}
          description="Interest collected on this loan"
        />
        <StatCard title="Accrued Interest" value={formatCurrency(summary.accruedInterest)} icon={Percent} description="Unpaid interest to date" />
        <StatCard title="Total Paid" value={formatCurrency(summary.totalPaid)} icon={Wallet} />
        {isActive && (
          <StatCard title="Payoff Amount" value={formatCurrency(summary.payoffAmount)} icon={CheckCircle} description="Principal + accrued interest" />
        )}
        {loan.closedAt && (
          <StatCard title="Closed Date" value={formatDate(loan.closedAt.toISOString())} icon={CheckCircle} />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Loan Details</CardTitle>
          <CardDescription>
            Diminishing balance — interest charged daily on remaining principal. Deposits reduce the original loan first, then pay accrued interest.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div><span className="text-muted-foreground">Interest Rate</span><p className="font-medium">{loan.interestRate}% p.a.</p></div>
          <div><span className="text-muted-foreground">Interest Type</span><p className="font-medium capitalize">{loan.interestType.replace(/_/g, " ")}</p></div>
          <div><span className="text-muted-foreground">Loan Date</span><p className="font-medium">{formatDate(loan.loanDate.toISOString())}</p></div>
          <div><span className="text-muted-foreground">Payment Order</span><p className="font-medium">Principal first, then interest</p></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Loan Ledger</CardTitle>
          <CardDescription>Complete transaction history — payments, interest accruals, and adjustments</CardDescription>
        </CardHeader>
        <CardContent>
          <LoanLedgerTable entries={loan.ledgerEntries} isAdmin={true} />
        </CardContent>
      </Card>
    </div>
  );
}
