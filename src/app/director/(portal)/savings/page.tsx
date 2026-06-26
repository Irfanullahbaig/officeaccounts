import { prisma } from "@/lib/prisma";
import { requireDirector } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { SavingsTable } from "@/components/savings/savings-table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatCurrency } from "@/lib/utils/format";
import { PiggyBank } from "lucide-react";
import { mapSavings } from "@/lib/mappers";

export const dynamic = "force-dynamic";

export default async function DirectorSavingsPage() {
  await requireDirector();

  const rows = await prisma.savingsAccount.findMany({
    include: { employee: true },
    orderBy: { createdAt: "desc" },
  });
  const accounts = rows.map(mapSavings);
  const totalBalance = accounts.reduce((s, a) => s + Number(a.current_balance), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Savings"
        description="View-only — track employee savings balances and enrollment"
      />
      <StatCard title="Total Savings Balance" value={formatCurrency(totalBalance)} icon={PiggyBank} className="max-w-sm" />
      {accounts.length ? (
        <SavingsTable accounts={accounts} />
      ) : (
        <EmptyState title="No savings accounts" description="Savings accounts will appear here once employees enroll." />
      )}
    </div>
  );
}
