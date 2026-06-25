import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { RevenueTable, AddRevenueDialog } from "@/components/revenue/revenue-table";
import { EmptyState } from "@/components/shared/empty-state";
import { mapIncomeEntry } from "@/lib/mappers";

export default async function RevenuePage() {
  await requireRole(["super_admin", "finance_manager"]);

  const rows = await prisma.incomeEntry.findMany({
    include: { employee: true },
    orderBy: { paymentReceivedDate: "desc" },
  });
  const revenues = rows.map(mapIncomeEntry);

  return (
    <div>
      <PageHeader title="Earnings Management" description="Track project income, auto revenue split, savings, loans, and commissions" action={<AddRevenueDialog />} />
      {revenues.length ? <RevenueTable revenues={revenues} /> : (
        <EmptyState title="No income records" description="Add your first project income entry." action={<AddRevenueDialog />} />
      )}
    </div>
  );
}
