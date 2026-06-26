import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { requireDirector } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { LoansTabs } from "@/components/loans/loans-tabs";
import { formatCurrency } from "@/lib/utils/format";
import { HandCoins, TrendingUp, DollarSign, Clock, Percent } from "lucide-react";
import { mapLoan } from "@/lib/mappers";

export const dynamic = "force-dynamic";

export default async function DirectorLoansPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireDirector();
  const { tab } = await searchParams;

  const rows = await prisma.loan.findMany({
    include: { employee: true },
    orderBy: [{ loanDate: "asc" }, { createdAt: "asc" }],
  });
  const loans = rows.map(mapLoan);

  const activeLoans = loans.filter((l) => l.status === "active");
  const completedLoans = loans.filter((l) => l.status === "paid");
  const pendingLoans = loans.filter(
    (l) => l.status === "active" && Number(l.remaining_principal) > 0.01
  );
  const totalIssued = loans.reduce((s, l) => s + Number(l.loan_amount), 0);
  const totalOutstanding = activeLoans.reduce((s, l) => s + Number(l.remaining_principal), 0);
  const totalInterestEarned = loans.reduce((s, l) => s + Number(l.total_interest_paid), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Loans"
        description="View-only — monitor all active, pending, and completed employee loans"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Total Issued" value={formatCurrency(totalIssued)} icon={DollarSign} />
        <StatCard title="Active Loans" value={String(activeLoans.length)} icon={HandCoins} />
        <StatCard title="Pending Repayment" value={String(pendingLoans.length)} icon={Clock} />
        <StatCard title="Completed" value={String(completedLoans.length)} icon={HandCoins} />
        <StatCard title="Outstanding Principal" value={formatCurrency(totalOutstanding)} icon={TrendingUp} />
        <StatCard
          title="Total Interest Earned"
          value={formatCurrency(totalInterestEarned)}
          icon={Percent}
          description="Interest collected across all loans"
        />
      </div>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading loans...</div>}>
        <LoansTabs
          loans={loans}
          defaultTab={tab ?? "all"}
          readOnly
          detailBasePath="/director/loans"
        />
      </Suspense>
    </div>
  );
}
