import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { SavingsTable } from "@/components/savings/savings-table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatCurrency } from "@/lib/utils/format";
import { PiggyBank } from "lucide-react";
import { mapSavings } from "@/lib/mappers";

export default async function SavingsPage() {
  await requireRole(["super_admin", "finance_manager"]);

  const rows = await prisma.savingsAccount.findMany({
    include: { employee: true },
    orderBy: { createdAt: "desc" },
  });
  const accounts = rows.map(mapSavings);
  const totalBalance = accounts.reduce((s, a) => s + Number(a.current_balance), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Employee Savings" description="Track contributions, deposits, withdrawals, and balances" />
      <StatCard title="Total Savings Balance" value={formatCurrency(totalBalance)} icon={PiggyBank} className="max-w-sm" />
      {accounts.length ? <SavingsTable accounts={accounts} /> : (
        <EmptyState title="No savings accounts" description="Savings accounts are created when employees enroll in the savings program." />
      )}
    </div>
  );
}
