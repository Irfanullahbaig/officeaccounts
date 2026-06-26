import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getLoanDetail } from "@/lib/actions/loans";
import { requireDirector } from "@/lib/auth/session";
import { StatCard } from "@/components/dashboard/stat-card";
import { LoanLedgerTable } from "@/components/loans/loan-ledger-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, cnStatusColor } from "@/lib/utils/format";
import { getNextDailyInterest } from "@/lib/loans/ledger";
import {
  DollarSign, TrendingDown, Percent, Wallet, CheckCircle, Clock,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DirectorLoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireDirector();
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

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/director/loans"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Loans
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{loan.employee.fullName}</h1>
        <p className="text-muted-foreground text-sm">
          {loan.employee.employeeCode} · Loan #{loan.id.slice(-8).toUpperCase()}
          {loan.notes ? ` · ${loan.notes}` : ""}
        </p>
        <Badge variant="secondary" className={`mt-2 ${cnStatusColor(loan.status === "paid" ? "paid" : "active")}`}>
          {loan.status === "paid" ? "Completed" : loan.status}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Loan Amount" value={formatCurrency(loan.loanAmount)} icon={DollarSign} />
        <StatCard title="Remaining Principal" value={formatCurrency(loan.remainingPrincipal)} icon={TrendingDown} />
        <StatCard
          title="Accrued Interest"
          value={formatCurrency(isActive ? loan.accruedInterest : 0)}
          icon={Percent}
        />
        <StatCard
          title={isActive ? "Payoff Amount" : "Total Paid"}
          value={formatCurrency(isActive ? summary.payoffAmount : summary.totalPaid)}
          icon={Wallet}
        />
        <StatCard title="Interest Rate" value={`${loan.interestRate}% p.a.`} icon={Percent} />
        <StatCard title="Daily Interest" value={isActive ? formatCurrency(dailyInterest) : "—"} icon={Clock} />
        <StatCard title="Principal Paid" value={formatCurrency(loan.totalPrincipalPaid)} icon={CheckCircle} />
        <StatCard title="Interest Paid" value={formatCurrency(loan.totalInterestPaid)} icon={CheckCircle} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Loan Details</CardTitle>
          <CardDescription>Issued {formatDate(loan.loanDate.toISOString())}</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Interest Type:</span>{" "}
            <span className="font-medium capitalize">{loan.interestType.replace(/_/g, " ")}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Monthly Installment:</span>{" "}
            <span className="font-medium">
              {loan.monthlyInstallment != null
                ? formatCurrency(loan.monthlyInstallment)
                : "On project payout"}
            </span>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-4">Transaction Ledger</h2>
        <LoanLedgerTable entries={loan.ledgerEntries} isAdmin={false} />
      </div>
    </div>
  );
}
