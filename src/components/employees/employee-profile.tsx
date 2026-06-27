"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  FileText,
  Mail,
  Phone,
  Printer,
  Receipt,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditEmployeeDialog } from "@/components/employees/edit-employee-dialog";
import { printExperienceLetter, printSalarySlip } from "@/lib/employees/documents";
import { getEmployeeStatusLabel } from "@/lib/employees/status";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import type { Employee, IncomeEntry } from "@/types/database";
import { cnStatusColor, formatCurrency, formatDate } from "@/lib/utils/format";

type PayrollSummary = {
  period_month: number;
  period_year: number;
  base_salary: number;
  bonuses: number;
  commissions: number;
  loan_recovery: number;
  savings_contribution: number;
  deductions: number;
  final_salary: number;
  status: string;
  paid_at: string | null;
};

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(2024, i, 1)),
}));

export function EmployeeProfile({
  employee,
  companyName,
  incomeEntries,
  payrolls,
}: {
  employee: Employee;
  companyName: string;
  incomeEntries: IncomeEntry[];
  payrolls: PayrollSummary[];
}) {
  const now = new Date();
  const [slipMonth, setSlipMonth] = useState(String(now.getMonth() + 1));
  const [slipYear, setSlipYear] = useState(String(now.getFullYear()));

  const slipYears = useMemo(() => {
    const years = new Set(incomeEntries.map((e) => new Date(e.payment_received_date).getFullYear()));
    years.add(now.getFullYear());
    payrolls.forEach((p) => years.add(p.period_year));
    years.add(new Date(employee.joining_date).getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [incomeEntries, payrolls, employee.joining_date, now]);

  const monthIncome = useMemo(
    () =>
      incomeEntries.filter((e) => {
        const d = new Date(e.payment_received_date);
        return d.getMonth() + 1 === Number(slipMonth) && d.getFullYear() === Number(slipYear);
      }),
    [incomeEntries, slipMonth, slipYear]
  );

  const payrollForPeriod = useMemo(
    () =>
      payrolls.find(
        (p) => p.period_month === Number(slipMonth) && p.period_year === Number(slipYear)
      ),
    [payrolls, slipMonth, slipYear]
  );

  function handleExperienceLetter() {
    printExperienceLetter({
      companyName,
      employeeName: employee.full_name,
      employeeCode: employee.employee_code,
      designation: employee.designation,
      department: employee.department,
      joiningDate: employee.joining_date,
      status: employee.status,
      totalEarnings: Number(employee.total_freelancer_share_received),
    });
  }

  function handleSalarySlip() {
    const projectEarnings = monthIncome.reduce((s, e) => s + Number(e.freelancer_share), 0);
    const savingsFromIncome = monthIncome.reduce((s, e) => s + Number(e.savings_contribution), 0);
    const loanFromIncome = monthIncome.reduce((s, e) => s + Number(e.loan_payment), 0);
    const netFromIncome = monthIncome.reduce((s, e) => s + Number(e.net_payout), 0);

    if (payrollForPeriod) {
      printSalarySlip({
        companyName,
        employeeName: employee.full_name,
        employeeCode: employee.employee_code,
        designation: employee.designation,
        department: employee.department,
        email: employee.email,
        periodMonth: Number(slipMonth),
        periodYear: Number(slipYear),
        baseSalary: payrollForPeriod.base_salary,
        projectEarnings,
        bonuses: payrollForPeriod.bonuses,
        commissions: payrollForPeriod.commissions,
        loanRecovery: payrollForPeriod.loan_recovery,
        savingsContribution: payrollForPeriod.savings_contribution,
        otherDeductions: payrollForPeriod.deductions,
        netPay: payrollForPeriod.final_salary,
        paidAt: payrollForPeriod.paid_at,
      });
      return;
    }

    printSalarySlip({
      companyName,
      employeeName: employee.full_name,
      employeeCode: employee.employee_code,
      designation: employee.designation,
      department: employee.department,
      email: employee.email,
      periodMonth: Number(slipMonth),
      periodYear: Number(slipYear),
      baseSalary: employee.base_salary,
      projectEarnings,
      bonuses: 0,
      commissions: 0,
      loanRecovery: loanFromIncome,
      savingsContribution: savingsFromIncome,
      otherDeductions: 0,
      netPay: employee.base_salary + netFromIncome,
    });
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2" render={<Link href="/employees" />}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Employees
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{employee.full_name}</h1>
            <Badge variant="secondary" className={cnStatusColor(employee.status)}>
              {getEmployeeStatusLabel(employee.status)}
            </Badge>
          </div>
          <p className="mt-1 font-mono text-sm text-muted-foreground">{employee.employee_code}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {employee.designation ?? "—"}
            {employee.department ? ` · ${employee.department}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExperienceLetter}>
            <FileText className="h-4 w-4 mr-2" />
            Print Experience Letter
          </Button>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
            <Select value={slipMonth} onValueChange={(v) => v && setSlipMonth(v)}>
              <SelectTrigger className="w-[130px] h-9">
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
            <Select value={slipYear} onValueChange={(v) => v && setSlipYear(v)}>
              <SelectTrigger className="w-[90px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {slipYears.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSalarySlip}>
              <Receipt className="h-4 w-4 mr-2" />
              Print Salary Slip
            </Button>
          </div>
          <EditEmployeeDialog employee={employee} />
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ProfileStat
          icon={Calendar}
          label="Joined"
          value={formatDate(employee.joining_date)}
        />
        <ProfileStat
          icon={Wallet}
          label="Total Earned"
          value={formatCurrency(Number(employee.total_freelancer_share_received))}
          hint="Freelancer share (70%)"
        />
        <ProfileStat
          icon={Briefcase}
          label="Project Value"
          value={formatCurrency(Number(employee.total_lifetime_earnings))}
          hint="Lifetime project income"
        />
        <ProfileStat
          icon={Printer}
          label="Net Available"
          value={formatCurrency(Number(employee.net_available_balance))}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Contact and employment details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DetailRow icon={Mail} label="Email" value={employee.email} />
            <DetailRow icon={Phone} label="Phone" value={employee.phone ?? "—"} />
            <DetailRow icon={Briefcase} label="Role" value={ROLE_LABELS[employee.role]} />
            <DetailRow
              icon={Wallet}
              label="Base Salary"
              value={formatCurrency(Number(employee.base_salary))}
            />
            <DetailRow
              icon={Calendar}
              label="Member Since"
              value={formatDate(employee.created_at)}
            />
            <div className="pt-2 border-t space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Financial Summary
              </p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Savings</span>
                <span>{formatCurrency(Number(employee.total_savings))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Loan Balance</span>
                <span>{formatCurrency(Number(employee.current_loan_balance))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Commissions</span>
                <span>
                  {formatCurrency(
                    Number(employee.lead_commission_wallet + employee.co_lead_commission_wallet)
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Earnings History</CardTitle>
            <CardDescription>
              {incomeEntries.length
                ? `${incomeEntries.length} project income record${incomeEntries.length === 1 ? "" : "s"}`
                : "No project income recorded yet"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {incomeEntries.length ? (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Client / Project</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Share (70%)</TableHead>
                      <TableHead>Net Payout</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incomeEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{formatDate(entry.payment_received_date)}</TableCell>
                        <TableCell>
                          <div className="font-medium">{entry.client_name}</div>
                          <div className="text-xs text-muted-foreground">{entry.project_name}</div>
                        </TableCell>
                        <TableCell>{formatCurrency(Number(entry.project_value))}</TableCell>
                        <TableCell>{formatCurrency(Number(entry.freelancer_share))}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(Number(entry.net_payout))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Earnings will appear here once income entries are added on the Earnings page.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProfileStat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold mt-1">{value}</p>
            {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
          </div>
          <div className="rounded-md bg-primary/10 p-2">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium break-all">{value}</p>
      </div>
    </div>
  );
}
