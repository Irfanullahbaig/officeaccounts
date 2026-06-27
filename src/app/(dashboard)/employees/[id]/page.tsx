import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { queryDatabase } from "@/lib/db/query";
import { requireRole } from "@/lib/auth/session";
import { EmployeeProfile } from "@/components/employees/employee-profile";
import { mapEmployee, mapIncomeEntry } from "@/lib/mappers";

export const dynamic = "force-dynamic";

function parseCompanyName(settings: { key: string; value: string }[]): string {
  const row = settings.find((s) => s.key === "company_name");
  if (!row) return "N9Accounts";
  try {
    return JSON.parse(row.value) as string;
  } catch {
    return "N9Accounts";
  }
}

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["super_admin", "finance_manager"]);
  const { id } = await params;

  const [employeeRow, incomeRows, payrollRows, settings] = await Promise.all([
    queryDatabase(null, () => prisma.employee.findUnique({ where: { id } })),
    queryDatabase([], () =>
      prisma.incomeEntry.findMany({
        where: { employeeId: id },
        orderBy: { paymentReceivedDate: "desc" },
        include: { employee: true },
      })
    ),
    queryDatabase([], () =>
      prisma.payroll.findMany({
        where: { employeeId: id },
        orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
      })
    ),
    queryDatabase([], () => prisma.systemSetting.findMany()),
  ]);

  if (!employeeRow) notFound();

  const employee = mapEmployee(employeeRow);
  const incomeEntries = incomeRows.map(mapIncomeEntry);
  const payrolls = payrollRows.map((p) => ({
    period_month: p.periodMonth,
    period_year: p.periodYear,
    base_salary: p.baseSalary,
    bonuses: p.bonuses,
    commissions: p.commissions,
    loan_recovery: p.loanRecovery,
    savings_contribution: p.savingsContribution,
    deductions: p.deductions,
    final_salary: p.finalSalary,
    status: p.status,
    paid_at: p.paidAt?.toISOString() ?? null,
  }));

  return (
    <EmployeeProfile
      employee={employee}
      companyName={parseCompanyName(settings)}
      incomeEntries={incomeEntries}
      payrolls={payrolls}
    />
  );
}
