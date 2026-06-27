"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

const CHART_HEIGHT = "h-[200px]";

const revenueConfig = {
  revenue: { label: "Income", color: "hsl(142 71% 45%)" },
  expenses: { label: "Expenses", color: "hsl(0 72% 51%)" },
} satisfies ChartConfig;

const profitConfig = {
  net: { label: "Net P&L", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const payrollConfig = {
  payroll: { label: "Employee share", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const loanConfig = {
  collections: { label: "Loan payments", color: "hsl(221 83% 53%)" },
} satisfies ChartConfig;

const savingsConfig = {
  savings: { label: "Savings", color: "hsl(262 83% 58%)" },
} satisfies ChartConfig;

const chartMargin = { top: 12, right: 4, left: 4, bottom: 0 };

const axisTick = {
  fontSize: 11,
  fill: "hsl(var(--muted-foreground))",
};

function formatAxisValue(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}

function ChartLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-[11px] text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function MinimalChartShell({
  title,
  legend,
  children,
  className,
}: {
  title: string;
  legend?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("border-border/60 shadow-none", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-0 pt-4 px-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {legend}
      </CardHeader>
      <CardContent className="px-3 pb-4 pt-3">{children}</CardContent>
    </Card>
  );
}

interface DashboardChartsProps {
  revenueVsExpenses: { month: string; revenue: number; expenses: number }[];
  payrollTrend: { month: string; payroll: number }[];
  loanCollectionTrend: { month: string; collections: number }[];
  profitLossTrend: { month: string; net: number }[];
  savingsTrend: { month: string; savings: number }[];
}

export function DashboardCharts({
  revenueVsExpenses,
  payrollTrend,
  loanCollectionTrend,
  profitLossTrend,
  savingsTrend,
}: DashboardChartsProps) {
  const currencyTooltip = (
    <ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <MinimalChartShell
        title="Income vs Expenses"
        legend={
          <ChartLegend
            items={[
              { color: revenueConfig.revenue.color!, label: "Income" },
              { color: revenueConfig.expenses.color!, label: "Expenses" },
            ]}
          />
        }
      >
        <ChartContainer
          config={revenueConfig}
          className={cn(CHART_HEIGHT, "w-full aspect-auto")}
          initialDimension={{ width: 400, height: 200 }}
        >
          <BarChart data={revenueVsExpenses} margin={chartMargin} barGap={6} barCategoryGap="24%">
            <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="hsl(var(--border))" strokeOpacity={0.35} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} dy={8} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              width={36}
              tickFormatter={formatAxisValue}
            />
            <ChartTooltip content={currencyTooltip} cursor={{ fill: "hsl(var(--muted))", opacity: 0.25 }} />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[6, 6, 0, 0]} maxBarSize={28} />
            <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[6, 6, 0, 0]} maxBarSize={28} opacity={0.85} />
          </BarChart>
        </ChartContainer>
      </MinimalChartShell>

      <MinimalChartShell
        title="Profit & Loss"
        legend={
          <ChartLegend
            items={[
              { color: "hsl(142 71% 45%)", label: "Profit" },
              { color: "hsl(0 72% 51%)", label: "Loss" },
            ]}
          />
        }
      >
        <ChartContainer
          config={profitConfig}
          className={cn(CHART_HEIGHT, "w-full aspect-auto")}
          initialDimension={{ width: 400, height: 200 }}
        >
          <BarChart data={profitLossTrend} margin={chartMargin} barCategoryGap="30%">
            <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="hsl(var(--border))" strokeOpacity={0.35} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} dy={8} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              width={36}
              tickFormatter={formatAxisValue}
            />
            <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="4 4" />
            <ChartTooltip content={currencyTooltip} cursor={{ fill: "hsl(var(--muted))", opacity: 0.2 }} />
            <Bar dataKey="net" radius={[6, 6, 6, 6]} maxBarSize={32}>
              {profitLossTrend.map((entry) => (
                <Cell
                  key={entry.month}
                  fill={entry.net >= 0 ? "hsl(142 71% 45%)" : "hsl(0 72% 51%)"}
                  fillOpacity={entry.net >= 0 ? 0.9 : 0.75}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </MinimalChartShell>

      <MinimalChartShell title="Employee earnings">
        <ChartContainer
          config={payrollConfig}
          className={cn("h-[160px]", "w-full aspect-auto")}
          initialDimension={{ width: 400, height: 160 }}
        >
          <AreaChart data={payrollTrend} margin={chartMargin}>
            <defs>
              <linearGradient id="payrollFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-payroll)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--color-payroll)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="hsl(var(--border))" strokeOpacity={0.35} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} dy={8} />
            <YAxis hide />
            <ChartTooltip content={currencyTooltip} cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="payroll"
              stroke="var(--color-payroll)"
              strokeWidth={2}
              fill="url(#payrollFill)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ChartContainer>
      </MinimalChartShell>

      <MinimalChartShell title="Loan collections">
        <ChartContainer
          config={loanConfig}
          className={cn("h-[160px]", "w-full aspect-auto")}
          initialDimension={{ width: 400, height: 160 }}
        >
          <LineChart data={loanCollectionTrend} margin={chartMargin}>
            <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="hsl(var(--border))" strokeOpacity={0.35} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} dy={8} />
            <YAxis hide />
            <ChartTooltip content={currencyTooltip} cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} />
            <Line
              type="monotone"
              dataKey="collections"
              stroke="var(--color-collections)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </LineChart>
        </ChartContainer>
      </MinimalChartShell>

      <MinimalChartShell title="Savings contributions" className="lg:col-span-2">
        <ChartContainer
          config={savingsConfig}
          className={cn("h-[160px]", "w-full aspect-auto")}
          initialDimension={{ width: 800, height: 160 }}
        >
          <AreaChart data={savingsTrend} margin={chartMargin}>
            <defs>
              <linearGradient id="savingsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-savings)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--color-savings)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="hsl(var(--border))" strokeOpacity={0.35} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} dy={8} />
            <YAxis hide />
            <ChartTooltip content={currencyTooltip} cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="savings"
              stroke="var(--color-savings)"
              strokeWidth={2}
              fill="url(#savingsFill)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ChartContainer>
      </MinimalChartShell>
    </div>
  );
}
