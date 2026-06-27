"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { RevenueTable, AddRevenueDialog } from "@/components/revenue/revenue-table";
import { startNewEarningsMonth } from "@/lib/actions/finance";
import type { IncomeEntry } from "@/types/database";
import type { EarningsPeriod } from "@/lib/earnings/period";
import { formatEarningsPeriod, isInEarningsPeriod } from "@/lib/earnings/period";
import { formatCurrency } from "@/lib/utils/format";
import { toast } from "sonner";

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(2024, i, 1)),
}));

export function RevenuePageClient({
  revenues,
  activePeriod,
}: {
  revenues: IncomeEntry[];
  activePeriod: EarningsPeriod;
}) {
  const router = useRouter();
  const [period, setPeriod] = useState(activePeriod);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(
    () => revenues.filter((r) => isInEarningsPeriod(r.payment_received_date, period)),
    [revenues, period]
  );

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, r) => ({
          projectValue: acc.projectValue + Number(r.project_value),
          companyShare: acc.companyShare + Number(r.company_share),
          employeeShare: acc.employeeShare + Number(r.freelancer_share),
          netPayout: acc.netPayout + Number(r.net_payout),
        }),
        { projectValue: 0, companyShare: 0, employeeShare: 0, netPayout: 0 }
      ),
    [filtered]
  );

  const years = useMemo(() => {
    const set = new Set(revenues.map((r) => new Date(r.payment_received_date).getFullYear()));
    set.add(period.year);
    set.add(new Date().getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [revenues, period.year]);

  function handleNewMonth() {
    startTransition(async () => {
      try {
        const next = await startNewEarningsMonth();
        setPeriod(next);
        toast.success(`Now tracking earnings for ${formatEarningsPeriod(next)}`);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to start new month");
      }
    });
  }

  return (
    <div>
      <PageHeader
        title="Earnings Management"
        description="Track project income by month — use New Month to start fresh monthly analytics"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(period.month)}
              onValueChange={(v) => v && setPeriod((p) => ({ ...p, month: Number(v) }))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(period.year)}
              onValueChange={(v) => v && setPeriod((p) => ({ ...p, year: Number(v) }))}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleNewMonth} disabled={pending}>
              <CalendarPlus className="h-4 w-4 mr-2" />
              New Month
            </Button>
            <AddRevenueDialog defaultPeriod={period} />
          </div>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PeriodStat label={`${formatEarningsPeriod(period)} — Project Value`} value={totals.projectValue} />
        <PeriodStat label="Company Share (30%)" value={totals.companyShare} />
        <PeriodStat label="Employee Share (70%)" value={totals.employeeShare} />
        <PeriodStat label="Net Payout" value={totals.netPayout} highlight />
      </div>

      {filtered.length ? (
        <RevenueTable revenues={filtered} />
      ) : (
        <EmptyState
          title={`No earnings for ${formatEarningsPeriod(period)}`}
          description="This month starts at zero. Add income entries or click New Month to switch to the current calendar month."
          action={<AddRevenueDialog defaultPeriod={period} />}
        />
      )}
    </div>
  );
}

function PeriodStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${highlight ? "text-primary" : ""}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}
