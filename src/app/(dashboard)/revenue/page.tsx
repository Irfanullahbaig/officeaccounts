import { prisma } from "@/lib/prisma";
import { queryDatabase } from "@/lib/db/query";
import { requireRole } from "@/lib/auth/session";
import { getEarningsActivePeriod } from "@/lib/actions/finance";
import { RevenuePageClient } from "@/components/revenue/revenue-page-client";
import { mapIncomeEntry } from "@/lib/mappers";

export default async function RevenuePage() {
  await requireRole(["super_admin", "finance_manager"]);

  const [rows, activePeriod] = await Promise.all([
    queryDatabase([], () =>
      prisma.incomeEntry.findMany({
        include: { employee: true },
        orderBy: { paymentReceivedDate: "desc" },
      })
    ),
    getEarningsActivePeriod(),
  ]);
  const revenues = rows.map(mapIncomeEntry);

  return <RevenuePageClient revenues={revenues} activePeriod={activePeriod} />;
}
