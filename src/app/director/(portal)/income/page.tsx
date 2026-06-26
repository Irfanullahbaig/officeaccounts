import { prisma } from "@/lib/prisma";
import { requireDirector } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { RevenueTable } from "@/components/revenue/revenue-table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatCurrency } from "@/lib/utils/format";
import { TrendingUp, Building2, Wallet } from "lucide-react";
import { mapIncomeEntry } from "@/lib/mappers";

export const dynamic = "force-dynamic";

export default async function DirectorIncomePage() {
  await requireDirector();

  const rows = await prisma.incomeEntry.findMany({
    include: { employee: true },
    orderBy: { paymentReceivedDate: "desc" },
  });
  const revenues = rows.map(mapIncomeEntry);

  const totalValue = revenues.reduce((s, r) => s + Number(r.project_value), 0);
  const totalCompany = revenues.reduce((s, r) => s + Number(r.company_share), 0);
  const totalEmployee = revenues.reduce((s, r) => s + Number(r.freelancer_share), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Income"
        description="View-only — all project earnings, revenue splits, and payouts"
      />
      <div className="grid gap-4 sm:grid-cols-3 max-w-3xl">
        <StatCard title="Total Project Value" value={formatCurrency(totalValue)} icon={TrendingUp} />
        <StatCard title="Company Share (30%)" value={formatCurrency(totalCompany)} icon={Building2} />
        <StatCard title="Employee Share (70%)" value={formatCurrency(totalEmployee)} icon={Wallet} />
      </div>
      {revenues.length ? (
        <RevenueTable revenues={revenues} readOnly />
      ) : (
        <EmptyState title="No income records" description="Income entries will appear here once recorded." />
      )}
    </div>
  );
}
