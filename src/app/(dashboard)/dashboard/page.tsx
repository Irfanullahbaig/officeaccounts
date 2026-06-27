import {
  TrendingUp,
  Building2,
  Wallet,
  HandCoins,
  PiggyBank,
  Award,
  Users,
  Trophy,
  Briefcase,
  Receipt,
  Scale,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { ProfitLossBar } from "@/components/dashboard/profit-loss-bar";
import { getDashboardStats, getChartData } from "@/lib/services/dashboard";
import { formatCurrency } from "@/lib/utils/format";
import { requireRole } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  await requireRole(["super_admin", "admin", "finance_manager"]);

  const [stats, charts] = await Promise.all([
    getDashboardStats(),
    getChartData(),
  ]);

  const isProfit = stats.netProfitLoss >= 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Company revenue, expenses, and profit overview
        </p>
      </div>

      <ProfitLossBar
        companyShare={stats.totalCompanyShare}
        totalExpenses={stats.totalExpenses}
        netProfitLoss={stats.netProfitLoss}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard title="Total Revenue" value={formatCurrency(stats.totalRevenue)} icon={TrendingUp} />
        <StatCard title="Company Share" value={formatCurrency(stats.totalCompanyShare)} icon={Building2} />
        <StatCard title="Total Expenses" value={formatCurrency(stats.totalExpenses)} icon={Receipt} />
        <StatCard
          title={isProfit ? "Net Profit" : "Net Loss"}
          value={formatCurrency(Math.abs(stats.netProfitLoss))}
          icon={Scale}
          className={cn(isProfit ? "border-emerald-500/20" : "border-red-500/20")}
          description={isProfit ? "Company is profitable" : "Expenses exceed income"}
        />
        <StatCard title="Employee Earnings" value={formatCurrency(stats.totalEmployeeEarnings)} icon={Wallet} />
        <StatCard title="Outstanding Loans" value={formatCurrency(stats.outstandingLoanAmount)} icon={HandCoins} />
        <StatCard title="Total Savings" value={formatCurrency(stats.totalSavings)} icon={PiggyBank} />
        <StatCard title="Lead Commissions" value={formatCurrency(stats.totalLeadCommissions)} icon={Award} />
        <StatCard title="Co-Lead Commissions" value={formatCurrency(stats.totalCoLeadCommissions)} icon={Users} />
        <StatCard title="Active Loans" value={String(stats.totalActiveLoans)} icon={HandCoins} />
        <StatCard title="Top Employee" value={stats.topPerformingEmployee} icon={Trophy} />
        <StatCard title="Top Revenue Project" value={stats.topRevenueProject} icon={Briefcase} />
      </div>

      <DashboardCharts {...charts} />
    </div>
  );
}
