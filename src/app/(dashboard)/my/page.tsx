import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatCurrency, cnStatusColor, getMonthName } from "@/lib/utils/format";
import { Wallet, PiggyBank, HandCoins, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function MyPortalPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.employeeId) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold">My Portal</h1>
        <p className="text-muted-foreground mt-2">Your account is not linked to an employee profile.</p>
      </div>
    );
  }

  const employeeId = user.employeeId;

  const [employee, payrolls, savings, loans, commissions] = await Promise.all([
    prisma.employee.findUnique({ where: { id: employeeId } }),
    prisma.payroll.findMany({
      where: { employeeId },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
      take: 6,
    }),
    prisma.savingsAccount.findUnique({ where: { employeeId } }),
    prisma.loan.findMany({ where: { employeeId } }),
    prisma.leadCommission.findMany({ where: { leadOwnerId: employeeId } }),
  ]);

  const totalLoanOutstanding = loans
    .filter((l) => l.status === "active")
    .reduce((s, l) => s + l.remainingPrincipal, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {employee?.fullName ?? user.email}</h1>
        <p className="text-muted-foreground text-sm">Your personal financial overview</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Base Salary" value={formatCurrency(employee?.baseSalary ?? 0)} icon={Wallet} />
        <StatCard title="Savings Balance" value={formatCurrency(savings?.currentBalance ?? 0)} icon={PiggyBank} />
        <StatCard title="Loan Outstanding" value={formatCurrency(totalLoanOutstanding)} icon={HandCoins} />
        <StatCard
          title="Commissions"
          value={formatCurrency(commissions.reduce((s, c) => s + c.commissionAmount, 0))}
          icon={Award}
        />
      </div>
      <Card>
        <CardHeader><CardTitle>Recent Payroll</CardTitle></CardHeader>
        <CardContent>
          {payrolls.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Final Salary</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrolls.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{getMonthName(p.periodMonth)} {p.periodYear}</TableCell>
                    <TableCell>{formatCurrency(p.finalSalary)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cnStatusColor(p.status)}>{p.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No payroll records yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
