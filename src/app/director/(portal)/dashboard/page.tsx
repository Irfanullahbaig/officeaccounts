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
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { getDashboardStats, getChartData } from "@/lib/services/dashboard";
import { formatCurrency } from "@/lib/utils/format";
import { requireDirector } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function DirectorDashboardPage() {
  await requireDirector();

  const [stats, charts] = await Promise.all([
    getDashboardStats(),
    getChartData(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Financial Overview</h1>
        <p className="text-muted-foreground text-sm">
          Real-time company performance — loans, savings, commissions, and revenue
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard title="Total Revenue" value={formatCurrency(stats.totalRevenue)} icon={TrendingUp} />
        <StatCard title="Company Share" value={formatCurrency(stats.totalCompanyShare)} icon={Building2} />
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
