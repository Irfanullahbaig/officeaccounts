import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { LoansTable } from "@/components/loans/loans-table";
import { AddLoanDialog } from "@/components/loans/add-loan-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency } from "@/lib/utils/format";
import { HandCoins, TrendingUp, DollarSign, Clock, Percent } from "lucide-react";
import { mapLoan } from "@/lib/mappers";
import { getNextDailyInterest } from "@/lib/loans/ledger";

export default async function LoansPage() {
  await requireRole(["super_admin", "admin", "finance_manager"]);

  const rows = await prisma.loan.findMany({
    include: { employee: true },
    orderBy: { createdAt: "desc" },
  });
  const loans = rows.map(mapLoan);

  const activeLoans = loans.filter((l) => l.status === "active");
  const totalIssued = loans.reduce((s, l) => s + Number(l.loan_amount), 0);
  const totalOutstanding = activeLoans.reduce((s, l) => s + Number(l.remaining_principal), 0);
  const totalInterestEarned = loans.reduce((s, l) => s + Number(l.total_interest_paid), 0);
  const totalDailyInterest = activeLoans.reduce(
    (s, l) => s + getNextDailyInterest(Number(l.remaining_principal), Number(l.interest_rate)),
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loan Management"
        description="Diminishing balance loans — record bank installments when employees repay directly"
        action={<AddLoanDialog />}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Total Issued" value={formatCurrency(totalIssued)} icon={DollarSign} />
        <StatCard title="Active Loans" value={String(activeLoans.length)} icon={HandCoins} />
        <StatCard title="Outstanding Principal" value={formatCurrency(totalOutstanding)} icon={TrendingUp} />
        <StatCard
          title="Daily Interest"
          value={formatCurrency(totalDailyInterest)}
          icon={Clock}
          description="Diminishing — charged daily on remaining balance"
        />
        <StatCard
          title="Total Interest Earned"
          value={formatCurrency(totalInterestEarned)}
          icon={Percent}
          description="Interest collected across all loans"
        />
      </div>
      {loans.length ? (
        <LoansTable loans={loans} />
      ) : (
        <EmptyState
          title="No loans recorded"
          description="Create employee loans with diminishing balance interest."
          action={<AddLoanDialog />}
        />
      )}
    </div>
  );
}
