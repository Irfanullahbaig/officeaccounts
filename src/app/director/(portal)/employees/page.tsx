import { prisma } from "@/lib/prisma";
import { requireDirector } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { EmployeesTable } from "@/components/employees/employees-table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatCurrency } from "@/lib/utils/format";
import { Users, Wallet, HandCoins, PiggyBank } from "lucide-react";
import { mapEmployee } from "@/lib/mappers";

export const dynamic = "force-dynamic";

export default async function DirectorEmployeesPage() {
  await requireDirector();

  const rows = await prisma.employee.findMany({ orderBy: { createdAt: "desc" } });
  const employees = rows.map(mapEmployee);

  const totalEarnings = employees.reduce((s, e) => s + Number(e.total_lifetime_earnings), 0);
  const totalLoans = employees.reduce((s, e) => s + Number(e.current_loan_balance), 0);
  const totalSavings = employees.reduce((s, e) => s + Number(e.total_savings), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description="View-only — employee financial summaries and performance"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Employees" value={String(employees.length)} icon={Users} />
        <StatCard title="Lifetime Earnings" value={formatCurrency(totalEarnings)} icon={Wallet} />
        <StatCard title="Outstanding Loans" value={formatCurrency(totalLoans)} icon={HandCoins} />
        <StatCard title="Total Savings" value={formatCurrency(totalSavings)} icon={PiggyBank} />
      </div>
      {employees.length ? (
        <EmployeesTable employees={employees} readOnly />
      ) : (
        <EmptyState title="No employees" description="Employee records will appear here once added by admin." />
      )}
    </div>
  );
}
