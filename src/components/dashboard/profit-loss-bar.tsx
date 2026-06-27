"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export function ProfitLossBar({
  companyShare,
  totalExpenses,
  netProfitLoss,
}: {
  companyShare: number;
  totalExpenses: number;
  netProfitLoss: number;
}) {
  const isProfit = netProfitLoss >= 0;
  const scale = Math.max(companyShare, totalExpenses, Math.abs(netProfitLoss), 1);
  const incomePct = Math.min(100, (companyShare / scale) * 100);
  const expensePct = Math.min(100, (totalExpenses / scale) * 100);
  const netPct = Math.min(100, (Math.abs(netProfitLoss) / scale) * 100);

  return (
    <Card className={cn(isProfit ? "border-emerald-500/30" : "border-red-500/30")}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Profit & Loss</CardTitle>
            <CardDescription>Company share vs operating expenses (this year)</CardDescription>
          </div>
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold",
              isProfit
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-red-500/10 text-red-700 dark:text-red-400"
            )}
          >
            {isProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {isProfit ? "In Profit" : "In Loss"}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Company Share (Income)</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(companyShare)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Expenses</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(totalExpenses)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Net {isProfit ? "Profit" : "Loss"}</p>
            <p
              className={cn(
                "text-xl font-bold",
                isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              )}
            >
              {formatCurrency(Math.abs(netProfitLoss))}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Income</span>
            <span>Expenses</span>
          </div>
          <div className="relative h-8 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/80 transition-all"
              style={{ width: `${incomePct}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-red-500/75 transition-all"
              style={{ width: `${expensePct}%` }}
            />
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-all",
                isProfit ? "bg-emerald-500" : "bg-red-500"
              )}
              style={{ width: `${netPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {isProfit
              ? `Expenses are ${expensePct.toFixed(0)}% of company income — ${netPct.toFixed(0)}% net margin`
              : `Expenses exceed company income by ${formatCurrency(Math.abs(netProfitLoss))}`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
