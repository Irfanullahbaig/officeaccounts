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
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";

const revenueConfig = {
  revenue: { label: "Company Share", color: "hsl(var(--chart-1))" },
  expenses: { label: "Expenses", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const payrollConfig = {
  payroll: { label: "Employee Share", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

const loanConfig = {
  collections: { label: "Collections", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;

const profitConfig = {
  net: { label: "Net P&L", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig;

const savingsConfig = {
  savings: { label: "Savings", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

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
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Company Share vs Expenses</CardTitle>
          <CardDescription>Monthly company income compared to operating expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={revenueConfig} className="h-[250px] w-full">
            <BarChart data={revenueVsExpenses}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <ChartTooltip
                content={
                  <ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />
                }
              />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
              <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profit & Loss by Month</CardTitle>
          <CardDescription>Green = profit, red = loss (after expenses & commissions)</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={profitConfig} className="h-[250px] w-full">
            <BarChart data={profitLossTrend}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <ChartTooltip
                content={
                  <ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />
                }
              />
              <Bar dataKey="net" radius={4}>
                {profitLossTrend.map((entry) => (
                  <Cell
                    key={entry.month}
                    fill={entry.net >= 0 ? "hsl(142 76% 36%)" : "hsl(0 72% 51%)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employee Share Trend</CardTitle>
          <CardDescription>Monthly freelancer earnings</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={payrollConfig} className="h-[250px] w-full">
            <LineChart data={payrollTrend}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="payroll" stroke="var(--color-payroll)" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Loan Payment Trend</CardTitle>
          <CardDescription>Monthly loan settlements from income entries</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={loanConfig} className="h-[250px] w-full">
            <AreaChart data={loanCollectionTrend}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="collections" fill="var(--color-collections)" stroke="var(--color-collections)" fillOpacity={0.3} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Savings Trend</CardTitle>
          <CardDescription>Employee savings contributions</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={savingsConfig} className="h-[250px] w-full">
            <AreaChart data={savingsTrend}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="savings" fill="var(--color-savings)" stroke="var(--color-savings)" fillOpacity={0.3} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
